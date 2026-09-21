// Auction machine — docs/06-state-machines.md "Auction" and docs/flows/auction.md. One machine
// per lot: the parent (the turn, or the bankruptcy queue) opens the next lot when this one closes,
// so lots resolve strictly in order (auction.md invariant 5).

import type { PlayerId, TileIndex } from "../state";
import { assertNever, ignore, move, type Transition } from "./core";

export type AuctionMachineState =
  | { kind: "opening"; tileIndex: TileIndex }
  | {
      kind: "bidding";
      tileIndex: TileIndex;
      minBid: number;
      leadingBid: number;
      leadingBidderId: PlayerId | null;
      bidders: PlayerId[];
      passed: PlayerId[];
      /** The board's bid timer; every accepted bid resets `clockMs` to it. */
      bidTimerMs: number;
      clockMs: number;
    }
  | { kind: "resolving"; tileIndex: TileIndex; winnerId: PlayerId; amount: number }
  | { kind: "noSale"; tileIndex: TileIndex }
  | { kind: "closed"; tileIndex: TileIndex; outcome: "sold" | "noSale" };

export type AuctionEvent =
  | { kind: "opened"; minBid: number; bidders: PlayerId[]; bidTimerMs: number }
  | { kind: "bid"; by: PlayerId; amount: number; cash: number; debtOpen: boolean }
  | { kind: "pass"; by: PlayerId }
  | { kind: "clockExpired" }
  | { kind: "winnerPaid" }
  | { kind: "bankKeeps" };

/** No auction state blocks Android back: `Skip` on the AUCTION LIVE card always stays out. */
export const AUCTION_BLOCKING_KINDS: readonly AuctionMachineState["kind"][] = [];

export function isAuctionBlocking(state: AuctionMachineState): boolean {
  return AUCTION_BLOCKING_KINDS.includes(state.kind);
}

/** bidding → resolving when the leader is the only bidder left; → noSale when nobody bid and all passed. */
function settle(state: Extract<AuctionMachineState, { kind: "bidding" }>): AuctionMachineState {
  const active = state.bidders.filter((id) => !state.passed.includes(id));
  if (state.leadingBidderId !== null && active.every((id) => id === state.leadingBidderId)) {
    return { kind: "resolving", tileIndex: state.tileIndex, winnerId: state.leadingBidderId, amount: state.leadingBid };
  }
  if (state.leadingBidderId === null && active.length === 0) {
    return { kind: "noSale", tileIndex: state.tileIndex };
  }
  return state;
}

export function transitionAuction(state: AuctionMachineState, event: AuctionEvent): Transition<AuctionMachineState> {
  switch (event.kind) {
    case "opened":
      if (state.kind !== "opening") return ignore(state, event);
      return move({
        kind: "bidding",
        tileIndex: state.tileIndex,
        minBid: event.minBid,
        leadingBid: 0,
        leadingBidderId: null,
        bidders: event.bidders,
        passed: [],
        bidTimerMs: event.bidTimerMs,
        clockMs: event.bidTimerMs,
      });

    case "bid": {
      if (state.kind !== "bidding") return ignore(state, event);
      if (!state.bidders.includes(event.by)) return ignore(state, event, `${event.by} is not a bidder`);
      if (state.passed.includes(event.by)) return ignore(state, event, "E_AUCTION_PASSED");
      if (event.debtOpen) return ignore(state, event, "E_DEBT_BLOCKING");
      const minimum = Math.max(state.minBid, state.leadingBid + 1);
      if (event.amount < minimum) return ignore(state, event, `E_BID_TOO_LOW: minimum ${minimum}`);
      if (event.amount > event.cash) return ignore(state, event, "E_BID_OVER_CASH");
      // Invariant 2: a bid always resets the clock to the board's full bid timer.
      return move({ ...state, leadingBid: event.amount, leadingBidderId: event.by, clockMs: state.bidTimerMs });
    }

    case "pass":
      if (state.kind !== "bidding") return ignore(state, event);
      if (!state.bidders.includes(event.by)) return ignore(state, event, `${event.by} is not a bidder`);
      if (state.passed.includes(event.by)) return ignore(state, event, "E_AUCTION_PASSED");
      return move(settle({ ...state, passed: [...state.passed, event.by] }));

    case "clockExpired":
      if (state.kind !== "bidding") return ignore(state, event, "no clock outside bidding");
      if (state.leadingBidderId === null) return move({ kind: "noSale", tileIndex: state.tileIndex });
      return move({ kind: "resolving", tileIndex: state.tileIndex, winnerId: state.leadingBidderId, amount: state.leadingBid });

    case "winnerPaid":
      if (state.kind !== "resolving") return ignore(state, event);
      return move({ kind: "closed", tileIndex: state.tileIndex, outcome: "sold" });

    case "bankKeeps":
      if (state.kind !== "noSale") return ignore(state, event);
      return move({ kind: "closed", tileIndex: state.tileIndex, outcome: "noSale" });

    default:
      return assertNever(event);
  }
}
