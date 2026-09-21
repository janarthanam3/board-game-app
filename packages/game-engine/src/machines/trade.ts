// Trade machine — docs/06-state-machines.md "Trade" and docs/flows/trade.md. The "counter" branch
// in the flow's sequence diagram is a reject followed by a fresh `composing` with the sides swapped
// (the client preloads the terms); it is not a state of its own, and docs/06 has no arrow for it.

import type { PlayerId } from "../state";
import { assertNever, ignore, move, type Transition } from "./core";

/** Board trade expiry (rulebook §11, docs/flows/trade.md: `board.tradeExpiry` = 60 s). */
export const TRADE_EXPIRY_MS = 60_000;

interface PendingOffer {
  offerId: string;
  from: PlayerId;
  to: PlayerId;
  expiresAtMs: number;
}

export type TradeMachineState =
  | { kind: "composing"; from: PlayerId; to: PlayerId | null }
  | ({ kind: "offered" } & PendingOffer)
  | ({ kind: "queued" } & PendingOffer)
  | ({ kind: "reviewing" } & PendingOffer)
  | { kind: "accepted"; offerId: string }
  | { kind: "rejected"; offerId: string }
  | { kind: "expired"; offerId: string }
  | { kind: "closed" };

export type TradeEvent =
  | { kind: "send"; offerId: string; validBothSides: boolean; atMs: number }
  | { kind: "cancel" }
  | { kind: "targetOpened"; inAnotherModal: boolean }
  | { kind: "pendingOpened" }
  | { kind: "accept"; validBothSides: boolean }
  | { kind: "reject" }
  | { kind: "clockTick"; atMs: number }
  | { kind: "finalised" };

/** No trade state blocks Android back: the DEAL OFFER card and the composer can always be left. */
export const TRADE_BLOCKING_KINDS: readonly TradeMachineState["kind"][] = [];

export function isTradeBlocking(state: TradeMachineState): boolean {
  return TRADE_BLOCKING_KINDS.includes(state.kind);
}

export function transitionTrade(state: TradeMachineState, event: TradeEvent): Transition<TradeMachineState> {
  switch (event.kind) {
    case "send":
      if (state.kind !== "composing") return ignore(state, event);
      if (state.to === null) return ignore(state, event, "no partner picked");
      if (!event.validBothSides) return ignore(state, event, "E_TRADE_INVALID");
      return move({ kind: "offered", offerId: event.offerId, from: state.from, to: state.to, expiresAtMs: event.atMs + TRADE_EXPIRY_MS });

    case "cancel":
      if (state.kind !== "composing") return ignore(state, event);
      return move({ kind: "closed" });

    case "targetOpened":
      if (state.kind !== "offered") return ignore(state, event);
      return move({ ...state, kind: event.inAnotherModal ? "queued" : "reviewing" });

    case "pendingOpened":
      if (state.kind !== "queued") return ignore(state, event);
      return move({ ...state, kind: "reviewing" });

    case "accept":
      if (state.kind !== "reviewing") return ignore(state, event);
      // Revalidation at accept time is mandatory — the board may have changed since the offer.
      if (!event.validBothSides) return ignore(state, event, "E_TRADE_INVALID");
      return move({ kind: "accepted", offerId: state.offerId });

    case "reject":
      if (state.kind !== "reviewing") return ignore(state, event);
      return move({ kind: "rejected", offerId: state.offerId });

    case "clockTick":
      if (state.kind !== "offered" && state.kind !== "queued" && state.kind !== "reviewing") {
        return ignore(state, event, "no offer clock");
      }
      if (event.atMs < state.expiresAtMs) return ignore(state, event, "time remains");
      return move({ kind: "expired", offerId: state.offerId });

    case "finalised":
      if (state.kind !== "accepted" && state.kind !== "rejected" && state.kind !== "expired") return ignore(state, event);
      return move({ kind: "closed" });

    default:
      return assertNever(event);
  }
}
