import { describe, expect, it } from "vitest";

import type { Action } from "../../src/actions";
import { checkInvariants } from "../../src/invariants";
import { legalActions } from "../../src/reducer/index";
import { raiseCashHeadroom, redeemCost } from "../../src/reducer/property";
import type { MatchState } from "../../src/state";
import { at, grant, lastEvent, NAVEEN, newMatch, PRIYA, refusal, rollAs, setCash, step } from "../support/match";

const PURPLE = [1, 2, 3, 13, 14];

/** Naveen at postRoll on his own tile, owning the whole purple set. */
function withPurpleSet(): MatchState {
  let state = grant(newMatch(), NAVEEN, PURPLE);
  return rollAs(state, NAVEEN, [1, 2]); // → 3, own tile → postRoll
}

describe("BUY / PASS_BUY (rulebook §10 trigger, edge cases #1, #2)", () => {
  it("buying pays the bank, transfers the deed and resumes the turn", () => {
    let state = rollAs(newMatch(), NAVEEN, [1, 1]); // Bay Road, ₹1,400
    state = step(state, { kind: "BUY", by: NAVEEN, tileIndex: 2, atMs: 0 });

    expect(state.tiles[2]!.ownerId).toBe(NAVEEN);
    expect(state.players[NAVEEN]!.cash).toBe(8600);
    expect(state.bank.ledger.absorbed).toBe(1400);
    expect(state.turn.stage).toBe("postRoll");
    expect(lastEvent(state, "bought")).toMatchObject({ tileIndex: 2, cost: 1400 });
  });

  it("edge case #1: cash below cost disables Buy; Pass remains; no debt is created", () => {
    let state = setCash(newMatch(), NAVEEN, 1000);
    state = rollAs(state, NAVEEN, [1, 1]);

    expect(lastEvent(state, "propertyCost")).toMatchObject({ canAfford: false });
    expect(refusal(state, { kind: "BUY", by: NAVEEN, tileIndex: 2, atMs: 0 })).toBe("E_INSUFFICIENT_CASH");
    expect(refusal(state, { kind: "PASS_BUY", by: NAVEEN, tileIndex: 2, atMs: 0 })).toBe("OK");
    expect(state.debts).toEqual([]);
  });

  it("declining with auctions on opens an auction with the cost as the minimum bid", () => {
    let state = rollAs(newMatch(), NAVEEN, [1, 1]);
    state = step(state, { kind: "PASS_BUY", by: NAVEEN, tileIndex: 2, atMs: 0 });

    expect(state.auction).toMatchObject({ tileIndex: 2, minBid: 1400, leadingBid: 0 });
    expect(state.tiles[2]!.underAuction).toBe(true);
    expect(state.turn.stage).toBe("auction");
  });

  it("edge case #2: declining with auctions off leaves the tile with the bank and continues", () => {
    let state = newMatch({ rules: { ...newMatch().rules, auction: { enabled: false, startingPrice: 100, bidTimerSeconds: 20 } } });
    state = rollAs(state, NAVEEN, [1, 1]);
    state = step(state, { kind: "PASS_BUY", by: NAVEEN, tileIndex: 2, atMs: 0 });

    expect(state.auction).toBeNull();
    expect(state.tiles[2]!.ownerId).toBeNull();
    expect(state.turn.stage).toBe("postRoll");
    expect(lastEvent(state, "purchasePassed")).toMatchObject({ auctionOpens: false });
  });

  it("the decision belongs to the tile the player stands on", () => {
    const state = rollAs(newMatch(), NAVEEN, [1, 1]);
    expect(refusal(state, { kind: "BUY", by: NAVEEN, tileIndex: 3, atMs: 0 })).toBe("E_ACTION_ILLEGAL");
    expect(refusal(state, { kind: "BUY", by: PRIYA, tileIndex: 2, atMs: 0 })).toBe("E_NOT_YOUR_TURN");
  });
});

