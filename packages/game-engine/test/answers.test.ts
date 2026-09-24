// The behaviours settled by the answered open questions (OQ-15, 17, 19, 20, 21, 22), one describe
// per item. These are the cases that were previously either unspecified or implemented the other
// way round, so each test names the question it pins down.

import { describe, expect, it } from "vitest";

import { teleport } from "../src/board";
import { checkInvariants } from "../src/invariants";
import { legalActions } from "../src/reducer/index";
import { raiseCashHeadroom, redeemCost } from "../src/reducer/property";
import type { FrozenDeck, MatchState, RuleDefinition } from "../src/state";
import { ARUN, at, eventsOf, grant, lastEvent, NAVEEN, newMatch, PRIYA, refusal, rollAs, setCash, step } from "./support/match";

const PURPLE = [1, 2, 3, 13, 14];

/** A board that sends fines and taxes to the free-parking pot, as Chennai Edition does. */
function potBoard(base: MatchState = newMatch()): MatchState {
  return { ...base, rules: { ...base.rules, money: { ...base.rules.money, finesTo: "pot" } } };
}

/** Puts a single-rule Chance deck on tile 4; Naveen rolling [1, 3] from Start lands there. */
function withDeck(state: MatchState, rule: Partial<RuleDefinition>, deck: Partial<FrozenDeck> = {}): MatchState {
  const next = JSON.parse(JSON.stringify(state)) as MatchState;
  const full: RuleDefinition = { id: "r", name: "Rule", conditions: null, money: null, move: null, holdCard: null, ...rule };
  next.board.decks = [
    { id: "d-chance", name: "Chance", drawMode: "myOrder", fallback: "nothing", rules: [{ rule: full, active: true, diceTotals: [] }], ...deck },
  ];
  return next;
}

describe("OQ-17 item 4 — the 'Hotel returns houses' toggle is gone", () => {
  it("building a hotel always returns its four houses to the bank (rulebook §8)", () => {
    let state = grant(newMatch(), NAVEEN, PURPLE);
    for (const index of PURPLE) {
      state.tiles[index]!.houses = 4;
      state.bank.houses -= 4;
    }
    const housesBefore = state.bank.houses;
    state = rollAs(state, NAVEEN, [1, 2]);
    state = step(state, { kind: "BUILD", by: NAVEEN, tileIndex: 1, what: "hotel", atMs: 0 });

    expect(state.tiles[1]).toMatchObject({ hotel: true, houses: 0 });
    expect(state.bank.houses).toBe(housesBefore + 4);
    expect(checkInvariants(state)).toEqual([]);
  });

  it("carries no building ruleset for a board to set", () => {
    expect(newMatch().rules).not.toHaveProperty("building");
  });
});

describe("OQ-20 item 1 — a mortgaged tile cannot be sold until it is redeemed", () => {
  /** Naveen owns Mount Road (5) and has rolled, so a sale is legal apart from the mortgage. */
  function ready(): MatchState {
    // Land on a tile he owns, or the turn sits in "decision" and side actions are illegal.
    return rollAs(grant(newMatch(), NAVEEN, [3, 5]), NAVEEN, [1, 2]);
  }

  it("refuses the sale with E_TILE_MORTGAGED", () => {
    let state = ready();
    state = step(state, { kind: "MORTGAGE", by: NAVEEN, tileIndexes: [5], atMs: 0 });
    expect(refusal(state, { kind: "SELL", by: NAVEEN, tileIndex: 5, what: "property", atMs: 0 })).toBe("E_TILE_MORTGAGED");
  });

  it("allows it again once the tile is redeemed", () => {
    let state = ready();
    state = step(state, { kind: "MORTGAGE", by: NAVEEN, tileIndexes: [5], atMs: 0 });
    state = step(state, { kind: "REDEEM", by: NAVEEN, tileIndexes: [5], atMs: 0 });
    expect(refusal(state, { kind: "SELL", by: NAVEEN, tileIndex: 5, what: "property", atMs: 0 })).toBe("OK");
  });

  it("closes the money leak: mortgage then sell can no longer out-earn the tile's cost", () => {
    // Mount Road costs ₹2,000: mortgage paid ₹1,000 and the old sale paid ₹1,400 on top.
    let state = ready();
    const cashBefore = state.players[NAVEEN]!.cash;
    state = step(state, { kind: "MORTGAGE", by: NAVEEN, tileIndexes: [5], atMs: 0 });
    expect(refusal(state, { kind: "SELL", by: NAVEEN, tileIndex: 5, what: "property", atMs: 0 })).not.toBe("OK");
    expect(state.players[NAVEEN]!.cash - cashBefore).toBeLessThan(state.board.tiles[5]!.kind === "property" ? 2_000 : Infinity);
  });
});

