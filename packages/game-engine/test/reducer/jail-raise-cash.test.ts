// OQ-36 (answered, option 3): §12 blocks build, sell, mortgage and trade while a player is held,
// and §16 gives mortgage, sell and trade as the three routes out of a debt. The overlap is total, so
// a held debtor had no route at all and only DECLARE_BANKRUPTCY remained — which makes §12's own
// "Max rounds held 3 — release is automatic, paid or not" unreachable for them.
//
// The answer: the two routes that only involve the bank are exempt from the jail block while a debt
// is open. Trade stays blocked, because it needs a counterparty and that is what §12 protects
// against.

import { describe, expect, it } from "vitest";

import { checkInvariants } from "../../src/invariants";
import { legalActions } from "../../src/reducer/index";
import type { Bundle, MatchState } from "../../src/state";
import { at, grant, NAVEEN, newMatch, PRIYA, refusal, rollAs, setCash, step } from "../support/match";

const PURPLE = [1, 2, 3, 13, 14];
const SKY = [5, 6, 9, 10, 11];
const UTILITY = 7;
const nothing: Bundle = { cash: 0, tileIndexes: [], holdCardIds: [] };

/**
 * Priya lands on Naveen's built-up Bay Road owing a rent she cannot pay, and is then held in jail.
 * She owns the whole blue group, so she has something to mortgage and something to sell.
 */
function heldDebtor(): MatchState {
  let state = grant(newMatch(), NAVEEN, PURPLE);
  for (const index of PURPLE) {
    state.tiles[index]!.houses = 1;
    state.bank.houses -= 1;
  }
  // Two houses on each of her own group, so a sale comes off the top of the ladder, plus an
  // unbuilt utility to mortgage (a tile with buildings cannot be mortgaged).
  state = grant(state, PRIYA, [...SKY, UTILITY]);
  for (const index of SKY) {
    state.tiles[index]!.houses = 2;
    state.bank.houses -= 2;
  }
  state = setCash(state, PRIYA, 20);

  state = step(rollAs(state, NAVEEN, [1, 2]), at("END_TURN", NAVEEN));
  state = rollAs(state, PRIYA, [1, 1]); // a rent of hers that ₹20 cannot cover
  expect(state.debts).toHaveLength(1);
  expect(state.turn.stage).toBe("raiseCash");

  // Held while the debt stands. The route she is left with is what OQ-36 settles.
  state.players[PRIYA]!.jail = { in: true, roundsHeld: 0 };
  return state;
}

