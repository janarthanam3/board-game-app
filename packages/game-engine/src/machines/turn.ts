// Turn machine — docs/06-state-machines.md "Turn" and docs/flows/turn.md, transcribed state for
// state and arrow for arrow. The reducer (src/reducer/turn.ts) is what actually moves tokens and
// money; this machine is the flow model both the reducer's `turn.stage` and the client's screens
// read from, so neither side can invent a stage or a transition the design does not have.
//
// Guards from the doc's table travel as event fields (`debtOpen`, `cash`, `boardHasJail`…) so the
// function stays pure over plain data — the caller supplies the facts, the machine supplies the
// answer.

import type { PlayerId, TileIndex } from "../state";
import { assertNever, ignore, move, type Transition } from "./core";

export type TurnMachineState =
  | { kind: "turnStart" }
  | { kind: "jailChoice" }
  | { kind: "preRoll" }
  | { kind: "rolling" }
  | { kind: "moving"; from: TileIndex; to: TileIndex }
  | { kind: "landing"; tileIndex: TileIndex }
  | { kind: "decision"; tileIndex: TileIndex }
  | { kind: "payment"; amount: number; creditorId: PlayerId | "bank" }
  | { kind: "cardDraw" }
  | { kind: "cornerEffect" }
  | { kind: "auction"; tileIndex: TileIndex }
  | { kind: "raiseCash"; debtId: string }
  | { kind: "postRoll"; dice: [number, number] | null; doublesThisTurn: number }
  | { kind: "jail" }
  | { kind: "bankrupt" }
  | { kind: "turnEnd" };

/** The names of the machine's states; `TurnStage` in state.ts is derived from this union. */
export type TurnStageKind = TurnMachineState["kind"];

export type SideActionKind = "BUILD" | "SELL" | "MORTGAGE" | "REDEEM" | "TRADE";

/** What the landing tile turned out to be (docs/06 `landing → …`). */
export type LandingOutcome =
  | { kind: "unowned" }
  | { kind: "rentDue"; amount: number; creditorId: PlayerId | "bank" }
  | { kind: "card" }
  | { kind: "corner" }
  | { kind: "nothing" };

export type TurnEvent =
  | { kind: "turnOpened"; inJail: boolean }
  | { kind: "jailReleased"; how: "bail" | "double" | "passCard" | "roundsServed" }
  | { kind: "jailStays" }
  | { kind: "roll"; debtOpen: boolean }
  | { kind: "sideAction"; action: SideActionKind; debtOpen: boolean; valid: boolean }
  | { kind: "diceResolved"; from: TileIndex; to: TileIndex }
  | { kind: "tokenArrived" }
  | { kind: "landingResolved"; outcome: LandingOutcome }
  | { kind: "buy" }
  | { kind: "pass"; auctionsOn: boolean }
  | { kind: "paymentAttempted"; cash: number; debtId: string }
  | { kind: "effectApplied" }
  | { kind: "cornerResolved"; sentToJail: boolean }
  | { kind: "auctionResolved" }
  | { kind: "debtSettled"; cash: number; debt: number }
  | { kind: "declareBankruptcy" }
  | {
      kind: "rollResolved";
      dice: [number, number];
      doublesThisTurn: number;
      /** true when the roll came from CHOOSE_DICE — a chosen double never re-rolls. */
      chosen: boolean;
      boardHasJail: boolean;
    }
  | { kind: "jailed" }
  | { kind: "eliminated" }
  | { kind: "turnTimerExpired" };

/** Android back cannot leave these (state-machine skill rule 8; docs/flows/raise-cash.md inv. 1). */
export const TURN_BLOCKING_KINDS: readonly TurnStageKind[] = ["raiseCash", "bankrupt"];

export function isTurnBlocking(state: TurnMachineState): boolean {
  return TURN_BLOCKING_KINDS.includes(state.kind);
}

/** The server's default actions on turn-clock expiry (docs/flows/turn.md "Turn-timer expiry"). */
export type TurnTimerDefault =
  | "rollAndResolve"
  | "rollForDoubles"
  | "declinePurchase"
  | "rejectTrades"
  | "leaveDebtStanding"
  | "endTurn";

/**
 * The documented defaults, in order, for the state the clock expired in. An empty list means the
 * state holds no clock: server-side transitions have none, and the turn clock is paused while an
 * auction is live (docs/06 "Auction").
 */
export function turnTimerDefaults(state: TurnMachineState): TurnTimerDefault[] {
  switch (state.kind) {
    case "preRoll":
      return ["rollAndResolve", "declinePurchase", "rejectTrades", "leaveDebtStanding", "endTurn"];
    case "jailChoice":
      // "roll for doubles; no bail is paid", then the roll resolves like any other.
      return ["rollForDoubles", "declinePurchase", "rejectTrades", "leaveDebtStanding", "endTurn"];
    case "decision":
      return ["declinePurchase", "rejectTrades", "endTurn"];
    case "raiseCash":
      return ["rejectTrades", "leaveDebtStanding", "endTurn"];
    case "postRoll":
      return ["rejectTrades", "endTurn"];
    case "auction":
    case "turnStart":
    case "rolling":
    case "moving":
    case "landing":
    case "payment":
    case "cardDraw":
    case "cornerEffect":
    case "jail":
    case "bankrupt":
    case "turnEnd":
      return [];
    default:
      return assertNever(state);
  }
}