describe("OQ-20 item 2 — a deed returning to the bank keeps its mortgage", () => {
  it("queues the lot mortgaged, and the auction winner inherits it", () => {
    let state = grant(newMatch({ players: [
      { id: NAVEEN, name: "Naveen", colour: "gold" },
      { id: PRIYA, name: "Priya", colour: "blue" },
      { id: ARUN, name: "Arun", colour: "green" },
    ] }), NAVEEN, [5]);
    state.tiles[5]!.mortgaged = true;
    state = setCash(state, NAVEEN, 10);
    // A tax Naveen cannot pay opens a debt to the bank, and he declares.
    state.debts.push({ id: "debt-1", debtorId: NAVEEN, creditorId: "bank", amount: 500, createdRound: 1, payTo: "fine" });
    state.turn = { ...state.turn, stage: "raiseCash" };
    state = step(state, at("DECLARE_BANKRUPTCY", NAVEEN));

    expect(state.tiles[5]).toMatchObject({ ownerId: null, mortgaged: true });
    expect(state.bank.pendingAuctions).toEqual([{ tileIndex: 5, fromRound: 2 }]);
    expect(checkInvariants(state)).toEqual([]);
  });

  it("the auction winner inherits the mortgage, and the redeem cost with it", () => {
    let state = newMatch({ players: [
      { id: NAVEEN, name: "Naveen", colour: "gold" },
      { id: PRIYA, name: "Priya", colour: "blue" },
      { id: ARUN, name: "Arun", colour: "green" },
    ] });
    state.tiles[2]!.mortgaged = true; // Bay Road, held by the bank and still mortgaged
    state = rollAs(state, NAVEEN, [1, 1]);
    state = step(state, { kind: "PASS_BUY", by: NAVEEN, tileIndex: 2, atMs: 0 });
    state = step(state, { kind: "BID", by: PRIYA, amount: 1_400, atMs: 0 });
    state = step(state, { kind: "TIMER_EXPIRED", scope: "auction", atMs: 20_000 });

    expect(state.tiles[2]).toMatchObject({ ownerId: PRIYA, mortgaged: true });
    expect(redeemCost(state, 2)).toBeGreaterThan(0);
    expect(checkInvariants(state)).toEqual([]);
  });

  it("a board with auctions off returns the deed to the bank still mortgaged (edge case #43)", () => {
    const base = newMatch();
    let state = {
      ...base,
      rules: { ...base.rules, auction: { ...base.rules.auction, enabled: false } },
    } as MatchState;
    state = grant(state, NAVEEN, [5]);
    state.tiles[5]!.mortgaged = true;
    state = setCash(state, NAVEEN, 10);
    state.debts.push({ id: "debt-1", debtorId: NAVEEN, creditorId: "bank", amount: 500, createdRound: 1, payTo: "fine" });
    state.turn = { ...state.turn, stage: "raiseCash" };
    state = step(state, at("DECLARE_BANKRUPTCY", NAVEEN));

    expect(state.tiles[5]).toMatchObject({ ownerId: null, mortgaged: true });
    expect(state.bank.pendingAuctions).toEqual([]);
    expect(checkInvariants(state)).toEqual([]);
  });
});

describe("OQ-20 item 1 — the sell route stops counting a tile it refuses to sell", () => {
  it("drops a mortgaged tile out of the raise-cash sell headroom", () => {
    let state = rollAs(grant(newMatch(), NAVEEN, [3, 5]), NAVEEN, [1, 2]);
    const before = raiseCashHeadroom(state, NAVEEN);
    state = step(state, { kind: "MORTGAGE", by: NAVEEN, tileIndexes: [5], atMs: 0 });
    const after = raiseCashHeadroom(state, NAVEEN);

    // Mount Road can no longer be sold, so it raises nothing more on either route: its cash was
    // already drawn when it was mortgaged. Overstating this is what a player reads before
    // declaring bankruptcy (rulebook §16, edge case #6).
    expect(after.sell).toBeLessThan(before.sell);
    expect(refusal(state, { kind: "SELL", by: NAVEEN, tileIndex: 5, what: "property", atMs: 0 })).toBe("E_TILE_MORTGAGED");
  });

  it("still counts an unmortgaged tile on both routes", () => {
    const state = rollAs(grant(newMatch(), NAVEEN, [3, 5]), NAVEEN, [1, 2]);
    const headroom = raiseCashHeadroom(state, NAVEEN);
    expect(headroom.mortgage).toBeGreaterThan(0);
    expect(headroom.sell).toBeGreaterThan(0);
  });
});

