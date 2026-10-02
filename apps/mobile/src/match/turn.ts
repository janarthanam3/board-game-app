// The client turn loop (task E3): docs/flows/turn.md, docs/06-state-machines.md "Turn", and
// docs/07-api-contract.md §Socket.IO "Ordering and reconciliation".
//
// What this is, and what it is not. The turn machine lives in the engine — `transitionTurn` and the
// reducer — and this module never reimplements it (state-machine skill rule 3: "React holds no flow
// state"). What belongs here is the three things only a client has:
//
//   1. an intent from the HUD becomes the engine action or actions that carry it out;
//   2. a prediction is rendered ahead of the authority's answer, and dropped the moment it speaks
//      (socket-contract: "The client's optimistic apply is a rendering shortcut … a server snapshot
//      wins wholesale, with no reconciliation logic and no field-level merge");
//   3. a refusal rolls that prediction back and surfaces the error-catalog code.
//
// It is pure: a value and functions over it, with no socket, no React and no clock. The transport is
// the caller's, which is what lets pass-and-play and solo run the identical loop over a local engine
// with no connection at all (offline-local-mode rule 1).

import {
  type Action,
  apply,
  __debug,
  type MatchEvent,
  type MatchState,
  type PlayerId,
  validate,
} from "@royal-navy/game-engine";

import { isOwnable } from "@royal-navy/game-engine";
import type { PrimaryIntent } from "../screens/match/hudModel";

/** What the authority last confirmed. `seq` is the contract's monotonic per-match counter. */
export interface Confirmed {
  state: MatchState;
  seq: number;
}

export interface InFlight {
  action: Action;
  /** The seq the action was sent at, which is what the server matches a redelivery against. */
  seq: number;
}

/** A refusal, carrying what the toast needs: docs/13's code and its copy. */
export interface Refusal {
  code: string;
  message: string;
}

export interface TurnLoop {
  confirmed: Confirmed;
  /**
   * A local prediction, rendered instead of `confirmed.state` while it exists. Null whenever there
   * is nothing to predict — including every random action, which is never predicted.
   */
  predicted: MatchState | null;
  inFlight: InFlight | null;
  /**
   * True while a random action is in flight. docs/07 §Ordering 3: "Random actions are never applied
   * optimistically; the client renders the animation and waits." The HUD reads this to lock the
   * board and show `OK` disabled (`1c` §5).
   */
  awaitingRandom: boolean;
  refusal: Refusal | null;
}

/** docs/13 gives `E_STALE_SEQ` no copy — "(silent)" — because the snapshot does the work. */
const SILENT_CODES = ["E_STALE_SEQ"] as const;

/**
 * The refusal the loop raises itself, when the engine says an action is illegal before it is sent.
 * docs/13: `E_ACTION_ILLEGAL` is "You can't do that right now." with `details.reason` naming the guard.
 */
const LOCAL_REFUSAL_CODE = "E_ACTION_ILLEGAL";

export function startLoop(state: MatchState, seq: number): TurnLoop {
  return { confirmed: { state, seq }, predicted: null, inFlight: null, awaitingRandom: false, refusal: null };
}

/** What the screen renders: the prediction while there is one, else what the authority confirmed. */
export function visibleState(loop: TurnLoop): MatchState {
  return loop.predicted ?? loop.confirmed.state;
}

// ─── Intents become actions (docs/flows/turn.md steps 1–7) ───────────────────────

/**
 * The HUD reports an intent (`1c` §4); this turns it into what the engine understands.
 *
 * `rollAgain` is two actions because the engine grants the extra roll when a turn that rolled a
 * double *ends*: `END_TURN` returns the same player to `preRoll` (docs/06's `postRoll → preRoll`
 * guard), and the `ROLL` that follows is the extra roll. One press, two actions, in that order.
 */
export function actionsForIntent(
  intent: PrimaryIntent,
  state: MatchState,
  viewerId: PlayerId | null,
  atMs: number,
): Action[] {
  if (viewerId === null) {
    return [];
  }
  const by = viewerId;
  switch (intent) {
    case "roll":
      return [{ kind: "ROLL", by, atMs }];
    case "rollAgain":
      return [
        { kind: "END_TURN", by, atMs },
        { kind: "ROLL", by, atMs },
      ];
    case "endTurn":
      return [{ kind: "END_TURN", by, atMs }];
    case "buy": {
      const tileIndex = state.players[by]?.position;
      return tileIndex === undefined || !ownable(state, tileIndex) ? [] : [{ kind: "BUY", by, tileIndex, atMs }];
    }
    case "auction": {
      // Declining is what opens the lot (docs/06's `decision → auction` on PASS with auctions on).
      const tileIndex = state.players[by]?.position;
      return tileIndex === undefined || !ownable(state, tileIndex) ? [] : [{ kind: "PASS_BUY", by, tileIndex, atMs }];
    }
    case "pay": {
      // Debts settle oldest first (the raise-cash flow: "one 1d session per debt").
      const debt = state.debts.find((candidate) => candidate.debtorId === by);
      return debt === undefined ? [] : [{ kind: "PAY_DEBT", by, debtId: debt.id, atMs }];
    }
    case "none":
      return [];
  }
}

function ownable(state: MatchState, tileIndex: number): boolean {
  const tile = state.board.tiles[tileIndex];
  return tile !== undefined && isOwnable(tile);
}

// ─── Prediction ──────────────────────────────────────────────────────────────────

/**
 * docs/07 §Ordering 3: "Random actions are never applied optimistically; the client renders the
 * animation and waits." A roll draws from the seeded RNG, and a client that predicted one would be
 * guessing the dice — so both roll kinds are excluded. `CHOOSE_DICE` names its own total but still
 * advances the RNG cursor, so predicting it would diverge the seed by one draw.
 */
