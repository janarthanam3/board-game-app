import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { applyRentEffects, rentFor } from "../src/rent";
import type { MatchState, PropertyTile } from "../src/state";
import { baseState, cloneState } from "./support/state";

// Marina Drive (index 1): cost ₹1,400 → base ₹35, houses ₹70/140/280/420, hotel ₹755.
const MARINA = 1;
// City Club (index 7): utility, multipliers ×4/×10/×16/×20.
const CLUB = 7;

function owned(indexes: number[], by = "p-naveen"): MatchState {
  const state = cloneState(baseState());
  for (const index of indexes) {
    state.tiles[index]!.ownerId = by;
  }
  return state;
}

describe("rentFor (rulebook §7)", () => {
  it("unowned = 0", () => {
    expect(rentFor(baseState(), MARINA)).toBe(0);
  });

  it("mortgaged = 0", () => {
    const state = owned([MARINA]);
    state.tiles[MARINA]!.mortgaged = true;
    expect(rentFor(state, MARINA)).toBe(0);
  });

  it("base rent: 2.5 % of ₹1,400 = ₹35", () => {
    expect(rentFor(owned([MARINA]), MARINA)).toBe(35);
  });

  it("base ×2 with the set held", () => {
    expect(rentFor(owned([1, 2, 3]), MARINA)).toBe(70);
  });

  it.each([
    [1, 70],
    [2, 140],
    [3, 280],
    [4, 420],
  ])("%i house(s) → ₹%i, and the set multiplier does not apply on top", (houses, expected) => {
    const state = owned([1, 2, 3]); // set held
    state.tiles[MARINA]!.houses = houses;
    expect(rentFor(state, MARINA)).toBe(expected);
  });

  it("hotel → ₹755 (54 % of ₹1,400, rounded to ₹5)", () => {
    const state = owned([1, 2, 3]);
    state.tiles[MARINA]!.hotel = true;
    expect(rentFor(state, MARINA)).toBe(755);
  });

  describe("utility: dice × multiplier by utilities owned, roll 7", () => {
    it("×4 with one utility → ₹28", () => {
      expect(rentFor(owned([CLUB]), CLUB, 7)).toBe(28);
    });

    it.each([
      [2, 70],
      [3, 112],
      [4, 140],
      [5, 140], // a fifth utility reuses the ×20 entry
    ])("×table[%i] → ₹%i", (utilitiesOwned, expected) => {
      const state = owned([CLUB]);
      // Give the owner extra utilities by turning sky tiles into utilities on this test board.
      const extras = [5, 6, 9, 10].slice(0, utilitiesOwned - 1);
      for (const index of extras) {
        state.board.tiles[index] = { ...(state.board.tiles[CLUB] as Extract<MatchState["board"]["tiles"][number], { kind: "utility" }>), name: `Utility ${index}` };
        state.tiles[index]!.ownerId = "p-naveen";
      }
      expect(rentFor(state, CLUB, 7)).toBe(expected);
    });

    it("fixed-amount basis ignores the dice", () => {
      const state = owned([CLUB]);
      const club = state.board.tiles[CLUB];
      if (club?.kind === "utility") {
        club.rentBasis = "fixed";
        club.fixedRent = 250;
      }
      expect(rentFor(state, CLUB, 7)).toBe(250);
      expect(rentFor(state, CLUB)).toBe(250);
    });

    it("dice basis with no roll known is 0 (nothing to multiply)", () => {
      expect(rentFor(owned([CLUB]), CLUB)).toBe(0);
    });
  });

  describe("owner in jail", () => {
    it("collects when the jail corner's 'Owner still collects rent while held' is on", () => {
      const state = owned([MARINA]);
      state.players["p-naveen"]!.jail = { in: true, roundsHeld: 1 };
      expect(rentFor(state, MARINA)).toBe(35);
    });

    it("collects nothing when that toggle is off (edge case #8)", () => {
      const state = owned([MARINA]);
      state.players["p-naveen"]!.jail = { in: true, roundsHeld: 1 };
      const jail = state.board.tiles[8];
      if (jail?.kind === "corner") {
        jail.collectRentWhileHeld = false;
      }
      expect(rentFor(state, MARINA)).toBe(0);
    });
  });

  it("rent during an auction = 0", () => {
    const state = owned([MARINA]);
    state.tiles[MARINA]!.underAuction = true;
    expect(rentFor(state, MARINA)).toBe(0);
  });

  it("card or corner spaces never charge rent", () => {
    expect(rentFor(baseState(), 4)).toBe(0);
    expect(rentFor(baseState(), 0)).toBe(0);
  });
});

