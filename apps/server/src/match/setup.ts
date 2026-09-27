// Turning a lobby into a live match: the frozen board version plus the seated players become the
// engine's MatchSetup, and `createMatch` does the rest.
//
// docs/flows/match-create-join.md invariants 2 and 3: the board version is frozen into the match, and
// the seed is fixed and stored so the match is replayable. The version is frozen by reference — the
// row it points at is immutable (D5) — and the seed is drawn once, at `POST /matches`, because
// `matches.seed` is `not null` and the row is written there. Either way it is fixed before a single
// draw is taken, which is all replay needs; the flow doc says "fixed at match:start", and the column's
// nullability is what decides it.

import { createMatch, type MatchSetup, type MatchState, type PlayerColour } from "@royal-navy/game-engine";
import { randomInt } from "node:crypto";

import type { BoardVersionRow, MatchPlayerRow, MatchRow } from "./records.js";

/**
 * A fresh 32-bit seed. `crypto.randomInt`, never `Math.random`: CLAUDE.md bans it in server match
 * code, and a predictable seed would make every dice roll of a match predictable from its id.
 */
export function newSeed(): number {
  return randomInt(0, 2 ** 32);
}

/**
 * Builds the engine state for a match that is starting. Throws only on data the database should make
 * impossible (fewer than two seats, a version with no ruleset), because there is no sensible partial
 * match to hand back — the caller turns that into `E_ENGINE_PANIC` and leaves the lobby alone.
 */
export function startMatch(match: MatchRow, version: BoardVersionRow, players: readonly MatchPlayerRow[], atMs: number): MatchState {
  const { ruleset, ...board } = version.document;
  if (!ruleset) {
    throw new Error(`startMatch: board version ${version.id} has no ruleset`);
  }

  const setup: MatchSetup = {
    id: match.id,
    mode: match.mode,
    board,
    rules: ruleset,
    // Seat order is the engine's player order, so the list must be sorted by seat — `loadPlayers`
    // orders it, and this re-sorts rather than trusting the caller not to have filtered it.
    players: [...players]
      .sort((a, b) => a.seat - b.seat)
      .map((player) => ({
        id: player.player_id,
        name: player.name,
        colour: player.colour as PlayerColour,
        ai: player.ai_tier === null ? null : { tier: player.ai_tier },
      })),
    // `matches.seed` is a bigint, which node-postgres returns as a string to avoid a lossy conversion.
    seed: Number(match.seed),
    atMs,
  };

  return createMatch(setup);
}

/**
 * The absolute deadline for the turn that has just begun, or null when the board's timer is off
 * (`Ruleset.rounds.turnTimerSeconds` is nullable).
 *
 * Absolute, and server-supplied: the socket-contract skill's "Deadlines are server-supplied … The
 * client renders; it never extends a timer", and docs/07's "The turn deadline is pushed once per turn,
 * never streamed — clients count down locally from `deadlineMs`".
 */
export function turnDeadlineMs(state: MatchState, atMs: number): number | null {
  const seconds = state.rules.rounds.turnTimerSeconds;
  return seconds === null ? null : atMs + seconds * 1000;
}
