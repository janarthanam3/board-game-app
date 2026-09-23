// Card spaces in play: a landing draws from the tile's deck and applies the rule's blocks in the
// order CONDITIONS gate → MONEY → MOVE → HOLD CARD (rulebook §5.1; 1z §4; edge cases #10, #12–#14,
// #37, #38). Naveen starts on tile 0; rolling [1, 3] lands on tile 4, the Chance space (deck
// d-chance).

import { describe, expect, it } from "vitest";

import { MAX_CARD_CHAIN } from "../../src/reducer/cards";
import type { FrozenDeck, MatchState, RuleDefinition } from "../../src/state";
import { ARUN, eventsOf, grant, lastEvent, NAVEEN, newMatch, PRIYA, rollAs, setCash } from "../support/match";

const blank: RuleDefinition = { id: "r", name: "Rule", conditions: null, money: null, move: null, holdCard: null };

function withDeck(state: MatchState, rules: RuleDefinition[], deck: Partial<FrozenDeck> = {}): MatchState {
  const next = JSON.parse(JSON.stringify(state)) as MatchState;
  next.board.decks = [{ id: "d-chance", name: "Chance", drawMode: "myOrder", fallback: "nothing", rules: rules.map((rule) => ({ rule, active: true, diceTotals: [] })), ...deck }];
  return next;
}

function threePlayers(): MatchState {
  return newMatch({
    players: [
      { id: NAVEEN, name: "Naveen", colour: "gold" },
      { id: PRIYA, name: "Priya", colour: "blue" },
      { id: ARUN, name: "Arun", colour: "green" },
    ],
  });
}

/** Lands Naveen on the Chance space with the given single-rule deck. */
function land(rules: RuleDefinition[], base = threePlayers(), deck: Partial<FrozenDeck> = {}): MatchState {
  return rollAs(withDeck(base, rules, deck), NAVEEN, [1, 3]);
}

describe("drawing on landing", () => {
  it("logs the draw with its source and leaves the turn at postRoll", () => {
    const state = land([{ ...blank, id: "r-1", name: "Bank error" }]);
    expect(lastEvent(state, "cardDrawn")).toMatchObject({ playerId: NAVEEN, tileIndex: 4, deckId: "d-chance", ruleId: "r-1", ruleName: "Bank error", source: "myOrder", applied: true });
    expect(state.turn.stage).toBe("postRoll");
  });

  it("My Order: the deck cursor is per match and advances across players' landings", () => {
    let state = land([{ ...blank, id: "first" }, { ...blank, id: "second" }]);
    expect(state.deckCursors["d-chance"]).toBe(1);
    state = { ...state, turn: { ...state.turn, playerId: PRIYA, stage: "preRoll", dice: null, doublesThisTurn: 0 } };
    state = rollAs(state, PRIYA, [1, 3]);
    expect(lastEvent(state, "cardDrawn")).toMatchObject({ playerId: PRIYA, ruleId: "second" });
    expect(state.deckCursors["d-chance"]).toBe(0);
  });

  it("Shuffle: the draw consumes exactly one RNG step beyond the two dice", () => {
    const before = withDeck(threePlayers(), [{ ...blank, id: "a" }, { ...blank, id: "b" }], { drawMode: "shuffle" });
    const after = rollAs(before, NAVEEN, [1, 3]);
    expect(after.rng.cursor).toBe(before.rng.cursor + 3);
    expect(lastEvent(after, "cardDrawn")).toMatchObject({ source: "shuffle" });
  });

  it("Dice Number: the rule assigned to the roll's total (4) applies", () => {
    const state = withDeck(threePlayers(), [], { drawMode: "diceNumber", rules: [
      { rule: { ...blank, id: "on-four" }, active: true, diceTotals: [4] },
      { rule: { ...blank, id: "on-seven" }, active: true, diceTotals: [7] },
    ] });
    expect(lastEvent(rollAs(state, NAVEEN, [1, 3]), "cardDrawn")).toMatchObject({ ruleId: "on-four", source: "diceNumber" });
  });

  it("edge case #37: an unassigned total with fallback Nothing has no effect", () => {
    const state = withDeck(threePlayers(), [], { drawMode: "diceNumber", fallback: "nothing", rules: [{ rule: { ...blank, id: "on-seven" }, active: true, diceTotals: [7] }] });
    const after = rollAs(state, NAVEEN, [1, 3]);
    expect(lastEvent(after, "cardDrawn")).toMatchObject({ ruleId: null, source: "fallbackNothing", applied: false });
    expect(after.players[NAVEEN]!.cash).toBe(10_000);
  });

  it("edge case #38: an empty deck contributes nothing and the log says so", () => {
    expect(lastEvent(land([]), "cardDrawn")).toMatchObject({ ruleId: null, source: "emptyDeck", applied: false });
  });

  it("a card space with no deck is only logged as a landing", () => {
    const state = threePlayers();
    state.board.tiles[4] = { kind: "card", name: "Blank", cardType: "none", deckId: null };
    const after = rollAs(state, NAVEEN, [1, 3]);
    expect(lastEvent(after, "cardSpaceLanded")).toBeDefined();
    expect(eventsOf(after, "cardDrawn")).toHaveLength(0);
  });
});