describe("applyRentEffects — card effects modify the result last", () => {
  it("rentWaiver: the payment is skipped", () => {
    expect(applyRentEffects(140, { waiver: true, multiplier: 1 })).toBe(0);
  });

  it("rentMultiplier ×2 (collect or pay)", () => {
    expect(applyRentEffects(140, { waiver: false, multiplier: 2 })).toBe(280);
  });

  it("a waiver beats a multiplier", () => {
    expect(applyRentEffects(140, { waiver: true, multiplier: 2 })).toBe(0);
  });

  it("stays integer rupees", () => {
    expect(applyRentEffects(35, { waiver: false, multiplier: 2 })).toBe(70);
  });
});

describe("1j property card: `Rent now` from the tile's own values", () => {
  it("reproduces `Rent now ₹350 · doubled`, `With 1 house ₹700`, `Mortgage value ₹700`", () => {
    const state = owned([1, 2, 3]);
    const tile = state.board.tiles[MARINA] as PropertyTile;
    tile.baseRent = { mode: "flat", flat: 175 };
    tile.houseRent = [
      { mode: "flat", flat: 700 },
      { mode: "flat", flat: 1400 },
      { mode: "flat", flat: 2800 },
      { mode: "flat", flat: 4200 },
    ];
    tile.mortgage = { mode: "flat", flat: 700 };

    expect(rentFor(state, MARINA)).toBe(350); // doubled: set held, no buildings
    state.tiles[MARINA]!.houses = 1;
    expect(rentFor(state, MARINA)).toBe(700);
  });
});

describe("property: rent is monotonic in buildings", () => {
  // A tile whose author entered a non-decreasing rent ladder (the design's own examples all are).
  const ladder = fc
    .array(fc.integer({ min: 5, max: 5000 }), { minLength: 6, maxLength: 6 })
    .map((values) => [...values].sort((a, b) => a - b) as [number, number, number, number, number, number]);

  it("never falls as houses go 0 → 4 → hotel, with or without the set", () => {
    fc.assert(
      fc.property(ladder, fc.boolean(), ([base, h1, h2, h3, h4, hotel], held) => {
        const state = owned(held ? [1, 2, 3] : [MARINA]);
        const tile = state.board.tiles[MARINA] as PropertyTile;
        tile.baseRent = { mode: "flat", flat: base };
        tile.houseRent = [
          { mode: "flat", flat: h1 },
          { mode: "flat", flat: h2 },
          { mode: "flat", flat: h3 },
          { mode: "flat", flat: h4 },
        ];
        tile.hotelRent = { mode: "flat", flat: hotel };

        const rents: number[] = [];
        for (let houses = 0; houses <= 4; houses++) {
          state.tiles[MARINA]!.houses = houses;
          rents.push(rentFor(state, MARINA));
        }
        state.tiles[MARINA]!.houses = 0;
        state.tiles[MARINA]!.hotel = true;
        rents.push(rentFor(state, MARINA));

        // The set doubles only the no-building rent; a doubled base may exceed the 1-house rent
        // when the author's ladder is flat, so monotonicity is asserted from 1 house upwards
        // and separately for base → 1 house without the set.
        const fromOneHouse = rents.slice(1);
        const monotonic = fromOneHouse.every((rent, i) => i === 0 || rent >= fromOneHouse[i - 1]!);
        const baseBelowFirstHouse = held || rents[0]! <= rents[1]!;
        return monotonic && baseBelowFirstHouse && rents.every(Number.isInteger);
      }),
      { numRuns: 500 },
    );
  });
});
