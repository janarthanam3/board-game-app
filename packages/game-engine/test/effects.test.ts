// The rule-effect grammar, pure parts (rulebook §5.1, 1z §4). Reducer-level application lives in
// test/reducer/cards.test.ts.

import { describe, expect, it } from "vitest";

import { conditionsHold, moneyPlan, moveDestination, ruleCategory } from "../src/effects";
import type { ConditionsBlock, MatchState, MoneyBlock, RuleDefinition } from "../src/state";
import { ARUN, grant, NAVEEN, newMatch, PRIYA, setCash } from "./support/match";

function three(): MatchState {
  return newMatch({
    players: [
      { id: NAVEEN, name: "Naveen", colour: "gold" },
      { id: PRIYA, name: "Priya", colour: "blue" },
      { id: ARUN, name: "Arun", colour: "green" },
    ],
  });
}

const gate = (overrides: Partial<ConditionsBlock>): ConditionsBlock => ({
  holdsColourSet: false,
  ownsEveryTileInSet: false,
  cashAbove: null,
  hasHouseOrHotel: false,
  ...overrides,
});

describe("CONDITIONS gate (1z §4.4: every selected condition must hold)", () => {
  it("no block, or a block with nothing selected, always holds", () => {
    expect(conditionsHold(three(), NAVEEN, null)).toBe(true);
    expect(conditionsHold(three(), NAVEEN, gate({}))).toBe(true);
  });

  it("Holds the colour set: uses the board's threshold (3 of 5 on this board)", () => {
    expect(conditionsHold(grant(three(), NAVEEN, [1, 2]), NAVEEN, gate({ holdsColourSet: true }))).toBe(false);
    expect(conditionsHold(grant(three(), NAVEEN, [1, 2, 3]), NAVEEN, gate({ holdsColourSet: true }))).toBe(true);
  });

  it("Owns every tile in the set: the threshold is not enough", () => {
    expect(conditionsHold(grant(three(), NAVEEN, [1, 2, 3]), NAVEEN, gate({ ownsEveryTileInSet: true }))).toBe(false);
    expect(conditionsHold(grant(three(), NAVEEN, [1, 2, 3, 13, 14]), NAVEEN, gate({ ownsEveryTileInSet: true }))).toBe(true);
  });

  it("Cash > 10k: strictly greater", () => {
    expect(conditionsHold(setCash(three(), NAVEEN, 10_000), NAVEEN, gate({ cashAbove: 10_000 }))).toBe(false);
    expect(conditionsHold(setCash(three(), NAVEEN, 10_001), NAVEEN, gate({ cashAbove: 10_000 }))).toBe(true);
  });

  it("Has house or hotel: a hotel counts", () => {
    const state = grant(three(), NAVEEN, [1]);
    expect(conditionsHold(state, NAVEEN, gate({ hasHouseOrHotel: true }))).toBe(false);
    state.tiles[1]!.hotel = true;
    expect(conditionsHold(state, NAVEEN, gate({ hasHouseOrHotel: true }))).toBe(true);
  });

  it("several selected: all must hold", () => {
    const state = grant(setCash(three(), NAVEEN, 12_000), NAVEEN, [1, 2, 3]);
    expect(conditionsHold(state, NAVEEN, gate({ holdsColourSet: true, cashAbove: 10_000 }))).toBe(true);
    expect(conditionsHold(state, NAVEEN, gate({ holdsColourSet: true, cashAbove: 10_000, hasHouseOrHotel: true }))).toBe(false);
  });
});

