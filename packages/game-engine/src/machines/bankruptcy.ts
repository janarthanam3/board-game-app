// Raise-cash and bankruptcy machines — docs/06-state-machines.md "Raise cash" and "Bankruptcy",
// docs/flows/raise-cash.md and docs/flows/bankruptcy.md.
//
// Raise cash is the child: it runs on the debtor's device while `1d` is open. Its `bankrupt`
// outcome is the event that opens the parent bankruptcy machine, which the server runs as one
// atomic transition in the normative order below (state-machine skill rule 7: nested machines are
// explicit, and a child's completion is an event to its parent).

import type { PlayerId } from "../state";
import { assertNever, ignore, move, type Transition } from "./core";

// ─── Raise cash ─────────────────────────────────────────────────────────────────

export type RaiseCashRoute = "mortgage" | "sell" | "trade";

export type RaiseCashMachineState =
  | { kind: "open"; debtId: string; debt: number; cash: number; raised: number; route: RaiseCashRoute }
  | { kind: "paying"; debtId: string }
  | { kind: "exhausted"; debtId: string; shortBy: number }
  | { kind: "bankrupt"; debtId: string }
  | { kind: "settled"; debtId: string };

export type RaiseCashEvent =
  | { kind: "switchRoute"; route: RaiseCashRoute }
  | { kind: "assetToggled"; raised: number }
  | { kind: "pay" }
  /** The headroom check: the sum of every route's maximum (raise-cash.md "All routes"). */
  | { kind: "routesChecked"; allRoutesMax: number }
  | { kind: "declareBankruptcy" }
  | { kind: "paid" };

/** `1d` cannot be dismissed while the debt is open (raise-cash.md invariant 1); Android back is a no-op. */
export const RAISE_CASH_BLOCKING_KINDS: readonly RaiseCashMachineState["kind"][] = ["open", "exhausted", "paying"];

export function isRaiseCashBlocking(state: RaiseCashMachineState): boolean {
  return RAISE_CASH_BLOCKING_KINDS.includes(state.kind);
}

export function transitionRaiseCash(state: RaiseCashMachineState, event: RaiseCashEvent): Transition<RaiseCashMachineState> {
  switch (event.kind) {
    case "switchRoute":
      if (state.kind !== "open") return ignore(state, event);
      return move({ ...state, route: event.route });

    case "assetToggled":
      if (state.kind !== "open") return ignore(state, event);
      return move({ ...state, raised: event.raised });

    case "pay": {
      if (state.kind !== "open") return ignore(state, event);
      // Guard `open → paying`: PAY is enabled only when cash + raised ≥ debt.
      const shortBy = state.debt - (state.cash + state.raised);
      if (shortBy > 0) return ignore(state, event, `still ${shortBy} short`);
      return move({ kind: "paying", debtId: state.debtId });
    }

    case "routesChecked": {
      if (state.kind !== "open") return ignore(state, event);
      const shortBy = state.debt - (state.cash + event.allRoutesMax);
      if (shortBy <= 0) return move(state);
      return move({ kind: "exhausted", debtId: state.debtId, shortBy });
    }

    case "declareBankruptcy":
      if (state.kind !== "open" && state.kind !== "exhausted") return ignore(state, event);
      return move({ kind: "bankrupt", debtId: state.debtId });

    case "paid":
      if (state.kind !== "paying") return ignore(state, event);
      return move({ kind: "settled", debtId: state.debtId });

    default:
      return assertNever(event);
  }
}

// ─── Bankruptcy ─────────────────────────────────────────────────────────────────

/** The normative order from docs/flows/bankruptcy.md "Resolution order (authoritative)". */
export const BANKRUPTCY_RESOLUTION_ORDER = ["buildings", "cash", "deeds", "cards", "elimination"] as const;

interface Estate {
  debtorId: PlayerId;
  creditorId: PlayerId | "bank";
}

export type BankruptcyMachineState =
  | ({ kind: "selling" } & Estate)
  | ({ kind: "toCreditor" } & Estate)
  | ({ kind: "toBank" } & Estate)
  | ({ kind: "queueing" } & Estate)
  | ({ kind: "eliminating" } & Estate)
  | ({ kind: "checkPlayers"; solventRemaining: number } & Estate)
  | ({ kind: "matchEnding" } & Estate)
  | ({ kind: "resolved" } & Estate);

export type BankruptcyEvent =
  | { kind: "buildingsSold" }
  /** Player creditor: cash, deeds with mortgages intact, tradeable cards — one atomic step. */
  | { kind: "assetsTransferred" }
  /** Bank creditor: deeds queued as auction lots opening next round. */
  | { kind: "deedsQueued" }
  | { kind: "cardsDiscarded" }
  | { kind: "eliminated"; solventRemaining: number }
  | { kind: "checked" }
  /** The `3r` countdown finished; the match is ended. */
  | { kind: "countdownDone" };

/** Elimination is final and the match-ending takeover cannot be backed out of. */
export const BANKRUPTCY_BLOCKING_KINDS: readonly BankruptcyMachineState["kind"][] = ["eliminating", "matchEnding"];

export function isBankruptcyBlocking(state: BankruptcyMachineState): boolean {
  return BANKRUPTCY_BLOCKING_KINDS.includes(state.kind);
}

export function transitionBankruptcy(state: BankruptcyMachineState, event: BankruptcyEvent): Transition<BankruptcyMachineState> {
  const estate: Estate = { debtorId: state.debtorId, creditorId: state.creditorId };
  switch (event.kind) {
    case "buildingsSold":
      if (state.kind !== "selling") return ignore(state, event);
      return move(state.creditorId === "bank" ? { kind: "toBank", ...estate } : { kind: "toCreditor", ...estate });

    case "assetsTransferred":
      if (state.kind !== "toCreditor") return ignore(state, event);
      return move({ kind: "eliminating", ...estate });

    case "deedsQueued":
      if (state.kind !== "toBank") return ignore(state, event);
      return move({ kind: "queueing", ...estate });

    case "cardsDiscarded":
      if (state.kind !== "queueing") return ignore(state, event);
      return move({ kind: "eliminating", ...estate });

    case "eliminated":
      if (state.kind !== "eliminating") return ignore(state, event);
      return move({ kind: "checkPlayers", ...estate, solventRemaining: event.solventRemaining });

    case "checked":
      if (state.kind !== "checkPlayers") return ignore(state, event);
      return move(state.solventRemaining >= 2 ? { kind: "resolved", ...estate } : { kind: "matchEnding", ...estate });

    case "countdownDone":
      if (state.kind !== "matchEnding") return ignore(state, event);
      return move({ kind: "resolved", ...estate });

    default:
      return assertNever(event);
  }
}