const freshPostRoll: TurnMachineState = { kind: "postRoll", dice: null, doublesThisTurn: 0 };

export function transitionTurn(state: TurnMachineState, event: TurnEvent): Transition<TurnMachineState> {
  switch (event.kind) {
    case "turnOpened":
      if (state.kind !== "turnStart") return ignore(state, event);
      return move(event.inJail ? { kind: "jailChoice" } : { kind: "preRoll" });

    case "jailReleased":
      if (state.kind !== "jailChoice") return ignore(state, event);
      return move({ kind: "preRoll" });

    case "jailStays":
      if (state.kind !== "jailChoice") return ignore(state, event);
      return move({ kind: "turnEnd" });

    case "roll":
      if (state.kind !== "preRoll") return ignore(state, event);
      if (event.debtOpen) return ignore(state, event, "unresolved debt");
      return move({ kind: "rolling" });

    case "sideAction":
      if (state.kind !== "preRoll") return ignore(state, event);
      if (event.debtOpen) return ignore(state, event, "unresolved debt");
      if (!event.valid) return ignore(state, event, `${event.action} failed its own validation`);
      return move({ kind: "preRoll" });

    case "diceResolved":
      if (state.kind !== "rolling") return ignore(state, event);
      return move({ kind: "moving", from: event.from, to: event.to });

    case "tokenArrived":
      if (state.kind !== "moving") return ignore(state, event);
      return move({ kind: "landing", tileIndex: state.to });

    case "landingResolved": {
      if (state.kind !== "landing") return ignore(state, event);
      const outcome = event.outcome;
      switch (outcome.kind) {
        case "unowned":
          return move({ kind: "decision", tileIndex: state.tileIndex });
        case "rentDue":
          return move({ kind: "payment", amount: outcome.amount, creditorId: outcome.creditorId });
        case "card":
          return move({ kind: "cardDraw" });
        case "corner":
          return move({ kind: "cornerEffect" });
        case "nothing":
          return move(freshPostRoll);
        default:
          return assertNever(outcome);
      }
    }

    case "buy":
      if (state.kind !== "decision") return ignore(state, event);
      return move(freshPostRoll);

    case "pass":
      if (state.kind !== "decision") return ignore(state, event);
      return move(event.auctionsOn ? { kind: "auction", tileIndex: state.tileIndex } : freshPostRoll);

    case "paymentAttempted":
      if (state.kind !== "payment") return ignore(state, event);
      // Guard `payment → raiseCash`: amount > cash.
      return move(state.amount > event.cash ? { kind: "raiseCash", debtId: event.debtId } : freshPostRoll);

    case "effectApplied":
      if (state.kind !== "cardDraw") return ignore(state, event);
      return move(freshPostRoll);

    case "cornerResolved":
      if (state.kind !== "cornerEffect") return ignore(state, event);
      return move(event.sentToJail ? { kind: "jail" } : freshPostRoll);

    case "auctionResolved":
      if (state.kind !== "auction") return ignore(state, event);
      return move(freshPostRoll);

    case "debtSettled":
      if (state.kind !== "raiseCash") return ignore(state, event);
      // Guard `raiseCash → postRoll`: cash ≥ debt after the payment.
      if (event.cash < event.debt) return ignore(state, event, "cash is still below the debt");
      return move(freshPostRoll);

    case "declareBankruptcy":
      if (state.kind !== "raiseCash") return ignore(state, event);
      return move({ kind: "bankrupt" });

    case "rollResolved": {
      if (state.kind !== "postRoll") return ignore(state, event);
      const isDouble = event.dice[0] === event.dice[1];
      if (isDouble && !event.chosen && event.doublesThisTurn < 3) {
        return move({ kind: "preRoll" });
      }
      if (isDouble && !event.chosen && event.doublesThisTurn >= 3 && event.boardHasJail) {
        return move({ kind: "jail" });
      }
      return move({ kind: "turnEnd" });
    }

    case "jailed":
      if (state.kind !== "jail") return ignore(state, event);
      return move({ kind: "turnEnd" });

    case "eliminated":
      if (state.kind !== "bankrupt") return ignore(state, event);
      return move({ kind: "turnEnd" });

    case "turnTimerExpired":
      if (state.kind === "auction") return ignore(state, event, "turn clock paused while an auction is live");
      if (turnTimerDefaults(state).length === 0) return ignore(state, event, "no clock in a server-side transition");
      // The defaults have been applied by the server; whatever they did, the turn ends.
      return move({ kind: "turnEnd" });

    default:
      return assertNever(event);
  }
}