export function isPredictable(action: Action): boolean {
  return action.kind !== "ROLL" && action.kind !== "CHOOSE_DICE";
}

export interface Sent {
  loop: TurnLoop;
  /** What to put on the wire, or null when there is nothing to send. */
  send: { action: Action; seq: number } | null;
}

/**
 * Starts an action: predicts it where that is allowed, and says what to send.
 *
 * The engine validates first, so an action the rules forbid never reaches the wire and never reaches
 * the screen — the loop refuses it locally with the same code the server would have used.
 */
export function beginAction(loop: TurnLoop, action: Action): Sent {
  const base = loop.confirmed.state;
  const verdict = validate(base, action);
  if (!verdict.ok) {
    return {
      loop: { ...loop, predicted: null, inFlight: null, awaitingRandom: false, refusal: localRefusal(verdict.code, verdict.reason) },
      send: null,
    };
  }

  const inFlight: InFlight = { action, seq: loop.confirmed.seq };
  if (!isPredictable(action)) {
    return {
      loop: { ...loop, predicted: null, inFlight, awaitingRandom: true, refusal: null },
      send: { action, seq: loop.confirmed.seq },
    };
  }
  return {
    loop: { ...loop, predicted: apply(base, action).state, inFlight, awaitingRandom: false, refusal: null },
    send: { action, seq: loop.confirmed.seq },
  };
}

/**
 * `E_ACTION_ILLEGAL` is what docs/13 shows the player for every engine refusal, including the two
 * internal codes; the engine's own code and reason go to the log, not to the toast.
 */
function localRefusal(code: string, reason: string): Refusal {
  return { code: LOCAL_REFUSAL_CODE, message: `${code}: ${reason}` };
}

// ─── The authority answers ───────────────────────────────────────────────────────

export type ActionAck = { ok: true; seq: number } | { ok: false; code: string };

export interface Acked {
  loop: TurnLoop;
  /** True when the loop needs a `match:sync` to recover. */
  needsSync: boolean;
}

/**
 * The ack to `match:action`. An acceptance changes nothing visible: the prediction stands until
 * `match:applied` replaces it, which is the event that carries the authority's own state.
 */
export function confirmAck(loop: TurnLoop, ack: ActionAck): Acked {
  if (ack.ok) {
    return { loop, needsSync: false };
  }
  // E_STALE_SEQ is silent: the server has already pushed `match:state` beside it (docs/13, docs/07).
  const silent = (SILENT_CODES as readonly string[]).includes(ack.code);
  return {
    loop: {
      ...loop,
      predicted: null,
      inFlight: null,
      awaitingRandom: false,
      refusal: silent ? null : { code: ack.code, message: "" },
    },
    needsSync: false,
  };
}

/** A refusal that arrived as an `error` event rather than an ack: same rollback, with its copy. */
export function refuse(loop: TurnLoop, code: string, message: string): TurnLoop {
  const silent = (SILENT_CODES as readonly string[]).includes(code);
  return {
    ...loop,
    predicted: null,
    inFlight: null,
    awaitingRandom: false,
    refusal: silent ? null : { code, message },
  };
}

export interface Applied {
  loop: TurnLoop;
  needsSync: boolean;
  /** What the reducer emitted, for `1n`'s cards (E4). Never used to compute state. */
  events: MatchEvent[];
}

/**
 * `match:applied`: the client re-derives by running the authority's action through its own engine
 * build, then compares the hash (OQ-45, answered 28 September 2026).
 *
 * Three things ask for a sync instead, and all three are the same judgement — never hold a state
 * nobody vouches for: a seq that is not the next one, an action this state cannot apply, and a hash
 * that disagrees once it has.
 */
export function applyApplied(
  loop: TurnLoop,
  payload: { seq: number; action: Action; events: MatchEvent[]; stateHash: string },
): Applied {
  if (payload.seq !== loop.confirmed.seq + 1) {
    return { loop, needsSync: true, events: [] };
  }

  let next: { state: MatchState; events: MatchEvent[] };
  try {
    next = apply(loop.confirmed.state, payload.action);
  } catch {
    // The engine refuses the authority's own action: the client's state is not the one it was
    // applied to, so there is nothing to do but ask for the truth.
    return { loop, needsSync: true, events: [] };
  }

  if (__debug.hash(next.state) !== payload.stateHash) {
    return { loop, needsSync: true, events: [] };
  }

  return {
    loop: {
      confirmed: { state: next.state, seq: payload.seq },
      predicted: null,
      inFlight: null,
      awaitingRandom: false,
      refusal: loop.refusal,
    },
    needsSync: false,
    events: payload.events,
  };
}

/**
 * `match:state`: the snapshot wins wholesale. Every prediction and every queued input is discarded
 * (socket-contract: "Queued local input is discarded on resync"), and two in a row leave the same
 * state, which is what makes resync idempotent.
 *
 * The hash is checked first. A snapshot whose own hash does not describe it is not a snapshot worth
 * taking, and the loop keeps what it had rather than trusting it.
 */
export function replaceState(loop: TurnLoop, payload: { seq: number; state: MatchState; stateHash: string }): TurnLoop {
  if (__debug.hash(payload.state) !== payload.stateHash) {
    return { ...loop, refusal: { code: "E_STALE_SEQ", message: "" } };
  }
  return {
    confirmed: { state: payload.state, seq: payload.seq },
    predicted: null,
    inFlight: null,
    awaitingRandom: false,
    refusal: null,
  };
}