describe("OQ-21 item 1 — a Tax office charges its tax, then draws from its deck", () => {
  function taxTile(state: MatchState): MatchState {
    const next = withDeck(state, { id: "r-bonus", money: { direction: "bankPaysYou", amount: 300, basis: "flat" } });
    next.board.tiles[4] = {
      kind: "card",
      name: "Tax office",
      cardType: "tax",
      deckId: "d-chance",
      tax: { mode: "flat", flatAmount: 500, percent: 0, percentOf: "cash" },
    };
    return next;
  }

  it("does both, in that order", () => {
    const state = rollAs(taxTile(newMatch()), NAVEEN, [1, 3]);
    const kinds = state.log.map((event) => event.kind);
    expect(kinds.indexOf("taxCharged")).toBeLessThan(kinds.indexOf("cardDrawn"));
    expect(lastEvent(state, "cardDrawn")).toMatchObject({ ruleId: "r-bonus", applied: true });
    expect(state.players[NAVEEN]!.cash).toBe(10_000 - 500 + 300);
  });

  it("still draws when the tax could not be paid, and keeps the turn in raiseCash", () => {
    // The audit found the draw was dropped for good when a tax opened a debt: nothing ever
    // re-entered the card space. §2.3 draws 1 on landing, so the draw happens either way and the
    // debt keeps the turn where it is.
    const state = rollAs(taxTile(setCash(newMatch(), NAVEEN, 100)), NAVEEN, [1, 3]);
    expect(state.turn.stage).toBe("raiseCash");
    expect(eventsOf(state, "cardDrawn")).toHaveLength(1);
    expect(state.debts).toHaveLength(1);
  });

  it("a card MONEY block that opens its own debt also leaves the turn in raiseCash", () => {
    const state = withDeck(setCash(newMatch(), NAVEEN, 100), {
      money: { direction: "youPayBank", amount: 900, basis: "flat" },
    });
    const after = rollAs(state, NAVEEN, [1, 3]);
    expect(after.turn.stage).toBe("raiseCash");
    expect(after.debts).toHaveLength(1);
  });
});

describe("OQ-21 item 2 — the Free Rest house Card is its own effect and spends a use", () => {
  /** The rest house is tile 15; two dice cannot reach it from Start, so Naveen stands on 10. */
  function landOnRestHouse(state: MatchState): MatchState {
    const next = JSON.parse(JSON.stringify(state)) as MatchState;
    next.players[NAVEEN]!.position = 10;
    return rollAs(next, NAVEEN, [2, 3]);
  }

  it("exempts the stay and consumes one use", () => {
    const state = newMatch();
    state.players[NAVEEN]!.holdCards.push({
      id: "card-rest",
      effect: { kind: "freeRestHouse" },
      uses: 1,
      expires: "never",
      tradeable: true,
      grantedRound: 1,
    });
    const after = landOnRestHouse(state);
    expect(after.players[NAVEEN]!.skipTurns).toBe(0);
    expect(after.players[NAVEEN]!.holdCards).toEqual([]);
    expect(lastEvent(after, "cardUsed")).toMatchObject({ effect: "freeRestHouse" });
  });

  it("a skipTurn card no longer stands in for it", () => {
    const state = newMatch();
    state.players[NAVEEN]!.holdCards.push({
      id: "card-skip",
      effect: { kind: "skipTurn" },
      uses: 1,
      expires: "never",
      tradeable: true,
      grantedRound: 1,
    });
    const after = landOnRestHouse(state);
    expect(after.players[NAVEEN]!.skipTurns).toBe(1);
    expect(after.players[NAVEEN]!.holdCards).toHaveLength(1);
  });
});

describe("OQ-21 item 5 — a tile's own 'Pay to' wins over the board's fines setting", () => {
  /** The jail corner (8) charges ₹100 on a GET IN landing; Naveen reaches it with [3, 5]. */
  function landOnJail(state: MatchState, payTo: "bank" | "pot"): MatchState {
    const next = JSON.parse(JSON.stringify(state)) as MatchState;
    const jail = next.board.tiles[8]!;
    if (jail.kind === "corner") {
      next.board.tiles[8] = { ...jail, getIn: { amount: 100, payTo } };
    }
    return rollAs(next, NAVEEN, [3, 5]);
  }

  it("pays the pot when the tile says pot, even on a bank board", () => {
    const after = landOnJail(newMatch(), "pot");
    expect(after.bank.finePot).toBe(100);
    expect(after.bank.ledger.absorbed).toBe(0);
  });

  it("pays the bank when the tile says bank, even on a pot board", () => {
    const after = landOnJail(potBoard(), "bank");
    expect(after.bank.finePot).toBe(0);
    expect(after.bank.ledger.absorbed).toBe(100);
  });
});