describe("MONEY", () => {
  it("Bank pays you: cash rises and the ledger records the issue", () => {
    const state = land([{ ...blank, money: { direction: "bankPaysYou", amount: 3000, basis: "flat" } }]);
    expect(state.players[NAVEEN]!.cash).toBe(13_000);
    expect(state.bank.ledger.issued).toBe(30_000 + 3000);
    expect(lastEvent(state, "cardMoney")).toMatchObject({ from: "bank", to: NAVEEN, amount: 3000, debtId: null });
  });

  it("You pay bank: cash falls and the bank absorbs it", () => {
    const state = land([{ ...blank, money: { direction: "youPayBank", amount: 2300, basis: "flat" } }]);
    expect(state.players[NAVEEN]!.cash).toBe(7_700);
    expect(state.bank.ledger.absorbed).toBe(2300);
  });

  it("You pay bank beyond your cash opens a debt and the turn enters raiseCash", () => {
    const state = land([{ ...blank, money: { direction: "youPayBank", amount: 500, basis: "flat" } }], setCash(threePlayers(), NAVEEN, 300));
    expect(state.debts).toHaveLength(1);
    expect(state.debts[0]).toMatchObject({ debtorId: NAVEEN, creditorId: "bank", amount: 500 });
    expect(state.turn.stage).toBe("raiseCash");
    expect(lastEvent(state, "cardMoney")).toMatchObject({ debtId: state.debts[0]!.id });
  });

  it("Share to all players · Per player: each other player receives the amount", () => {
    const state = land([{ ...blank, money: { direction: "shareToAllPlayers", amount: 500, basis: "perPlayer" } }]);
    expect(state.players[NAVEEN]!.cash).toBe(9_000);
    expect(state.players[PRIYA]!.cash).toBe(10_500);
    expect(state.players[ARUN]!.cash).toBe(10_500);
  });

  it("Collect from all players: a player who cannot pay owes you a debt instead", () => {
    const base = setCash(threePlayers(), PRIYA, 100);
    const state = land([{ ...blank, money: { direction: "collectFromAllPlayers", amount: 500, basis: "flat" } }], base);
    expect(state.players[NAVEEN]!.cash).toBe(10_500); // only Arun paid
    expect(state.players[ARUN]!.cash).toBe(9_500);
    expect(state.debts).toEqual([expect.objectContaining({ debtorId: PRIYA, creditorId: NAVEEN, amount: 500 })]);
    expect(state.turn.stage).toBe("postRoll"); // the actor owes nothing
  });

  it("Per house: pays per house owned", () => {
    const base = grant(threePlayers(), NAVEEN, [1, 2, 3, 13, 14]);
    for (const index of [1, 2, 3]) base.tiles[index]!.houses = 1; // even build: 1,1,1,0,0 is a legal ladder
    base.bank.houses -= 3; // keep the building-stock invariant honest
    const state = land([{ ...blank, money: { direction: "youPayBank", amount: 100, basis: "perHouse" } }], base);
    expect(state.players[NAVEEN]!.cash).toBe(9_700);
  });

  it("Per tile owned", () => {
    const state = land([{ ...blank, money: { direction: "bankPaysYou", amount: 100, basis: "perTileOwned" } }], grant(threePlayers(), NAVEEN, [1, 2, 3]));
    expect(state.players[NAVEEN]!.cash).toBe(10_300);
  });
});

