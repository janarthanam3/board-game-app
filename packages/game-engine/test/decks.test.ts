// Deck draws (rulebook §5.2 "Draw semantics", §19 contract #5, 1y §4; edge cases #37, #38).

import { describe, expect, it } from "vitest";

import { activeRules, drawFromDeck } from "../src/decks";
import type { Rng } from "../src/rng";
import type { DeckRule, FrozenDeck, RuleDefinition } from "../src/state";

const rule = (id: string): RuleDefinition => ({ id, name: id, conditions: null, money: null, move: null, holdCard: null });
const entry = (id: string, diceTotals: number[] = [], active = true): DeckRule => ({ rule: rule(id), active, diceTotals });

const deck = (overrides: Partial<FrozenDeck>): FrozenDeck => ({
  id: "d-test",
  name: "Test deck",
  drawMode: "shuffle",
  fallback: "nothing",
  rules: [entry("r-a"), entry("r-b"), entry("r-c", [], false), entry("r-d")],
  ...overrides,
});

const rng: Rng = { seed: 42, cursor: 0 };

describe("active rules", () => {
  it("keeps the author's stored order and drops inactive entries", () => {
    expect(activeRules(deck({})).map((r) => r.id)).toEqual(["r-a", "r-b", "r-d"]);
  });
});

describe("Shuffle", () => {
  it("draws from the active rules with the seeded RNG and advances the cursor by one", () => {
    const result = drawFromDeck(deck({}), rng, 0, 7);
    expect(result.source).toBe("shuffle");
    expect(["r-a", "r-b", "r-d"]).toContain(result.rule?.id);
    expect(result.rng).toEqual({ seed: 42, cursor: 1 });
    expect(result.cursor).toBe(0); // the order cursor is untouched by a shuffle draw
  });

  it("draws with replacement — the same rule can come up on consecutive landings", () => {
    // Walk the RNG until two consecutive draws agree; with replacement that must be reachable.
    let state = rng;
    let previous: string | undefined;
    let repeated = false;
    for (let i = 0; i < 200 && !repeated; i++) {
      const result = drawFromDeck(deck({}), state, 0, 7);
      repeated = result.rule?.id === previous;
      previous = result.rule?.id;
      state = result.rng;
    }
    expect(repeated).toBe(true);
  });

  it("reshuffle determinism: the same seed and cursor always give the same sequence", () => {
    const sequenceFrom = (start: Rng): string[] => {
      const out: string[] = [];
      let state = start;
      for (let i = 0; i < 25; i++) {
        const result = drawFromDeck(deck({}), state, 0, 7);
        out.push(result.rule!.id);
        state = result.rng;
      }
      return out;
    };
    expect(sequenceFrom({ seed: 42, cursor: 0 })).toEqual(sequenceFrom({ seed: 42, cursor: 0 }));
    expect(sequenceFrom({ seed: 42, cursor: 0 })).not.toEqual(sequenceFrom({ seed: 43, cursor: 0 }));
  });

  it("never draws an inactive rule", () => {
    let state = rng;
    for (let i = 0; i < 100; i++) {
      const result = drawFromDeck(deck({}), state, 0, 7);
      expect(result.rule?.id).not.toBe("r-c");
      state = result.rng;
    }
  });
});

describe("My Order", () => {
  const ordered = deck({ drawMode: "myOrder" });

  it("draws the rule at the cursor, then advances it", () => {
    const first = drawFromDeck(ordered, rng, 0, 7);
    expect(first).toMatchObject({ rule: { id: "r-a" }, source: "myOrder", cursor: 1 });
    const second = drawFromDeck(ordered, first.rng, first.cursor, 7);
    expect(second).toMatchObject({ rule: { id: "r-b" }, cursor: 2 });
  });

  it("skips inactive rules and wraps at the end", () => {
    const third = drawFromDeck(ordered, rng, 2, 7);
    expect(third).toMatchObject({ rule: { id: "r-d" }, cursor: 0 });
    expect(drawFromDeck(ordered, rng, 0, 7).rule?.id).toBe("r-a");
  });

  it("does not consume the RNG", () => {
    expect(drawFromDeck(ordered, rng, 0, 7).rng).toEqual(rng);
  });

  it("tolerates a cursor past the end (a rule deactivated since the cursor was stored)", () => {
    expect(drawFromDeck(ordered, rng, 9, 7)).toMatchObject({ rule: { id: "r-a" }, cursor: 1 });
  });
});

describe("Dice Number", () => {
  const byDice = deck({
    drawMode: "diceNumber",
    rules: [entry("odd", [3, 5, 7, 9, 11]), entry("even", [2, 4, 6, 8, 10, 12]), entry("twelve-off", [12], false)],
  });

  it("applies the rule whose stored totals include the roll", () => {
    expect(drawFromDeck(byDice, rng, 0, 7)).toMatchObject({ rule: { id: "odd" }, source: "diceNumber" });
    expect(drawFromDeck(byDice, rng, 0, 8)).toMatchObject({ rule: { id: "even" }, source: "diceNumber" });
  });

  it("ignores inactive rules even when their total matches", () => {
    const mixed = deck({ drawMode: "diceNumber", rules: [entry("seven", [7]), entry("twelve-off", [12], false)] });
    expect(drawFromDeck(mixed, rng, 0, 12)).toMatchObject({ rule: null, source: "fallbackNothing" });
  });

  it("edge case #37, fallback Nothing: an unassigned total has no effect", () => {
    const gaps = deck({ drawMode: "diceNumber", fallback: "nothing", rules: [entry("seven", [7])] });
    expect(drawFromDeck(gaps, rng, 0, 4)).toMatchObject({ rule: null, source: "fallbackNothing", rng, cursor: 0 });
  });

  it("fallback Whole deck: an unassigned total becomes a Shuffle draw", () => {
    const gaps = deck({ drawMode: "diceNumber", fallback: "wholeDeck", rules: [entry("seven", [7]), entry("nine", [9])] });
    const result = drawFromDeck(gaps, rng, 0, 4);
    expect(result.source).toBe("fallbackWholeDeck");
    expect(["seven", "nine"]).toContain(result.rule?.id);
    expect(result.rng.cursor).toBe(1);
  });

  it("fallback Next in order: an unassigned total becomes the My Order cursor draw", () => {
    const gaps = deck({ drawMode: "diceNumber", fallback: "nextInOrder", rules: [entry("seven", [7]), entry("nine", [9])] });
    expect(drawFromDeck(gaps, rng, 1, 4)).toMatchObject({ rule: { id: "nine" }, source: "fallbackNextInOrder", cursor: 0, rng });
  });

  it("with no dice total at all (a card reached without a roll) the fallback applies", () => {
    expect(drawFromDeck(byDice, rng, 0, null)).toMatchObject({ rule: null, source: "fallbackNothing" });
  });
});

describe("edge case #38: a deck with zero active rules", () => {
  it.each(["shuffle", "myOrder", "diceNumber"] as const)("%s contributes nothing and leaves the RNG and cursor alone", (drawMode) => {
    const empty = deck({ drawMode, fallback: "wholeDeck", rules: [entry("r-c", [7], false)] });
    expect(drawFromDeck(empty, rng, 3, 7)).toEqual({ rule: null, source: "emptyDeck", rng, cursor: 3 });
  });
});