describe("OQ-22 item 1 — the pass-Go flag permits the bonus; the jump must still reach Start", () => {
  it("pays on a jump that lands on the start tile", () => {
    expect(teleport(5, 0, true)).toEqual({ to: 0, passedStart: true });
  });

  it("pays on a jump that wraps forward past the start tile", () => {
    expect(teleport(12, 3, true)).toEqual({ to: 3, passedStart: true });
  });

  it("pays nothing on a forward jump that never reaches it, flag or no flag", () => {
    expect(teleport(2, 5, true)).toEqual({ to: 5, passedStart: false });
    expect(teleport(2, 5, false)).toEqual({ to: 5, passedStart: false });
  });

  it("pays nothing without the flag, even landing on Start (edge case #14)", () => {
    expect(teleport(5, 0, false)).toEqual({ to: 0, passedStart: false });
  });

  it("pays nothing for a jump that does not move, even from Start itself", () => {
    // Otherwise a "To tile → Start" rule drawn while standing on Start pays the salary for
    // nothing, every time it comes up.
    expect(teleport(0, 0, true)).toEqual({ to: 0, passedStart: false });
    expect(teleport(7, 7, true)).toEqual({ to: 7, passedStart: false });
  });

  it("in play: a card that jumps forward a few tiles pays no start bonus", () => {
    const state = withDeck(newMatch(), {
      move: { direction: "toTile", count: 0, targetTileIndex: 7, collectPassBonus: true },
    });
    const after = rollAs(state, NAVEEN, [1, 3]);
    expect(after.players[NAVEEN]!.position).toBe(7);
    expect(eventsOf(after, "startBonus")).toHaveLength(0);
  });
});

describe("OQ-22 item 2 — a card's 'You pay bank' is a fine", () => {
  it("reaches the pot on a board that sends fines there", () => {
    const state = withDeck(potBoard(), { money: { direction: "youPayBank", amount: 400, basis: "flat" } });
    const after = rollAs(state, NAVEEN, [1, 3]);
    expect(after.bank.finePot).toBe(400);
    expect(after.bank.ledger.absorbed).toBe(0);
    expect(checkInvariants(after)).toEqual([]);
  });

  it("still reaches the bank on a board that does not", () => {
    const state = withDeck(newMatch(), { money: { direction: "youPayBank", amount: 400, basis: "flat" } });
    const after = rollAs(state, NAVEEN, [1, 3]);
    expect(after.bank.finePot).toBe(0);
    expect(after.bank.ledger.absorbed).toBe(400);
  });

  it("money owed to another player is not a fine", () => {
    const state = withDeck(potBoard(), { money: { direction: "shareToAllPlayers", amount: 200, basis: "flat" } });
    const after = rollAs(state, NAVEEN, [1, 3]);
    expect(after.bank.finePot).toBe(0);
    expect(after.players[PRIYA]!.cash).toBe(10_200);
  });
});

describe("OQ-15 — the state-shape additions stand", () => {
  it("keeps the ledger, the token position and the non-hotel house ladder", () => {
    const state = newMatch();
    expect(state.bank.ledger).toEqual({ issued: 20_000, absorbed: 0 });
    expect(state.players[NAVEEN]!.position).toBe(0);
    // A hotel beside four houses is level, because a hotel leaves the house ladder.
    const built = grant(state, NAVEEN, PURPLE);
    built.tiles[1]!.hotel = true;
    for (const index of PURPLE.slice(1)) {
      built.tiles[index]!.houses = 4;
      built.bank.houses -= 4;
    }
    built.bank.hotels -= 1;
    expect(checkInvariants(built)).toEqual([]);
  });
});

describe("OQ-19 item 2 — 'Affects another player' still waits for a target action", () => {
  it("grants nothing and says why, until CHOOSE_TARGET lands", () => {
    const state = withDeck(newMatch(), {
      holdCard: { affects: "anotherPlayer", effect: { kind: "sendToJail", target: "choose" }, uses: 1, expires: "never", tradeable: false },
    });
    const after = rollAs(state, NAVEEN, [1, 3]);
    expect(lastEvent(after, "holdCardSkipped")).toMatchObject({ reason: "needsTarget" });
    expect(after.players[NAVEEN]!.holdCards).toEqual([]);
  });
});

describe("OQ-20 item 6 / OQ-19 item 2 — the effects that are still unplayable are refused, not ignored", () => {
  it("USE_CARD accepts only jailPass until C8 lands", () => {
    const state = newMatch();
    state.players[NAVEEN]!.holdCards.push({
      id: "card-waiver",
      effect: { kind: "rentWaiver" },
      uses: 1,
      expires: "never",
      tradeable: true,
      grantedRound: 1,
    });
    const rolled = rollAs(state, NAVEEN, [1, 2]);
    expect(refusal(rolled, { kind: "USE_CARD", by: NAVEEN, cardId: "card-waiver", atMs: 0 })).not.toBe("OK");
    expect(legalActions(rolled, NAVEEN)).not.toContain("USE_CARD");
  });
});