describe("BUILD (rulebook §8)", () => {
  const house = (tileIndex: number): Action => ({ kind: "BUILD", by: NAVEEN, tileIndex, what: "house", atMs: 0 });
  const hotel = (tileIndex: number): Action => ({ kind: "BUILD", by: NAVEEN, tileIndex, what: "hotel", atMs: 0 });

  it("requires the colour set (E_BUILD_NEEDS_SET)", () => {
    let state = grant(newMatch(), NAVEEN, [1, 2]); // 2 of 5, threshold 3
    state = rollAs(state, NAVEEN, [1, 1]); // → 2, own → postRoll
    expect(refusal(state, house(1))).toBe("E_BUILD_NEEDS_SET");
  });

  it("builds a house for the tile's house cost, taking one from the bank", () => {
    let state = withPurpleSet();
    state = step(state, house(1)); // Marina Drive: house cost 21 % of ₹1,400 = ₹295

    expect(state.tiles[1]!.houses).toBe(1);
    expect(state.bank.houses).toBe(31);
    expect(state.players[NAVEEN]!.cash).toBe(10000 - 295);
    expect(lastEvent(state, "built")).toMatchObject({ what: "house", cost: 295, houses: 1 });
  });

  it("edge case #17: even build rejects a second house while another tile of the group has none", () => {
    let state = withPurpleSet();
    state = step(state, house(1));
    expect(refusal(state, house(1))).toBe("E_BUILD_UNEVEN");
    expect(refusal(state, house(2))).toBe("OK");
  });

  it("with Build evenly off, houses may stack on one tile", () => {
    let state = withPurpleSet();
    state.rules.sets.buildEvenly = false;
    state = step(state, house(1));
    expect(refusal(state, house(1))).toBe("OK");
  });

  it("edge case #16: a hotel needs four houses first (E_BUILD_HOUSE_LIMIT)", () => {
    let state = withPurpleSet();
    state.rules.sets.buildEvenly = false;
    for (let i = 0; i < 3; i++) {
      state = step(state, house(1));
    }
    expect(refusal(state, hotel(1))).toBe("E_BUILD_HOUSE_LIMIT");
    state = step(state, house(1));
    expect(refusal(state, house(1))).toBe("E_BUILD_HOUSE_LIMIT");
    expect(refusal(state, hotel(1))).toBe("OK");
  });

  it("building a hotel returns the four houses to the bank and pays the hotel cost (HOTEL BUILT)", () => {
    let state = withPurpleSet();
    state.rules.sets.buildEvenly = false;
    for (let i = 0; i < 4; i++) {
      state = step(state, house(1));
    }
    const cashBefore = state.players[NAVEEN]!.cash;
    state = step(state, hotel(1));

    expect(state.tiles[1]).toMatchObject({ houses: 0, hotel: true });
    expect(state.bank.houses).toBe(32);
    expect(state.bank.hotels).toBe(11);
    expect(state.players[NAVEEN]!.cash).toBe(cashBefore - 755); // 54 % of ₹1,400
    expect(lastEvent(state, "built")).toMatchObject({ what: "hotel", cost: 755, hotel: true });
  });

  it("edge case #15: supply exhaustion is atomic — nothing is built and E_SUPPLY_EXHAUSTED is returned", () => {
    let state = withPurpleSet();
    state.rules.sets.buildEvenly = false;
    // All 32 houses stand on the board: Priya's five sky tiles hold 20, Naveen's purple tiles 12.
    for (const index of [5, 6, 9, 10, 11]) {
      state.tiles[index]!.ownerId = PRIYA;
      state.tiles[index]!.houses = 4;
    }
    state.tiles[1]!.houses = 4;
    state.tiles[2]!.houses = 4;
    state.tiles[3]!.houses = 4;
    state.bank.houses = 0;

    expect(refusal(state, house(13))).toBe("E_SUPPLY_EXHAUSTED");
    expect(state.tiles[13]!.houses).toBe(0);
    expect(refusal(state, hotel(1))).toBe("OK"); // a hotel needs a hotel from the bank, not a house
  });

  it("cannot build on a mortgaged tile", () => {
    let state = withPurpleSet();
    state.tiles[1]!.mortgaged = true;
    expect(refusal(state, house(1))).toBe("E_TILE_MORTGAGED");
  });

  it("needs the cash (E_INSUFFICIENT_CASH), never a debt", () => {
    let state = withPurpleSet();
    state = setCash(state, NAVEEN, 100);
    expect(refusal(state, house(1))).toBe("E_INSUFFICIENT_CASH");
  });

  it("is a side action: allowed before or after the roll, never mid-decision", () => {
    let state = grant(newMatch(), NAVEEN, PURPLE);
    expect(refusal(state, house(1))).toBe("OK"); // preRoll
    state = rollAs(state, NAVEEN, [2, 3]); // → 5, unowned → decision
    expect(refusal(state, house(1))).toBe("E_ACTION_ILLEGAL");
  });
});

