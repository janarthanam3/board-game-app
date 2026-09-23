import { describe, expect, it } from "vitest";

import { checkInvariants, checkTransitionInvariants, type InvariantName } from "../src/invariants";
import { baseState, cloneState } from "./support/state";

function names(state = baseState()): InvariantName[] {
  return checkInvariants(state).map((violation) => violation.name);
}

describe("a fresh match", () => {
  it("violates no invariant", () => {
    expect(checkInvariants(baseState())).toEqual([]);
  });
});

describe("cashNonNegative", () => {
  it("flags a player whose cash is below zero", () => {
    const state = cloneState(baseState());
    state.players["p-priya"]!.cash = -1;
    expect(names(state)).toContain("cashNonNegative");
  });
});

describe("cashConservation", () => {
  it("holds when player cash, the fine pot and escrowed bids add up to the ledger", () => {
    const state = cloneState(baseState());
    // Naveen paid a ₹500 fine into the pot; Priya has ₹300 escrowed on a live bid: ₹20,000 in play.
    state.players["p-naveen"]!.cash = 9500;
    state.bank.finePot = 500;
    state.tiles[1]!.underAuction = true;
    state.auction = {
      tileIndex: 1,
      minBid: 1400,
      leadingBid: 300,
      leadingBidderId: "p-priya",
      escrow: { "p-priya": 300 },
      passed: [],
      deadlineMs: null,
      resumeStage: "postRoll",
    };
    state.players["p-priya"]!.cash = 9700;
    expect(names(state)).not.toContain("cashConservation");
  });

  it("flags money appearing from nowhere", () => {
    const state = cloneState(baseState());
    state.players["p-naveen"]!.cash = 10001;
    expect(names(state)).toContain("cashConservation");
  });

  it("accounts for money the bank has absorbed (a purchase) and issued (a pass bonus)", () => {
    const state = cloneState(baseState());
    state.players["p-naveen"]!.cash = 10000 - 1400 + 2000;
    state.bank.ledger.absorbed = 1400;
    state.bank.ledger.issued = 20000 + 2000;
    expect(names(state)).not.toContain("cashConservation");
  });
});

describe("houseSupply and hotelSupply", () => {
  it("hold when the bank plus the board equal the board's supply", () => {
    const state = cloneState(baseState());
    state.tiles[1]!.ownerId = "p-naveen";
    state.tiles[1]!.houses = 3;
    state.bank.houses = 29;
    expect(names(state)).not.toContain("houseSupply");
  });

  it("flag a house that is on the board but never left the bank", () => {
    const state = cloneState(baseState());
    state.tiles[1]!.ownerId = "p-naveen";
    state.tiles[1]!.houses = 1;
    expect(names(state)).toContain("houseSupply");
  });

  it("flag a hotel count that does not match the supply", () => {
    const state = cloneState(baseState());
    state.tiles[1]!.ownerId = "p-naveen";
    state.tiles[1]!.hotel = true;
    expect(names(state)).toContain("hotelSupply");
  });
});

describe("buildLimits", () => {
  it("flags more than four houses", () => {
    const state = cloneState(baseState());
    state.tiles[1]!.ownerId = "p-naveen";
    state.tiles[1]!.houses = 5;
    state.bank.houses = 27;
    expect(names(state)).toContain("buildLimits");
  });

  it("flags a hotel standing with houses", () => {
    const state = cloneState(baseState());
    state.tiles[1]!.ownerId = "p-naveen";
    state.tiles[1]!.hotel = true;
    state.tiles[1]!.houses = 2;
    state.bank.hotels = 11;
    state.bank.houses = 30;
    expect(names(state)).toContain("buildLimits");
  });
});