describe("a debtor who is held in jail (OQ-36 option 3)", () => {
  it("may sell a building, because the sale is with the bank", () => {
    const state = heldDebtor();
    const after = step(state, { kind: "SELL", by: PRIYA, what: "house", tileIndex: 6, atMs: 0 });

    expect(after.tiles[6]!.houses).toBe(1);
    expect(after.players[PRIYA]!.cash).toBeGreaterThan(20);
    expect(checkInvariants(after)).toEqual([]);
  });

  it("may mortgage a tile, for the same reason", () => {
    const state = heldDebtor();
    const after = step(state, { kind: "MORTGAGE", by: PRIYA, tileIndexes: [UTILITY], atMs: 0 });

    expect(after.tiles[UTILITY]!.mortgaged).toBe(true);
    expect(after.players[PRIYA]!.cash).toBeGreaterThan(20);
    expect(checkInvariants(after)).toEqual([]);
  });

  it("loses the exemption again the moment the debt is paid, still held", () => {
    let state = heldDebtor();
    state = step(state, { kind: "MORTGAGE", by: PRIYA, tileIndexes: [UTILITY], atMs: 0 });
    state = step(state, { kind: "SELL", by: PRIYA, what: "house", tileIndex: 6, atMs: 0 });
    const debtId = state.debts[0]!.id;
    state = step(state, { kind: "PAY_DEBT", by: PRIYA, debtId, atMs: 0 });

    expect(state.debts).toEqual([]);
    expect(state.players[PRIYA]!.jail.in).toBe(true);
    // Nothing is owed now, so §12 applies again in full.
    expect(refusal(state, { kind: "SELL", by: PRIYA, what: "house", tileIndex: 9, atMs: 0 })).toBe("E_JAIL_BLOCKED");
    expect(refusal(state, { kind: "MORTGAGE", by: PRIYA, tileIndexes: [10], atMs: 0 })).toBe("E_JAIL_BLOCKED");
  });

  it("may not offer a trade — that route needs a counterparty", () => {
    const state = heldDebtor();
    const offer = {
      kind: "OFFER_TRADE" as const,
      by: PRIYA,
      to: NAVEEN,
      give: { ...nothing, tileIndexes: [UTILITY] },
      get: { ...nothing, cash: 500 },
      atMs: 0,
    };
    expect(refusal(state, offer)).toBe("E_JAIL_BLOCKED");
  });

  it("may not accept a trade either (BUG-001 keeps that guard)", () => {
    let state = grant(newMatch(), NAVEEN, [3]);
    state = step(rollAs(state, NAVEEN, [1, 2]), {
      kind: "OFFER_TRADE",
      by: NAVEEN,
      to: PRIYA,
      give: { ...nothing, tileIndexes: [3] },
      get: { ...nothing, cash: 900 },
      atMs: 0,
    });
    const offerId = state.offers[0]!.id;
    state.players[PRIYA]!.jail = { in: true, roundsHeld: 0 };
    // Even with a debt open, the exemption does not reach a trade.
    state.debts.push({ id: "d-1", debtorId: PRIYA, creditorId: "bank", amount: 50, createdRound: 1, payTo: "bank" });

    expect(refusal(state, { kind: "RESPOND_TRADE", by: PRIYA, offerId, accept: true, atMs: 0 })).toBe("E_JAIL_BLOCKED");
  });

  it("still may not sell or mortgage when no debt is open — the exemption is debt-scoped", () => {
    // Naveen owns tile 3 so his [1, 2] lands on his own tile and the turn can simply end.
    let state = grant(grant(newMatch(), PRIYA, [...SKY, UTILITY]), NAVEEN, [3]);
    for (const index of SKY) {
      state.tiles[index]!.houses = 2;
      state.bank.houses -= 2;
    }
    state = rollAs(state, NAVEEN, [1, 2]);
    state = step(state, at("END_TURN", NAVEEN));
    state = rollAs(state, PRIYA, [2, 3]);
    state.players[PRIYA]!.jail = { in: true, roundsHeld: 0 };
    expect(state.debts).toEqual([]);

    expect(refusal(state, { kind: "SELL", by: PRIYA, what: "house", tileIndex: 6, atMs: 0 })).toBe("E_JAIL_BLOCKED");
    expect(refusal(state, { kind: "MORTGAGE", by: PRIYA, tileIndexes: [UTILITY], atMs: 0 })).toBe("E_JAIL_BLOCKED");
  });

  it("may still not build while held, debt or no debt — §12 blocks building outright", () => {
    // BUILD is not a §16 route, so nothing exempts it. It is also already blocked by an open debt.
    const state = heldDebtor();
    expect(refusal(state, { kind: "BUILD", by: PRIYA, what: "house", tileIndex: 6, atMs: 0 })).not.toBe("OK");
  });

  it("is exempt only where the jail corner blocks actions at all", () => {
    const state = heldDebtor();
    const corner = state.board.tiles.findIndex((tile) => tile.kind === "corner" && tile.cornerType === "jail");
    expect(corner).toBeGreaterThanOrEqual(0);
    // With the toggle off (§2.4 COMMON is a board setting), nothing was ever blocked to exempt.
    const open = JSON.parse(JSON.stringify(state)) as MatchState;
    const tile = open.board.tiles[corner]!;
    if (tile.kind === "corner") {
      tile.blockActionsWhileHeld = false;
    }
    expect(refusal(open, { kind: "SELL", by: PRIYA, what: "house", tileIndex: 6, atMs: 0 })).toBe("OK");
  });

  it("the gap OQ-20 item 1 leaves: mortgaged tiles and no buildings means still no route", () => {
    // Recorded rather than fixed. Selling a mortgaged tile is refused until it is redeemed (OQ-20
    // item 1, answered — it was the money leak), so a held debtor whose only assets are mortgaged
    // deeds has nothing left but DECLARE_BANKRUPTCY even under option 3.
    const state = heldDebtor();
    for (const index of [...SKY, UTILITY]) {
      state.bank.houses += state.tiles[index]!.houses;
      state.tiles[index]!.houses = 0;
      state.tiles[index]!.mortgaged = true;
    }

    expect(refusal(state, { kind: "SELL", by: PRIYA, what: "property", tileIndex: UTILITY, atMs: 0 })).toBe("E_TILE_MORTGAGED");
    expect(refusal(state, { kind: "MORTGAGE", by: PRIYA, tileIndexes: [UTILITY], atMs: 0 })).not.toBe("OK");
    expect(refusal(state, at("DECLARE_BANKRUPTCY", PRIYA))).toBe("OK");
  });
});