describe("even build and hotels (rulebook §4, §8; a legal action never breaks evenBuild)", () => {
  /** Naveen holds all five purple tiles with `houses` on each, and the bank's stock matches. */
  function purpleAt(houses: number[]): MatchState {
    let state = grant(newMatch(), NAVEEN, PURPLE);
    PURPLE.forEach((tileIndex, position) => {
      state.tiles[tileIndex]!.houses = houses[position] ?? 0;
      state.bank.houses -= houses[position] ?? 0;
    });
    return rollAs(state, NAVEEN, [1, 2]);
  }

  it("a hotel may be built once the group is level: the tile leaves the house ladder", () => {
    const state = step(purpleAt([4, 4, 4, 4, 4]), { kind: "BUILD", by: NAVEEN, tileIndex: 1, what: "hotel", atMs: 0 });
    expect(state.tiles[1]).toMatchObject({ hotel: true, houses: 0 });
    expect(checkInvariants(state)).toEqual([]);
  });

  it("a hotel built over a 4/3/3/3/3 group leaves the ladder level, not broken", () => {
    // The audit's repro: with a hotel read as a sixth level this left evenBuild reporting
    // "spans 3–5". The four houses go back to the bank, so the ladder becomes 3/3/3/3.
    const state = step(purpleAt([4, 3, 3, 3, 3]), { kind: "BUILD", by: NAVEEN, tileIndex: 1, what: "hotel", atMs: 0 });
    expect(checkInvariants(state)).toEqual([]);
    expect(PURPLE.slice(1).map((index) => state.tiles[index]!.houses)).toEqual([3, 3, 3, 3]);
  });

  it("selling a hotel back into a group that still holds houses is refused", () => {
    // hotel / 4 / 4 / 4 / 4: the hotel tile would rejoin the ladder at 0 houses (§8).
    let state = step(purpleAt([4, 4, 4, 4, 4]), { kind: "BUILD", by: NAVEEN, tileIndex: 1, what: "hotel", atMs: 0 });
    expect(refusal(state, { kind: "SELL", by: NAVEEN, tileIndex: 1, what: "hotel", atMs: 0 })).toBe("E_BUILD_UNEVEN");
  });

  it("a group of hotels can always be sold down — no deadlock in raise cash", () => {
    let state = purpleAt([4, 4, 4, 4, 4]);
    for (const tileIndex of PURPLE) {
      state = step(state, { kind: "BUILD", by: NAVEEN, tileIndex, what: "hotel", atMs: 0 });
    }
    for (const tileIndex of PURPLE) {
      state = step(state, { kind: "SELL", by: NAVEEN, tileIndex, what: "hotel", atMs: 0 });
      expect(checkInvariants(state)).toEqual([]);
    }
    expect(state.tiles[1]).toMatchObject({ hotel: false, houses: 0 });
    expect(state.bank.hotels).toBe(12);
  });
});