describe("MOVE", () => {
  const forward3 = { direction: "forward" as const, count: 3, targetTileIndex: null, collectPassBonus: true };

  it("Forward n moves the token on and resolves the new landing (an unowned tile opens the decision)", () => {
    const state = land([{ ...blank, move: forward3 }]);
    expect(state.players[NAVEEN]!.position).toBe(7);
    expect(state.turn.stage).toBe("decision");
    expect(lastEvent(state, "propertyCost")).toMatchObject({ tileIndex: 7 });
  });

  it("edge case #13: a card move onto an owned tile charges full rent", () => {
    const state = land([{ ...blank, move: forward3 }], grant(threePlayers(), PRIYA, [7]));
    expect(lastEvent(state, "rentPaid")).toMatchObject({ payerId: NAVEEN, ownerId: PRIYA, tileIndex: 7 });
  });

  it("Backward n: no pass bonus, even across Start (edge case #12)", () => {
    const state = land([{ ...blank, move: { direction: "backward", count: 6, targetTileIndex: null, collectPassBonus: true } }]);
    expect(state.players[NAVEEN]!.position).toBe(14);
    expect(eventsOf(state, "startBonus")).toHaveLength(0);
  });

  it("Forward across Start pays the bonus whether or not the rule collects it (rulebook §1)", () => {
    // §1: the flag governs teleports only — "a forward move pays whenever it crosses index 0".
    for (const collectPassBonus of [true, false]) {
      const state = land([{ ...blank, move: { direction: "forward", count: 13, targetTileIndex: null, collectPassBonus } }]);
      expect(state.players[NAVEEN]!.position).toBe(1);
      expect(lastEvent(state, "startBonus")).toMatchObject({ amount: 2000 });
    }
  });

  it("edge case #14: To tile onto Start pays the bonus only when the toggle is on", () => {
    const on = land([{ ...blank, move: { direction: "toTile", count: 0, targetTileIndex: 0, collectPassBonus: true } }]);
    expect(on.players[NAVEEN]!.position).toBe(0);
    expect(on.players[NAVEEN]!.cash).toBe(12_000);
    const off = land([{ ...blank, move: { direction: "toTile", count: 0, targetTileIndex: 0, collectPassBonus: false } }]);
    expect(off.players[NAVEEN]!.cash).toBe(10_000);
  });

  it("To tile onto the jail corner is a landing, not a sentence: GET IN applies as for any landing", () => {
    const state = land([{ ...blank, move: { direction: "toTile", count: 0, targetTileIndex: 8, collectPassBonus: false } }]);
    expect(state.players[NAVEEN]!.jail.in).toBe(true);
    expect(lastEvent(state, "sentToJail")).toMatchObject({ reason: "landed" });
  });

  it(`a rule that lands on another card space chains, capped at ${MAX_CARD_CHAIN} draws per landing`, () => {
    const state = land([{ ...blank, id: "loop", move: { direction: "toTile", count: 0, targetTileIndex: 4, collectPassBonus: false } }]);
    expect(eventsOf(state, "cardDrawn")).toHaveLength(MAX_CARD_CHAIN);
    expect(lastEvent(state, "cardSpaceLanded")).toMatchObject({ tileIndex: 4 });
    expect(state.turn.stage).toBe("postRoll");
  });
});