describe("evenBuild", () => {
  it("flags a two-house gap within a group while Build evenly is on", () => {
    const state = cloneState(baseState());
    for (const index of [1, 2, 3, 13, 14]) {
      state.tiles[index]!.ownerId = "p-naveen";
    }
    state.tiles[1]!.houses = 2;
    state.bank.houses = 30;
    expect(names(state)).toContain("evenBuild");
  });

  it("allows a one-house gap", () => {
    const state = cloneState(baseState());
    for (const index of [1, 2, 3, 13, 14]) {
      state.tiles[index]!.ownerId = "p-naveen";
    }
    state.tiles[1]!.houses = 1;
    state.bank.houses = 31;
    expect(names(state)).not.toContain("evenBuild");
  });

  it("treats a hotel as one level above four houses (OQ-15)", () => {
    const state = cloneState(baseState());
    for (const index of [1, 2, 3, 13, 14]) {
      state.tiles[index]!.ownerId = "p-naveen";
      state.tiles[index]!.houses = 4;
    }
    state.tiles[1]!.houses = 0;
    state.tiles[1]!.hotel = true;
    state.bank.houses = 32 - 16;
    state.bank.hotels = 11;
    expect(names(state)).not.toContain("evenBuild");
  });

  it("is not checked when Build evenly is off", () => {
    const state = cloneState(baseState());
    state.rules.sets.buildEvenly = false;
    for (const index of [1, 2, 3, 13, 14]) {
      state.tiles[index]!.ownerId = "p-naveen";
    }
    state.tiles[1]!.houses = 3;
    state.bank.houses = 29;
    expect(names(state)).not.toContain("evenBuild");
  });
});

describe("ownershipUnique", () => {
  it("flags a tile owned by a player who is not in the match", () => {
    const state = cloneState(baseState());
    state.tiles[1]!.ownerId = "p-ghost";
    expect(names(state)).toContain("ownershipUnique");
  });

  it("flags a bankrupt player who still owns a tile", () => {
    const state = cloneState(baseState());
    state.players["p-priya"]!.bankrupt = { out: true, round: 3, owedTo: "bank", amount: 500 };
    state.tiles[1]!.ownerId = "p-priya";
    expect(names(state)).toContain("ownershipUnique");
  });

  it("flags an owner on a tile that cannot be owned", () => {
    const state = cloneState(baseState());
    state.tiles[4]!.ownerId = "p-naveen"; // a card space
    expect(names(state)).toContain("ownershipUnique");
  });
});

describe("mortgageConsistency", () => {
  it("flags a mortgaged tile that still holds houses", () => {
    const state = cloneState(baseState());
    state.tiles[1]!.ownerId = "p-naveen";
    state.tiles[1]!.mortgaged = true;
    state.tiles[1]!.houses = 1;
    state.bank.houses = 31;
    expect(names(state)).toContain("mortgageConsistency");
  });

  it("flags a mortgaged tile with no owner", () => {
    const state = cloneState(baseState());
    state.tiles[1]!.mortgaged = true;
    expect(names(state)).toContain("mortgageConsistency");
  });
});

describe("seatIntegrity", () => {
  it("flags a seat order that is not a permutation of the players", () => {
    const state = cloneState(baseState());
    state.seatOrder = ["p-naveen", "p-naveen"];
    expect(names(state)).toContain("seatIntegrity");
  });

  it("flags a seat order missing a player", () => {
    const state = cloneState(baseState());
    state.seatOrder = ["p-naveen"];
    expect(names(state)).toContain("seatIntegrity");
  });
});

describe("turnActor", () => {
  it("flags an actor who is bankrupt", () => {
    const state = cloneState(baseState());
    state.players["p-naveen"]!.bankrupt = { out: true, round: 2, owedTo: "p-priya", amount: 900 };
    expect(names(state)).toContain("turnActor");
  });

  it("flags an actor who is not a player", () => {
    const state = cloneState(baseState());
    state.turn.playerId = "p-ghost";
    expect(names(state)).toContain("turnActor");
  });

  it("does not flag a disconnected actor (the server auto-plays them)", () => {
    const state = cloneState(baseState());
    state.players["p-naveen"]!.connected = false;
    expect(names(state)).not.toContain("turnActor");
  });
});

describe("auctionExclusive", () => {
  it("flags a live auction whose tile is not marked underAuction", () => {
    const state = cloneState(baseState());
    state.auction = { tileIndex: 1, minBid: 1400, leadingBid: 0, leadingBidderId: null, escrow: {}, passed: [], deadlineMs: null, resumeStage: "postRoll" };
    expect(names(state)).toContain("auctionExclusive");
  });

  it("flags a tile marked underAuction with no live auction", () => {
    const state = cloneState(baseState());
    state.tiles[1]!.underAuction = true;
    expect(names(state)).toContain("auctionExclusive");
  });

  it("flags a second tile under auction at the same time", () => {
    const state = cloneState(baseState());
    state.auction = { tileIndex: 1, minBid: 1400, leadingBid: 0, leadingBidderId: null, escrow: {}, passed: [], deadlineMs: null, resumeStage: "postRoll" };
    state.tiles[1]!.underAuction = true;
    state.tiles[2]!.underAuction = true;
    expect(names(state)).toContain("auctionExclusive");
  });
});