describe("SELL (rulebook §8, §16)", () => {
  it("selling a house pays 50 % of the house cost and returns it to the bank", () => {
    let state = withPurpleSet();
    state = step(state, { kind: "BUILD", by: NAVEEN, tileIndex: 1, what: "house", atMs: 0 });
    const cashBefore = state.players[NAVEEN]!.cash;
    state = step(state, { kind: "SELL", by: NAVEEN, tileIndex: 1, what: "house", atMs: 0 });

    expect(state.tiles[1]!.houses).toBe(0);
    expect(state.bank.houses).toBe(32);
    expect(state.players[NAVEEN]!.cash).toBe(cashBefore + 150); // 50 % of ₹295 → ₹150 (nearest 5)
  });

  it("selling a hotel returns it to the supply without re-placing houses", () => {
    let state = withPurpleSet();
    state.rules.sets.buildEvenly = false;
    for (let i = 0; i < 4; i++) {
      state = step(state, { kind: "BUILD", by: NAVEEN, tileIndex: 1, what: "house", atMs: 0 });
    }
    state = step(state, { kind: "BUILD", by: NAVEEN, tileIndex: 1, what: "hotel", atMs: 0 });
    state = step(state, { kind: "SELL", by: NAVEEN, tileIndex: 1, what: "hotel", atMs: 0 });

    expect(state.tiles[1]).toMatchObject({ houses: 0, hotel: false });
    expect(state.bank.hotels).toBe(12);
    expect(lastEvent(state, "sold")).toMatchObject({ what: "hotel", proceeds: 380 }); // 50 % of ₹755 → 377.5 → 380
  });

  it("selling a property pays 70 % of cost and returns the deed to the bank", () => {
    let state = withPurpleSet();
    state = step(state, { kind: "SELL", by: NAVEEN, tileIndex: 3, what: "property", atMs: 0 }); // Fort Street ₹1,200

    expect(state.tiles[3]!.ownerId).toBeNull();
    expect(lastEvent(state, "sold")).toMatchObject({ what: "property", proceeds: 840 });
  });

  it("a property with buildings cannot be sold whole; even-build mirrors on selling", () => {
    let state = withPurpleSet();
    state = step(state, { kind: "BUILD", by: NAVEEN, tileIndex: 1, what: "house", atMs: 0 });
    expect(refusal(state, { kind: "SELL", by: NAVEEN, tileIndex: 1, what: "property", atMs: 0 })).toBe("E_MORTGAGE_HAS_BUILDINGS");

    // Levels 2/1/1/1/1 across the group: selling from a 1-house tile would open a gap of two.
    state.tiles[1]!.houses = 2;
    for (const index of [2, 3, 13, 14]) {
      state.tiles[index]!.houses = 1;
    }
    state.bank.houses = 32 - 6;
    expect(refusal(state, { kind: "SELL", by: NAVEEN, tileIndex: 2, what: "house", atMs: 0 })).toBe("E_BUILD_UNEVEN");
    expect(refusal(state, { kind: "SELL", by: NAVEEN, tileIndex: 1, what: "house", atMs: 0 })).toBe("OK");
  });
});

