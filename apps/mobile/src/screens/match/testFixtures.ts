// Test-only: the engine's committed match fixtures, for the HUD's tests.
//
// `packages/game-engine/SPEC.md` "Testing hooks" names these five states, `make-fixtures.ts` builds
// them and `fixtures.test.ts` asserts the committed JSON still matches the engine's shape — so the
// HUD tests read real engine states rather than a second, drifting copy. Every name in them is a
// Chennai name (CLAUDE.md: no Monopoly board names in fixtures).

import type { MatchState, PlayerId } from "@royal-navy/game-engine";

import auctionLiveJson from "../../../../../packages/game-engine/test/fixtures/auction-live.json";
import classic40Json from "../../../../../packages/game-engine/test/fixtures/classic-40.json";
import debtPendingJson from "../../../../../packages/game-engine/test/fixtures/debt-pending.json";
import midgameJson from "../../../../../packages/game-engine/test/fixtures/midgame-4p.json";

export const NAVEEN: PlayerId = "p-naveen";
export const PRIYA: PlayerId = "p-priya";
export const ARUN: PlayerId = "p-arun";
export const MEERA: PlayerId = "p-meera";

/** JSON widens every union to `string`; the fixture test in the engine guarantees the real shape. */
function load(json: unknown): MatchState {
  return JSON.parse(JSON.stringify(json)) as MatchState;
}

/** Four players a few turns in: deeds held, houses standing, one tile mortgaged. Arun to roll. */
export function midgame(): MatchState {
  return load(midgameJson);
}

/** Naveen owes Priya ₹350 he cannot pay: a debt stands and the turn sits in raiseCash. */
export function debtPending(): MatchState {
  return load(debtPendingJson);
}

/** A lot open on Bay Road; Naveen's turn is paused in the auction stage. */
export function auctionLive(): MatchState {
  return load(auctionLiveJson);
}

/** The 40-slot ring, four players, turn 1. */
export function classic40(): MatchState {
  return load(classic40Json);
}

/** A state a test may mutate freely. */
export function clone(state: MatchState): MatchState {
  return JSON.parse(JSON.stringify(state)) as MatchState;
}