describe("debtBlocking", () => {
  it("flags a debt owed by a player who is not solvent or not in the match", () => {
    const state = cloneState(baseState());
    state.debts = [{ id: "d-1", debtorId: "p-ghost", creditorId: "bank", amount: 500, createdRound: 1, payTo: "creditor" }];
    expect(names(state)).toContain("debtBlocking");
  });

  it("flags a debt of zero or negative amount", () => {
    const state = cloneState(baseState());
    state.debts = [{ id: "d-1", debtorId: "p-priya", creditorId: "bank", amount: 0, createdRound: 1, payTo: "creditor" }];
    expect(names(state)).toContain("debtBlocking");
  });

  it("flags a debt whose creditor is not a player or the bank", () => {
    const state = cloneState(baseState());
    state.debts = [{ id: "d-1", debtorId: "p-priya", creditorId: "p-ghost", amount: 500, createdRound: 1, payTo: "creditor" }];
    expect(names(state)).toContain("debtBlocking");
  });

  it("flags an actor with an open debt outside the raise-cash stage", () => {
    const state = cloneState(baseState());
    state.debts = [{ id: "d-1", debtorId: "p-naveen", creditorId: "bank", amount: 500, createdRound: 1, payTo: "creditor" }];
    state.turn.stage = "preRoll";
    expect(names(state)).toContain("debtBlocking");
  });

  it("accepts an actor with an open debt in the raise-cash stage", () => {
    const state = cloneState(baseState());
    state.debts = [{ id: "d-1", debtorId: "p-naveen", creditorId: "bank", amount: 500, createdRound: 1, payTo: "creditor" }];
    state.turn.stage = "raiseCash";
    expect(names(state)).not.toContain("debtBlocking");
  });
});

describe("transition invariants", () => {
  it("roundMonotonic: the round never decreases", () => {
    const before = baseState();
    const after = cloneState(before);
    after.round = 0;
    expect(checkTransitionInvariants(before, after).map((v) => v.name)).toContain("roundMonotonic");
  });

  it("rngMonotonic: the RNG cursor never decreases and the seed never changes", () => {
    const before = cloneState(baseState());
    before.rng.cursor = 5;
    const rewound = cloneState(before);
    rewound.rng.cursor = 4;
    expect(checkTransitionInvariants(before, rewound).map((v) => v.name)).toContain("rngMonotonic");

    const reseeded = cloneState(before);
    reseeded.rng.seed = 7;
    expect(checkTransitionInvariants(before, reseeded).map((v) => v.name)).toContain("rngMonotonic");
  });

  it("logAppendOnly: existing entries never change and the log never shrinks", () => {
    const before = cloneState(baseState());
    before.log = [{ seq: 1, kind: "matchStarted", atMs: 0, playerIds: ["p-naveen", "p-priya"], seed: 42 }];

    const shrunk = cloneState(before);
    shrunk.log = [];
    expect(checkTransitionInvariants(before, shrunk).map((v) => v.name)).toContain("logAppendOnly");

    const rewritten = cloneState(before);
    rewritten.log = [{ seq: 1, kind: "matchStarted", atMs: 99, playerIds: ["p-naveen", "p-priya"], seed: 42 }];
    expect(checkTransitionInvariants(before, rewritten).map((v) => v.name)).toContain("logAppendOnly");

    const appended = cloneState(before);
    appended.log = [...before.log, { seq: 2, kind: "diceRolled", atMs: 10, playerId: "p-naveen", dice: [3, 4], doubles: false, chosen: false }];
    expect(checkTransitionInvariants(before, appended)).toEqual([]);
  });

  it("reports nothing for an unchanged state", () => {
    const state = baseState();
    expect(checkTransitionInvariants(state, cloneState(state))).toEqual([]);
  });
});

describe("violations", () => {
  it("carry the invariant name and a message that names the offender", () => {
    const state = cloneState(baseState());
    state.players["p-priya"]!.cash = -50;
    const [violation] = checkInvariants(state);
    expect(violation).toMatchObject({ name: "cashNonNegative" });
    expect(violation?.message).toContain("p-priya");
  });
});