describe("MONEY plan (direction × basis)", () => {
  const money = (direction: MoneyBlock["direction"], basis: MoneyBlock["basis"], amount = 500): MoneyBlock => ({ direction, amount, basis });

  /** Naveen: 3 tiles, 2 houses + 1 hotel, two other solvent players. */
  function rich(): MatchState {
    const state = grant(three(), NAVEEN, [1, 2, 3]);
    state.tiles[1]!.houses = 2;
    state.tiles[2]!.hotel = true;
    return state;
  }

  it.each([
    ["flat", 500],
    ["perPlayer", 1000],
    ["perHouse", 1500],
    ["perTileOwned", 1500],
  ] as const)("Bank pays you × %s -> one transfer from the bank of %i", (basis, amount) => {
    expect(moneyPlan(rich(), NAVEEN, money("bankPaysYou", basis))).toEqual([{ from: "bank", to: NAVEEN, amount }]);
  });

  it.each([
    ["flat", 500],
    ["perPlayer", 1000],
    ["perHouse", 1500],
    ["perTileOwned", 1500],
  ] as const)("You pay bank × %s -> one transfer to the bank of %i", (basis, amount) => {
    expect(moneyPlan(rich(), NAVEEN, money("youPayBank", basis))).toEqual([{ from: NAVEEN, to: "bank", amount }]);
  });

  it.each([
    ["flat", 500],
    ["perPlayer", 500],
    ["perHouse", 1500],
    ["perTileOwned", 1500],
  ] as const)("Share to all players × %s -> one transfer of %i to each other solvent player", (basis, amount) => {
    expect(moneyPlan(rich(), NAVEEN, money("shareToAllPlayers", basis))).toEqual([
      { from: NAVEEN, to: PRIYA, amount },
      { from: NAVEEN, to: ARUN, amount },
    ]);
  });

  it.each([
    ["flat", 500],
    ["perPlayer", 500],
    ["perHouse", 1500],
    ["perTileOwned", 1500],
  ] as const)("Collect from all players × %s -> one transfer of %i from each other solvent player", (basis, amount) => {
    expect(moneyPlan(rich(), NAVEEN, money("collectFromAllPlayers", basis))).toEqual([
      { from: PRIYA, to: NAVEEN, amount },
      { from: ARUN, to: NAVEEN, amount },
    ]);
  });

  it("bankrupt players are left out of share and collect", () => {
    const state = rich();
    state.players[ARUN]!.bankrupt = { out: true, round: 1, owedTo: "bank", amount: 0 };
    expect(moneyPlan(state, NAVEEN, money("shareToAllPlayers", "flat"))).toEqual([{ from: NAVEEN, to: PRIYA, amount: 500 }]);
  });

  it("a per-house or per-tile basis with nothing owned plans no transfer", () => {
    expect(moneyPlan(three(), NAVEEN, money("bankPaysYou", "perHouse"))).toEqual([]);
    expect(moneyPlan(three(), NAVEEN, money("youPayBank", "perTileOwned"))).toEqual([]);
  });
});

describe("MOVE destination", () => {
  const size = 16;
  it("Forward n: clockwise, passing Start pays the bonus", () => {
    expect(moveDestination(14, { direction: "forward", count: 3, targetTileIndex: null, collectPassBonus: true }, size)).toEqual({ to: 1, passedStart: true });
  });
  it("Forward with the pass-Go toggle off never pays, even across Start", () => {
    expect(moveDestination(14, { direction: "forward", count: 3, targetTileIndex: null, collectPassBonus: false }, size)).toEqual({ to: 1, passedStart: false });
  });
  it("Backward n: anticlockwise, no pass bonus (edge case #12)", () => {
    expect(moveDestination(1, { direction: "backward", count: 3, targetTileIndex: null, collectPassBonus: true }, size)).toEqual({ to: 14, passedStart: false });
  });
  it("To tile: teleport; the bonus follows the toggle only (edge case #14)", () => {
    expect(moveDestination(5, { direction: "toTile", count: 0, targetTileIndex: 0, collectPassBonus: true }, size)).toEqual({ to: 0, passedStart: true });
    expect(moveDestination(5, { direction: "toTile", count: 0, targetTileIndex: 0, collectPassBonus: false }, size)).toEqual({ to: 0, passedStart: false });
  });
  it("To tile without a target is no move at all", () => {
    expect(moveDestination(5, { direction: "toTile", count: 0, targetTileIndex: null, collectPassBonus: true }, size)).toBeNull();
  });
  it("a zero-count step is no move", () => {
    expect(moveDestination(5, { direction: "forward", count: 0, targetTileIndex: null, collectPassBonus: true }, size)).toBeNull();
  });
});

describe("category derivation (1z §4.5)", () => {
  const base: RuleDefinition = { id: "r", name: "r", conditions: null, money: null, move: null, holdCard: null };
  const money: MoneyBlock = { direction: "bankPaysYou", amount: 100, basis: "flat" };
  const move = { direction: "forward" as const, count: 1, targetTileIndex: null, collectPassBonus: false };
  const hold = { affects: "me" as const, effect: { kind: "jailPass" as const }, uses: 1, expires: "never" as const, tradeable: true };

  it("one active section gives that section's category", () => {
    expect(ruleCategory({ ...base, money })).toBe("MONEY");
    expect(ruleCategory({ ...base, move })).toBe("MOVE");
    expect(ruleCategory({ ...base, holdCard: hold })).toBe("HOLD CARD");
  });
  it("CONDITIONS alone is CONDITION", () => {
    expect(ruleCategory({ ...base, conditions: gate({ cashAbove: 10_000 }) })).toBe("CONDITION");
  });
  it("two or more sections are MIXED", () => {
    expect(ruleCategory({ ...base, money, move })).toBe("MIXED");
    expect(ruleCategory({ ...base, money, conditions: gate({}) })).toBe("MIXED");
  });
  it("no active section has no category", () => {
    expect(ruleCategory(base)).toBeNull();
  });
});
