import type { Action } from "../../src/actions";
import { checkInvariants, checkTransitionInvariants } from "../../src/invariants";
import { createMatch, type MatchSetup } from "../../src/match";
import { apply, validate } from "../../src/reducer/index";
import { rollDice } from "../../src/rng";
import type { MatchState, PlayerId } from "../../src/state";
import { testBoard, testRules } from "./state";

export const NAVEEN: PlayerId = "p-naveen";
export const PRIYA: PlayerId = "p-priya";
export const ARUN: PlayerId = "p-arun";

export function setup(overrides: Partial<MatchSetup> = {}): MatchSetup {
  return {
    id: "m-test",
    mode: "passAndPlay",
    board: testBoard(),
    rules: testRules(),
    players: [
      { id: NAVEEN, name: "Naveen", colour: "gold" },
      { id: PRIYA, name: "Priya", colour: "blue" },
    ],
    seed: 42,
    atMs: 0,
    ...overrides,
  };
}

export function newMatch(overrides: Partial<MatchSetup> = {}): MatchState {
  return createMatch(setup(overrides));
}

/**
 * Applies an action, asserting the state invariants hold before and after and the transition
 * invariants across it. Every scenario test goes through this so a rule bug that breaks an
 * invariant fails loudly at the step that caused it.
 */
export function step(state: MatchState, action: Action): MatchState {
  const before = checkInvariants(state);
  if (before.length > 0) {
    throw new Error(`invariants broken before ${action.kind}: ${JSON.stringify(before)}`);
  }
  const result = apply(state, action);
  const after = checkInvariants(result.state);
  if (after.length > 0) {
    throw new Error(`invariants broken after ${action.kind}: ${JSON.stringify(after)}`);
  }
  const transition = checkTransitionInvariants(state, result.state);
  if (transition.length > 0) {
    throw new Error(`transition invariants broken by ${action.kind}: ${JSON.stringify(transition)}`);
  }
  return result.state;
}

/** apply(), returning events too, with the same invariant checks. */
export function stepWithEvents(state: MatchState, action: Action) {
  const next = step(state, action);
  return { state: next, events: next.log.slice(state.log.length) };
}

export function refusal(state: MatchState, action: Action): string {
  const verdict = validate(state, action);
  return verdict.ok ? "OK" : verdict.code;
}

/**
 * Makes the next ROLL produce `wanted` by choosing a seed that yields it at the current cursor.
 * The state is plain data, so a test may set its RNG; the engine then draws deterministically.
 */
export function forceNextRoll(state: MatchState, wanted: [number, number]): MatchState {
  for (let seed = 1; seed < 1_000_000; seed++) {
    const { dice } = rollDice({ seed, cursor: state.rng.cursor });
    if (dice[0] === wanted[0] && dice[1] === wanted[1]) {
      return { ...state, rng: { seed, cursor: state.rng.cursor } };
    }
  }
  throw new Error(`no seed found for roll ${wanted.join(",")}`);
}

export function at(kind: "ROLL" | "END_TURN" | "PASS_BID" | "DECLARE_BANKRUPTCY" | "PAY_BAIL", by: PlayerId, atMs = 0): Action {
  return { kind, by, atMs } as Action;
}

/** Rolls `dice` for the actor and returns the resulting state. */
export function rollAs(state: MatchState, by: PlayerId, dice: [number, number]): MatchState {
  return step(forceNextRoll(state, dice), { kind: "ROLL", by, atMs: 0 });
}

/** Gives a player tiles directly (a test shortcut; the ledger is untouched because no money moves). */
export function grant(state: MatchState, playerId: PlayerId, tileIndexes: number[]): MatchState {
  const next = JSON.parse(JSON.stringify(state)) as MatchState;
  for (const index of tileIndexes) {
    next.tiles[index]!.ownerId = playerId;
  }
  return next;
}

export function setCash(state: MatchState, playerId: PlayerId, cash: number): MatchState {
  const next = JSON.parse(JSON.stringify(state)) as MatchState;
  const player = next.players[playerId]!;
  // Keep the ledger honest: the difference is money the bank issued or absorbed.
  const delta = cash - player.cash;
  player.cash = cash;
  if (delta >= 0) {
    next.bank.ledger.issued += delta;
  } else {
    next.bank.ledger.absorbed += -delta;
  }
  return next;
}

export function lastEvent(state: MatchState, kind: string) {
  return [...state.log].reverse().find((event) => event.kind === kind);
}

export function eventsOf(state: MatchState, kind: string) {
  return state.log.filter((event) => event.kind === kind);
}