describe("what 1d's raise-cash sheet is told (OQ-36)", () => {
  it("offers the two bank routes and not the trade route", () => {
    // `1d` reads legalActions rather than deciding for itself which buttons are live, so this is the
    // engine-side guarantee the sheet is built on: a held debtor sees Mortgage and Sell, never Trade.
    // Set equality rather than has(), so what the sheet must *not* offer is pinned too: no BUILD,
    // no REDEEM, no ROLL or END_TURN out of raise cash, and no PAY_DEBT while ₹20 cannot cover it.
    expect(legalActions(heldDebtor(), PRIYA).slice().sort()).toEqual(["DECLARE_BANKRUPTCY", "MORTGAGE", "SELL"]);
  });

  it("offers all three to the same debtor when they are not held", () => {
    const free = heldDebtor();
    free.players[PRIYA]!.jail = { in: false, roundsHeld: 0 };
    expect(legalActions(free, PRIYA).slice().sort()).toEqual(["DECLARE_BANKRUPTCY", "MORTGAGE", "OFFER_TRADE", "SELL"]);
  });
});

// OQ-37 (answered, option 2): §12's and §2.4's blocked list — "build, sell, mortgage and trade" — is
// exhaustive, and REDEEM is not on it. Redeeming is a payment to the bank, the same shape as bail,
// which §12 explicitly allows. OQ-36 made the asymmetry visible (a held player could mortgage while
// owing but never un-mortgage) rather than creating it: the restriction was never traced to §12.
describe("REDEEM while held (OQ-37 option 2)", () => {
  /** Priya is held, owes nothing, and holds a mortgaged deed plus the cash to clear it. */
  function heldWithMortgage(): MatchState {
    let state = grant(grant(newMatch(), PRIYA, [...SKY, UTILITY]), NAVEEN, [3]);
    state.tiles[UTILITY]!.mortgaged = true;
    state = setCash(state, PRIYA, 10_000);

    state = step(rollAs(state, NAVEEN, [1, 2]), at("END_TURN", NAVEEN));
    // Her turn opens at jailChoice; rolling without a releasing double leaves her held at postRoll,
    // which is where §15 step 6's side actions live.
    state.players[PRIYA]!.jail = { in: true, roundsHeld: 0 };
    state.turn.stage = "jailChoice";
    state = rollAs(state, PRIYA, [2, 3]);

    expect(state.players[PRIYA]!.jail.in).toBe(true);
    expect(state.turn.stage).toBe("postRoll");
    expect(state.debts).toEqual([]);
    return state;
  }

  it("is allowed, and the deed comes out of mortgage", () => {
    let state = heldWithMortgage();
    const cashBefore = state.players[PRIYA]!.cash;
    state = step(state, { kind: "REDEEM", by: PRIYA, tileIndexes: [UTILITY], atMs: 0 });

    expect(state.tiles[UTILITY]!.mortgaged).toBe(false);
    expect(state.players[PRIYA]!.cash).toBeLessThan(cashBefore);
    expect(state.players[PRIYA]!.jail.in).toBe(true);
    expect(checkInvariants(state)).toEqual([]);
  });

  it("appears in the actions a held player is offered", () => {
    expect(legalActions(heldWithMortgage(), PRIYA)).toContain("REDEEM");
  });

  it("but the three §12 actions stay blocked in the same state", () => {
    const state = heldWithMortgage();
    expect(refusal(state, { kind: "SELL", by: PRIYA, what: "house", tileIndex: 6, atMs: 0 })).toBe("E_JAIL_BLOCKED");
    expect(refusal(state, { kind: "MORTGAGE", by: PRIYA, tileIndexes: [9], atMs: 0 })).toBe("E_JAIL_BLOCKED");
    expect(refusal(state, { kind: "BUILD", by: PRIYA, what: "house", tileIndex: 6, atMs: 0 })).toBe("E_JAIL_BLOCKED");
  });

  it("is still refused while a debt is open — that block is not a jail rule", () => {
    // noOpenDebt is unchanged: a debtor raises cash, they do not spend it (rulebook §16).
    const state = heldWithMortgage();
    state.debts.push({ id: "d-1", debtorId: PRIYA, creditorId: "bank", amount: 50, createdRound: 1, payTo: "bank" });
    expect(refusal(state, { kind: "REDEEM", by: PRIYA, tileIndexes: [UTILITY], atMs: 0 })).toBe("E_DEBT_BLOCKING");
  });
});
