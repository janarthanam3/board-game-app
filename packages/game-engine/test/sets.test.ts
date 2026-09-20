import { describe, expect, it } from "vitest";

import {
  countTowardSet,
  holdsSet,
  isCustomThresholdValid,
  setProgress,
  thresholdFor,
  validateGroup,
} from "../src/sets";
import { baseState, cloneState } from "./support/state";

describe("thresholdFor (rulebook §4)", () => {
  it("All tiles: the whole group", () => {
    const state = cloneState(baseState());
    state.rules.sets.mode = "allTiles";
    expect(thresholdFor(state, "g-purple")).toBe(5);
  });

  it("Majority on 5 is 3", () => {
    const state = cloneState(baseState());
    state.rules.sets.mode = "majority";
    expect(thresholdFor(state, "g-purple")).toBe(3);
  });

  it("Majority on 4 is 3 — floor(4 / 2) + 1", () => {
    const state = cloneState(baseState());
    state.board.groups[1]!.tileIndexes = [5, 6, 9, 10];
    expect(thresholdFor(state, "g-sky")).toBe(3);
  });

  it("Custom uses the custom value", () => {
    const state = cloneState(baseState());
    state.rules.sets.mode = "custom";
    state.rules.sets.customValue = 4;
    expect(thresholdFor(state, "g-purple")).toBe(4);
  });

  it("a per-group override wins over the mode", () => {
    const state = cloneState(baseState());
    state.rules.sets.mode = "allTiles";
    state.board.groups[0]!.thresholdOverride = 3;
    expect(thresholdFor(state, "g-purple")).toBe(3);
    expect(thresholdFor(state, "g-sky")).toBe(5);
  });

  it("refuses an unknown group", () => {
    expect(() => thresholdFor(baseState(), "g-nope")).toThrow(/group/);
  });
});

describe("isCustomThresholdValid — more than half the group (B5)", () => {
  it("a group of 5 allows 3, 4 or 5 and rejects 2", () => {
    expect(isCustomThresholdValid(5, 2)).toBe(false);
    expect(isCustomThresholdValid(5, 3)).toBe(true);
    expect(isCustomThresholdValid(5, 4)).toBe(true);
    expect(isCustomThresholdValid(5, 5)).toBe(true);
    expect(isCustomThresholdValid(5, 6)).toBe(false);
  });

  it("a group of 4 needs at least 3", () => {
    expect(isCustomThresholdValid(4, 2)).toBe(false);
    expect(isCustomThresholdValid(4, 3)).toBe(true);
  });
});

describe("countTowardSet and holdsSet", () => {
  function owning(indexes: number[], mortgaged: number[] = []) {
    const state = cloneState(baseState());
    for (const index of indexes) {
      state.tiles[index]!.ownerId = "p-naveen";
    }
    for (const index of mortgaged) {
      state.tiles[index]!.mortgaged = true;
    }
    return state;
  }

  it("counts the player's tiles in the group", () => {
    expect(countTowardSet(owning([1, 2, 5]), "p-naveen", "g-purple")).toBe(2);
    expect(countTowardSet(owning([1, 2, 5]), "p-priya", "g-purple")).toBe(0);
  });

  it("holds the set at the threshold (3 of 5 on Majority)", () => {
    expect(holdsSet(owning([1, 2]), "p-naveen", "g-purple")).toBe(false);
    expect(holdsSet(owning([1, 2, 3]), "p-naveen", "g-purple")).toBe(true);
  });

  it("excludes a mortgaged tile when Mortgage breaks the set is on", () => {
    const state = owning([1, 2, 3], [3]);
    state.rules.sets.mortgageBreaksSet = true;
    expect(countTowardSet(state, "p-naveen", "g-purple")).toBe(2);
    expect(holdsSet(state, "p-naveen", "g-purple")).toBe(false);
  });

  it("still counts a mortgaged tile when Mortgage breaks the set is off", () => {
    const state = owning([1, 2, 3], [3]);
    state.rules.sets.mortgageBreaksSet = false;
    expect(holdsSet(state, "p-naveen", "g-purple")).toBe(true);
  });
});

describe("setProgress — the 1j pip row", () => {
  it("reports `3 of 5 · set held`", () => {
    const state = cloneState(baseState());
    for (const index of [1, 2, 3]) {
      state.tiles[index]!.ownerId = "p-naveen";
    }
    expect(setProgress(state, "p-naveen", "g-purple")).toEqual({ owned: 3, size: 5, threshold: 3, held: true, needed: 0 });
  });

  it("reports `2 of 5 · need 1 more`", () => {
    const state = cloneState(baseState());
    for (const index of [1, 2]) {
      state.tiles[index]!.ownerId = "p-naveen";
    }
    expect(setProgress(state, "p-naveen", "g-purple")).toEqual({ owned: 2, size: 5, threshold: 3, held: false, needed: 1 });
  });
});

describe("validateGroup — the Rule lab's hard error and warning (D3)", () => {
  it("a group below its threshold can never be held: a save-blocking error", () => {
    const state = cloneState(baseState());
    state.board.groups[0]!.tileIndexes = [1, 2];
    state.board.groups[0]!.thresholdOverride = 3;
    expect(validateGroup(state, "g-purple")).toEqual({
      level: "error",
      message: "Purple set has 2 tiles, threshold 3",
      detail: "This set can never be held",
    });
  });

  it("Majority on an even group is a warning, not an error", () => {
    const state = cloneState(baseState());
    state.board.groups[1]!.tileIndexes = [5, 6, 9, 10];
    expect(validateGroup(state, "g-sky")).toEqual({
      level: "warning",
      message: "Majority needs an odd group size",
      detail: "Sky has 4 tiles — a 2 and 2 split holds no set",
    });
  });

  it("a healthy group passes", () => {
    expect(validateGroup(baseState(), "g-purple")).toEqual({ level: "ok" });
  });
});