describe("MORTGAGE / REDEEM (rulebook §9)", () => {
  it("mortgaging pays the mortgage value; the tile stops collecting rent and counting toward the set", () => {
    let state = withPurpleSet();
    state = step(state, { kind: "MORTGAGE", by: NAVEEN, tileIndexes: [1, 2, 3], atMs: 0 });

    expect(state.tiles[1]!.mortgaged).toBe(true);
    expect(state.players[NAVEEN]!.cash).toBe(10000 + 700 + 700 + 600);
    expect(lastEvent(state, "mortgaged")).toMatchObject({ proceeds: 2000 });
    // Three of five mortgaged leaves two counting: below the threshold of 3, so no building.
    expect(legalActions(state, NAVEEN)).not.toContain("BUILD");
  });

  it("edge case #18: a tile with buildings cannot be mortgaged", () => {
    let state = withPurpleSet();
    state = step(state, { kind: "BUILD", by: NAVEEN, tileIndex: 1, what: "house", atMs: 0 });
    expect(refusal(state, { kind: "MORTGAGE", by: NAVEEN, tileIndexes: [1], atMs: 0 })).toBe("E_MORTGAGE_HAS_BUILDINGS");
  });

  it("redeem costs the mortgage plus 10 % interest — Marina Drive ₹700 → ₹770", () => {
    let state = withPurpleSet();
    state = step(state, { kind: "MORTGAGE", by: NAVEEN, tileIndexes: [1], atMs: 0 });
    expect(redeemCost(state, 1)).toBe(770);
    const cashBefore = state.players[NAVEEN]!.cash;
    state = step(state, { kind: "REDEEM", by: NAVEEN, tileIndexes: [1], atMs: 0 });

    expect(state.tiles[1]!.mortgaged).toBe(false);
    expect(state.players[NAVEEN]!.cash).toBe(cashBefore - 770);
  });

  it("the 1q/1r worked example: two tiles mortgage for ₹1,250, redeem for ₹1,375", () => {
    let state = withPurpleSet();
    state.board.tiles[3] = { ...(state.board.tiles[3] as Extract<MatchState["board"]["tiles"][number], { kind: "property" }>), cost: 1100 }; // mortgage 550
    state = step(state, { kind: "MORTGAGE", by: NAVEEN, tileIndexes: [1, 3], atMs: 0 });
    expect(lastEvent(state, "mortgaged")).toMatchObject({ proceeds: 1250 });
    expect(redeemCost(state, 1) + redeemCost(state, 3)).toBe(1375);
  });

  it("edge case #20: redeeming with insufficient cash is refused; no debt is created", () => {
    let state = withPurpleSet();
    state = step(state, { kind: "MORTGAGE", by: NAVEEN, tileIndexes: [1], atMs: 0 });
    state = setCash(state, NAVEEN, 100);
    expect(refusal(state, { kind: "REDEEM", by: NAVEEN, tileIndexes: [1], atMs: 0 })).toBe("E_REDEEM_INSUFFICIENT");
    expect(state.debts).toEqual([]);
  });

  it("mortgaging the same tile twice, or an unowned one, is refused", () => {
    let state = withPurpleSet();
    state = step(state, { kind: "MORTGAGE", by: NAVEEN, tileIndexes: [1], atMs: 0 });
    expect(refusal(state, { kind: "MORTGAGE", by: NAVEEN, tileIndexes: [1], atMs: 0 })).toBe("E_TILE_MORTGAGED");
    expect(refusal(state, { kind: "MORTGAGE", by: NAVEEN, tileIndexes: [5], atMs: 0 })).toBe("E_ACTION_ILLEGAL");
  });
});

describe("raiseCashHeadroom — the 1d route maxima", () => {
  it("sums mortgage values of clean tiles and sell-back prices of everything", () => {
    let state = withPurpleSet();
    state = step(state, { kind: "BUILD", by: NAVEEN, tileIndex: 1, what: "house", atMs: 0 });
    const headroom = raiseCashHeadroom(state, NAVEEN);

    // Mortgage: four clean tiles (₹700 + ₹700 + ₹600 + ₹800 + ₹800 minus tile 1 with a house).
    expect(headroom.mortgage).toBe(700 + 600 + 800 + 800);
    // Sell: one house at ₹150 plus 70 % of every cost.
    expect(headroom.sell).toBe(150 + 980 + 980 + 840 + 1120 + 1120);
  });
});

describe("END_TURN passes correctly after side actions", () => {
  it("a side action does not consume the turn", () => {
    let state = withPurpleSet();
    state = step(state, { kind: "MORTGAGE", by: NAVEEN, tileIndexes: [1], atMs: 0 });
    state = step(state, at("END_TURN", NAVEEN));
    expect(state.turn.playerId).toBe(PRIYA);
  });
});
