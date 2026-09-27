// BUG-002: a creditor chain that loops back to the player who is going bankrupt.
//
// effectiveCreditor() follows an eliminated creditor's estate to whoever they owed (edge case #7). If
// that chain arrives back at the player declaring bankruptcy right now, they are still solvent at that
// moment, so the chain returns *them* — and step 3 of the resolution order would assign their own
// deeds to themselves, leaving tiles owned by an eliminated player.
//
// The shape is ordinary: A owes B, then B is eliminated owing A, so A's debt cascades to A.

import { describe, expect, it } from "vitest";

import { checkInvariants } from "../../src/invariants";
import type { MatchState } from "../../src/state";
import { ARUN, at, grant, lastEvent, NAVEEN, newMatch, PRIYA, rollAs, setCash, step } from "../support/match";

const PURPLE = [1, 2, 3, 13, 14];

function three(): MatchState {
  return newMatch({
    players: [
      { id: NAVEEN, name: "Naveen", colour: "gold" },
      { id: PRIYA, name: "Priya", colour: "blue" },
      { id: ARUN, name: "Arun", colour: "green" },
    ],
  });
}

/**
 * Naveen lands on Arun's built-up purple and cannot pay, so he owes Arun. Arun is then eliminated
 * owing Naveen, which is why Arun's deeds are already Naveen's — so Naveen's debt now cascades back
 * to Naveen himself.
 */
function loopedChain(): MatchState {
  let state = grant(three(), ARUN, PURPLE);
  for (const index of PURPLE) {
    state.tiles[index]!.houses = 1;
    state.bank.houses -= 1;
  }
  state = setCash(state, NAVEEN, 50);
  state = rollAs(state, NAVEEN, [1, 1]); // lands on purple, rent he cannot cover

  expect(state.debts).toHaveLength(1);
  expect(state.debts[0]).toMatchObject({ debtorId: NAVEEN, creditorId: ARUN });
  expect(state.turn.stage).toBe("raiseCash");

  // Arun's elimination, with Naveen as his creditor: his estate has already passed to Naveen.
  state.players[ARUN]!.bankrupt = { out: true, round: state.round, owedTo: NAVEEN, amount: 500 };
  // His cash passed to his creditor too, so the ledger still balances.
  state.players[NAVEEN]!.cash += state.players[ARUN]!.cash;
  state.players[ARUN]!.cash = 0;
  for (const index of PURPLE) {
    state.tiles[index]!.ownerId = NAVEEN;
  }
  return state;
}

describe("a creditor chain that loops back to the debtor (BUG-002)", () => {
  it("sends the estate to the bank rather than back to the eliminated player", () => {
    const state = loopedChain();
    const after = step(state, at("DECLARE_BANKRUPTCY", NAVEEN));

    expect(after.players[NAVEEN]!.bankrupt?.out).toBe(true);
    for (const index of PURPLE) {
      expect(after.tiles[index]!.ownerId).not.toBe(NAVEEN);
    }
    // The bank takes the estate, exactly as a bankruptcy with no player creditor does.
    expect(lastEvent(after, "bankrupt")).toMatchObject({ playerId: NAVEEN, creditorId: "bank" });
    expect(checkInvariants(after)).toEqual([]);
  });

  it("returns the buildings to the bank's supply on the way", () => {
    const state = loopedChain();
    const housesBefore = state.bank.houses;
    const after = step(state, at("DECLARE_BANKRUPTCY", NAVEEN));

    expect(after.bank.houses).toBe(housesBefore + PURPLE.length);
    for (const index of PURPLE) {
      expect(after.tiles[index]!.houses).toBe(0);
    }
  });

  it("still pays a solvent creditor normally — the guard only catches the self-loop", () => {
    // Priya is untouched and solvent, so a debt to her resolves to her as it always did.
    let state = grant(three(), PRIYA, PURPLE);
    for (const index of PURPLE) {
      state.tiles[index]!.houses = 1;
      state.bank.houses -= 1;
    }
    state = grant(state, NAVEEN, [5]);
    state = setCash(state, NAVEEN, 50);
    state = rollAs(state, NAVEEN, [1, 1]);
    const after = step(state, at("DECLARE_BANKRUPTCY", NAVEEN));

    expect(after.tiles[5]!.ownerId).toBe(PRIYA);
    expect(lastEvent(after, "bankrupt")).toMatchObject({ creditorId: PRIYA });
    expect(checkInvariants(after)).toEqual([]);
  });
});