describe("HOLD CARD", () => {
  it("Affects Me: the card lands in my hand with its uses, expiry, tradeable flag and round", () => {
    const state = land([{ ...blank, holdCard: { affects: "me", effect: { kind: "jailPass" }, uses: 2, expires: "round", tradeable: false } }]);
    expect(state.players[NAVEEN]!.holdCards).toEqual([
      { id: expect.stringMatching(/^card-/), effect: { kind: "jailPass" }, uses: 2, expires: "round", tradeable: false, grantedRound: 1 },
    ]);
    expect(lastEvent(state, "holdCardGranted")).toMatchObject({ playerId: NAVEEN, effect: "jailPass" });
  });

  it("Affects Another player: no target can be chosen yet, so nothing is granted and the log says why (OQ-19)", () => {
    const state = land([{ ...blank, holdCard: { affects: "anotherPlayer", effect: { kind: "sendToJail", target: "choose" }, uses: 1, expires: "never", tradeable: false } }]);
    for (const id of [NAVEEN, PRIYA, ARUN]) {
      expect(state.players[id]!.holdCards).toEqual([]);
    }
    expect(lastEvent(state, "holdCardSkipped")).toMatchObject({ playerId: NAVEEN, reason: "needsTarget" });
  });
});

describe("CONDITIONS gate", () => {
  const paid = { direction: "bankPaysYou" as const, amount: 1000, basis: "flat" as const };
  const needsSet = { holdsColourSet: true, ownsEveryTileInSet: false, cashAbove: null, hasHouseOrHotel: false };

  it("a failing gate applies nothing and the draw is logged as not applied", () => {
    const state = land([{ ...blank, conditions: needsSet, money: paid }]);
    expect(state.players[NAVEEN]!.cash).toBe(10_000);
    expect(lastEvent(state, "cardDrawn")).toMatchObject({ applied: false, skipped: "conditions" });
  });

  it("a passing gate lets the blocks through", () => {
    const state = land([{ ...blank, conditions: needsSet, money: paid }], grant(threePlayers(), NAVEEN, [1, 2, 3]));
    expect(state.players[NAVEEN]!.cash).toBe(11_000);
    expect(lastEvent(state, "cardDrawn")).toMatchObject({ applied: true, category: "MIXED" });
  });
});

describe("block order (rulebook §5.1: CONDITIONS gate → MONEY → MOVE → HOLD CARD)", () => {
  it("the design's MIXED example applies money, then the move, then the card", () => {
    const rule: RuleDefinition = {
      ...blank,
      name: "Street repairs levy",
      money: { direction: "shareToAllPlayers", amount: 500, basis: "perPlayer" },
      move: { direction: "backward", count: 3, targetTileIndex: null, collectPassBonus: false },
      holdCard: { affects: "me", effect: { kind: "jailPass" }, uses: 1, expires: "never", tradeable: true },
    };
    const state = land([rule]);
    const kinds = state.log.map((event) => event.kind);
    const drawn = kinds.indexOf("cardDrawn");
    const money = kinds.indexOf("cardMoney");
    const moved = kinds.lastIndexOf("moved");
    const card = kinds.indexOf("holdCardGranted");
    expect(drawn).toBeLessThan(money);
    expect(money).toBeLessThan(moved);
    expect(moved).toBeLessThan(card);
    expect(state.players[NAVEEN]!.position).toBe(1);
    expect(state.players[NAVEEN]!.cash).toBe(9_000);
    expect(state.players[NAVEEN]!.holdCards).toHaveLength(1);
  });

  it("when the MONEY block leaves the actor in debt, the MOVE block waits (the debt blocks the turn) but the card is still granted", () => {
    const rule: RuleDefinition = {
      ...blank,
      money: { direction: "youPayBank", amount: 5000, basis: "flat" },
      move: { direction: "forward", count: 3, targetTileIndex: null, collectPassBonus: false },
      holdCard: { affects: "me", effect: { kind: "rentWaiver" }, uses: 1, expires: "never", tradeable: true },
    };
    const state = land([rule], setCash(threePlayers(), NAVEEN, 1000));
    expect(state.turn.stage).toBe("raiseCash");
    expect(state.players[NAVEEN]!.position).toBe(4);
    expect(state.players[NAVEEN]!.holdCards).toHaveLength(1);
    expect(lastEvent(state, "cardBlockSkipped")).toMatchObject({ ruleId: "r", block: "move", reason: "debtOpen" });
  });
});
