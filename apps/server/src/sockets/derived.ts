// Engine events → the server → client events docs/07 §Socket.IO lists.
//
// The engine emits some sixty event kinds; docs/07 names sixteen outbound events plus `error`. This
// file is the whole mapping, in one place, so an event cannot be emitted from a handler that forgot
// who is allowed to see it.
//
// Not mapped here, because no engine event corresponds to them: the lobby's four events
// (`lobby:updated`, `lobby:closed`, `host:changed`, `players:insufficient`), which match.ts emits from
// the lifecycle itself; `match:ended`, whose MatchResult needs the board name and timings the engine
// does not hold; and **`board:versionChanged`**, which is a publish-time notice to a host sitting in
// `1b` setup and so belongs to F4's publish path — it has a schema and no emitter today, and OQ-3
// records that its toast has no designed frame either.
//
// Two rules from the socket-contract skill shape the return type:
//
// - **"Decisions are addressed."** A decision card goes only to the player who must decide, "never
//   broadcast with a 'for you' flag". So `trade:offered` is addressed to the player being offered the
//   deal and `debt:opened` to the debtor, and neither reaches anyone else.
// - **Ordering.** "The server emits the resulting snapshot before the derived event cards." The caller
//   emits `match:applied` first and then walks this list in order, so a card never describes a state the
//   client has not received.

import type { MatchEvent, MatchState } from "@royal-navy/game-engine";
import type { ServerEventName } from "@royal-navy/shared/events/match";

/** Who a payload goes to. `match` is the match room; `player` is one seat's sockets. */
export type Audience = { kind: "match" } | { kind: "player"; playerId: string };

export interface Outbound {
  event: ServerEventName;
  payload: unknown;
  audience: Audience;
  /**
   * False for a payload a spectator must not receive. Addressed payloads are never public by
   * definition; `auction:updated` and the rest are, because `1s`/`1t` show them to the table.
   */
  public: boolean;
}

const toMatch = { kind: "match" } as const;

/**
 * The outbound events one applied action produces, in emit order.
 *
 * `state` is the state **after** the action, because most payloads read from it: the auction's leading
 * bid, a trade's bundles, the turn's player. The events say what happened; the state says what it
 * happened to.
 */
export function derivedEvents(state: MatchState, events: readonly MatchEvent[], turnDeadlineMs: number | null): Outbound[] {
  const out: Outbound[] = [];

  for (const event of events) {
    switch (event.kind) {
      case "turnStarted":
        out.push({
          event: "turn:started",
          payload: { playerId: event.playerId, deadlineMs: turnDeadlineMs },
          audience: toMatch,
          public: true,
        });
        break;

      // Every change to a live lot is one `auction:updated` carrying the lot's whole public position,
      // which is what `1s`/`1t` render. A lot that has already resolved leaves `state.auction` null, so
      // the snapshot is skipped rather than sent as zeroes.
      case "auctionOpened":
      case "bidPlaced":
      case "bidderPassed":
        if (state.auction !== null) {
          out.push({
            event: "auction:updated",
            payload: {
              tileIndex: state.auction.tileIndex,
              leading: state.auction.leadingBidderId,
              // docs/07 calls it `leadingBy`; the auction holds the leading bid, and with no bidder yet
              // the lot's minimum is what a bidder must beat.
              leadingBy: state.auction.leadingBid,
              deadlineMs: state.auction.deadlineMs,
              passed: state.auction.passed,
            },
            audience: toMatch,
            public: true,
          });
        }
        break;

      case "auctionWon":
        out.push({
          event: "auction:resolved",
          payload: { tileIndex: event.tileIndex, winnerId: event.playerId, amount: event.amount },
          audience: toMatch,
          public: true,
        });
        break;

      case "auctionNoSale":
        out.push({
          event: "auction:resolved",
          payload: { tileIndex: event.tileIndex, winnerId: null, amount: 0 },
          audience: toMatch,
          public: true,
        });
        break;

      case "dealOffered": {
        // The bundles are not on the event; they are on the offer the action created.
        const offer = state.offers.find((candidate) => candidate.id === event.offerId);
        if (offer) {
          out.push({
            event: "trade:offered",
            payload: {
              offerId: offer.id,
              from: offer.from,
              give: offer.give,
              get: offer.get,
              expiresAtMs: offer.expiresAtMs,
            },
            // Addressed: only the player who must answer sees the offer.
            audience: { kind: "player", playerId: offer.to },
            public: false,
          });
        }
        break;
      }

      case "tradeDone":
        out.push({ event: "trade:resolved", payload: { offerId: event.offerId, accepted: true }, audience: toMatch, public: true });
        break;

      // `1n`'s trade-done card covers a rejection, an expiry and a cancellation alike: the deal is off.
      case "tradeRejected":
      case "tradeExpired":
      case "tradeCancelled":
        out.push({ event: "trade:resolved", payload: { offerId: event.offerId, accepted: false }, audience: toMatch, public: true });
        break;

      case "debtOpened":
        out.push({
          event: "debt:opened",
          payload: { debtId: event.debtId, amount: event.amount, creditorId: event.creditorId },
          // `1d` raise cash is the debtor's screen and nobody else's.
          audience: { kind: "player", playerId: event.debtorId },
          public: false,
        });
        break;

      case "bankrupt":
        out.push({
          event: "player:bankrupt",
          payload: { playerId: event.playerId, round: event.round, to: event.creditorId, tiles: event.tiles },
          audience: toMatch,
          public: true,
        });
        break;

      case "playerDisconnected":
        out.push({ event: "player:presence", payload: { playerId: event.playerId, connected: false }, audience: toMatch, public: true });
        break;

      case "playerReconnected":
        out.push({ event: "player:presence", payload: { playerId: event.playerId, connected: true }, audience: toMatch, public: true });
        break;

      // `match:ended` carries a MatchResult, which needs the board name and the timings the engine does
      // not hold. The caller builds and emits it; this file only maps what it can read from the state.
      default:
        break;
    }
  }

  return out;
}

/** True when the applied events end the match, so the caller knows to build and emit `match:ended`. */
export function endsMatch(events: readonly MatchEvent[]): Extract<MatchEvent, { kind: "matchEnded" }> | null {
  for (const event of events) {
    if (event.kind === "matchEnded") {
      return event;
    }
  }
  return null;
}
