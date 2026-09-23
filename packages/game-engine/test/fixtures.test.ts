// SPEC.md "Testing hooks": the five fixtures and the stable state hash.
//
// The JSON files are generated from test/fixtures/make-fixtures.ts (`pnpm fixtures`). These tests
// keep them honest: each file must still match its generator, satisfy every invariant, and carry
// no trademarked property name.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { __debug, hash, stableStringify } from "../src/debug";
import { checkInvariants } from "../src/invariants";
import type { MatchState } from "../src/state";
import { fixtures, type FixtureName } from "./fixtures/make-fixtures";

const DIR = join(__dirname, "fixtures");
const names = Object.keys(fixtures) as FixtureName[];

/** Trademarked board names that must never appear in a fixture (CLAUDE.md, rulebook §20). */
const BLOCKED = [
  "Boardwalk", "Park Place", "Baltic", "Mediterranean", "Oriental", "Ventnor", "Marvin Gardens",
  "Pennsylvania", "Illinois", "Kentucky", "Tennessee", "St. James", "Reading Railroad",
  "Short Line", "Electric Company", "Water Works", "Monopoly",
];

function read(name: FixtureName): MatchState {
  return JSON.parse(readFileSync(join(DIR, `${name}.json`), "utf8")) as MatchState;
}

describe("fixtures", () => {
  it("has one file per name SPEC lists", () => {
    expect(names.sort()).toEqual(["auction-live", "chennai-16", "classic-40", "debt-pending", "midgame-4p"]);
  });

  it.each(names)("%s matches its generator", (name) => {
    // Regenerating is `pnpm --filter game-engine fixtures`.
    expect(read(name)).toEqual(JSON.parse(JSON.stringify(fixtures[name]())));
  });

  it.each(names)("%s satisfies every invariant", (name) => {
    expect(checkInvariants(read(name))).toEqual([]);
  });

  it.each(names)("%s uses no trademarked name", (name) => {
    const text = readFileSync(join(DIR, `${name}.json`), "utf8");
    for (const blocked of BLOCKED) {
      expect(text).not.toContain(blocked);
    }
  });

  it("classic-40 is a 40-tile ring (2r + 2c − 4 with r = c = 11)", () => {
    const state = read("classic-40");
    expect(state.board.tiles).toHaveLength(40);
    expect(2 * state.board.rows + 2 * state.board.cols - 4).toBe(40);
  });
});

describe("__debug.hash (SPEC testing hooks)", () => {
  it("is stable for the same state and differs for a changed one", () => {
    const state = read("chennai-16");
    expect(hash(state)).toBe(hash(JSON.parse(JSON.stringify(state)) as MatchState));
    const changed = JSON.parse(JSON.stringify(state)) as MatchState;
    changed.players["p-naveen"]!.cash += 1;
    expect(hash(changed)).not.toBe(hash(state));
  });

  it("ignores key order, so two states written differently still agree", () => {
    const state = read("midgame-4p");
    const reordered = JSON.parse(JSON.stringify({ ...state, log: state.log, id: state.id })) as MatchState;
    expect(hash(reordered)).toBe(hash(state));
    expect(stableStringify({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it("keeps array order significant", () => {
    expect(stableStringify([1, 2])).not.toBe(stableStringify([2, 1]));
  });

  it("is reachable through the __debug namespace SPEC names", () => {
    expect(__debug.hash(read("auction-live"))).toMatch(/^[0-9a-f]{8}$/);
  });

  it.each(names)("%s hashes to eight hex digits", (name) => {
    expect(hash(read(name))).toMatch(/^[0-9a-f]{8}$/);
  });
});
