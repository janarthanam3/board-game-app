import { describe, expect, it } from "vitest";

import type { Action } from "../../src/actions";
import { apply, legalActions, validate } from "../../src/reducer/index";
import type { MatchState } from "../../src/state";
import { at, eventsOf, forceNextRoll, grant, lastEvent, NAVEEN, newMatch, PRIYA, refusal, rollAs, setCash, step } from "../support/match";

describe("createMatch", () => {
  it("deals starting cash, seats players in order and opens the first turn at preRoll", () => {
    const state = newMatch();

    expect(state.phase).toBe("live");
    expect(state.round).toBe(1);
    expect(state.seatOrder).toEqual([NAVEEN, PRIYA]);
    expect(state.players[NAVEEN]!.cash).toBe(10000);
    expect(state.bank.ledger).toEqual({ issued: 20000, absorbed: 0 });
    expect(state.turn).toMatchObject({ playerId: NAVEEN, stage: "preRoll", dice: null });
    expect(state.log.map((event) => event.kind)).toEqual(["matchStarted", "roundStarted", "turnStarted"]);
  });

  it("stores the seed with the cursor at zero", () => {
    expect(newMatch({ seed: 99 }).rng).toEqual({ seed: 99, cursor: 0 });
  });

  it("refuses fewer than two players", () => {
    expect(() => newMatch({ players: [{ id: NAVEEN, name: "Naveen", colour: "gold" }] })).toThrow(/2–6/);
  });
});

describe("ROLL", () => {
  it("only the actor may roll, and only at preRoll", () => {
    const state = newMatch();
    expect(refusal(state, at("ROLL", PRIYA))).toBe("E_NOT_YOUR_TURN");
    expect(refusal(state, at("ROLL", NAVEEN))).toBe("OK");
  });

  it("moves the token by the dice total and logs the roll and the move", () => {
    const state = rollAs(newMatch(), NAVEEN, [2, 3]);

    expect(state.players[NAVEEN]!.position).toBe(5);
    expect(lastEvent(state, "diceRolled")).toMatchObject({ dice: [2, 3], doubles: false });
    expect(lastEvent(state, "moved")).toMatchObject({ from: 0, to: 5, passedStart: false });
    expect(state.rng.cursor).toBe(2); // two draws, one per die
  });

  it("pays the pass bonus when the move crosses the start tile (START BONUS)", () => {
    let state = newMatch();
    state = { ...state, players: { ...state.players, [NAVEEN]: { ...state.players[NAVEEN]!, position: 14 } } };
    state = rollAs(state, NAVEEN, [1, 3]); // 14 + 4 = 18 → index 2, passing 0

    expect(state.players[NAVEEN]!.position).toBe(2);
    expect(state.players[NAVEEN]!.cash).toBe(12000);
    expect(state.bank.ledger.issued).toBe(22000);
    expect(lastEvent(state, "startBonus")).toMatchObject({ amount: 2000 });
  });

  it("landing on an unowned tile opens the PROPERTY COST decision", () => {
    const state = rollAs(newMatch(), NAVEEN, [1, 1]); // index 2, Bay Road ₹1,400

    expect(state.turn.stage).toBe("decision");
    expect(lastEvent(state, "propertyCost")).toMatchObject({ tileIndex: 2, cost: 1400, canAfford: true });
    expect(legalActions(state, NAVEEN)).toEqual(expect.arrayContaining(["BUY", "PASS_BUY"]));
    expect(legalActions(state, NAVEEN)).not.toContain("ROLL");
  });

  it("landing on a tile you own resolves to postRoll", () => {
    let state = grant(newMatch(), NAVEEN, [3]);
    state = rollAs(state, NAVEEN, [1, 2]);
    expect(state.turn.stage).toBe("postRoll");
  });
});

describe("doubles (rulebook §15)", () => {
  it("a double lets the same player roll again after END_TURN", () => {
    let state = rollAs(newMatch(), NAVEEN, [2, 2]); // lands on 4, a card space → postRoll
    expect(state.turn.stage).toBe("postRoll");
    expect(state.turn.doublesThisTurn).toBe(1);

    state = step(state, at("END_TURN", NAVEEN));
    expect(state.turn.playerId).toBe(NAVEEN);
    expect(state.turn.stage).toBe("preRoll");
  });

  it("three doubles in one turn send the player to jail without moving", () => {
    let state = grant(newMatch(), NAVEEN, [10]); // own Beach Road so the second landing resolves
    state = rollAs(state, NAVEEN, [2, 2]); // → 4, a card space
    state = step(state, at("END_TURN", NAVEEN));
    state = rollAs(state, NAVEEN, [3, 3]); // → 10, own tile
    state = step(state, at("END_TURN", NAVEEN));
    state = rollAs(state, NAVEEN, [1, 1]); // third double

    expect(state.players[NAVEEN]!.jail.in).toBe(true);
    expect(state.players[NAVEEN]!.position).toBe(8); // the jail tile, not 12
    expect(lastEvent(state, "sentToJail")).toMatchObject({ reason: "thirdDouble", entryCharge: 0 });
    // No further roll: END_TURN passes the dice on.
    state = step(state, at("END_TURN", NAVEEN));
    expect(state.turn.playerId).toBe(PRIYA);
  });

  it("edge case #9: a third double on a board with no jail simply ends the turn", () => {
    let state = newMatch();
    state.board.tiles[8] = { kind: "corner", name: "Plain corner", cornerType: "none", drawMode: "fixed", getOut: null, stayHere: null, getIn: null, blockActionsWhileHeld: false, collectRentWhileHeld: true };
    state = rollAs(state, NAVEEN, [2, 2]);
    state = step(state, at("END_TURN", NAVEEN));
    state = rollAs(state, NAVEEN, [2, 2]);
    state = step(state, at("END_TURN", NAVEEN));
    state = rollAs(state, NAVEEN, [1, 1]);

    expect(state.players[NAVEEN]!.jail.in).toBe(false);
    expect(eventsOf(state, "sentToJail")).toHaveLength(0);
    state = step(state, at("END_TURN", NAVEEN));
    expect(state.turn.playerId).toBe(PRIYA);
  });
});

describe("END_TURN and rounds (rulebook §14, §15)", () => {
  it("passes to the next solvent player and increments the round when the order wraps", () => {
    let state = rollAs(newMatch(), NAVEEN, [1, 3]); // → 4, card space
    state = step(state, at("END_TURN", NAVEEN));
    expect(state.turn.playerId).toBe(PRIYA);
    expect(state.round).toBe(1);

    state = rollAs(state, PRIYA, [1, 3]);
    state = step(state, at("END_TURN", PRIYA));
    expect(state.turn.playerId).toBe(NAVEEN);
    expect(state.round).toBe(2);
    expect(lastEvent(state, "roundStarted")).toMatchObject({ round: 2 });
  });

  it("cannot end the turn before rolling or with an open decision", () => {
    const state = newMatch();
    expect(refusal(state, at("END_TURN", NAVEEN))).toBe("E_ACTION_ILLEGAL");
    const decided = rollAs(state, NAVEEN, [1, 1]);
    expect(refusal(decided, at("END_TURN", NAVEEN))).toBe("E_ACTION_ILLEGAL");
  });

  it("edge case #32: the round cap resolves only once the round completes, then the match ends", () => {
    let state = newMatch({ rules: { ...newMatch().rules, rounds: { cap: 1, turnTimerSeconds: null } } });
    state = rollAs(state, NAVEEN, [1, 3]);
    state = step(state, at("END_TURN", NAVEEN));
    expect(state.phase).toBe("live"); // Priya still gets her turn in round 1
    state = rollAs(state, PRIYA, [1, 3]);
    state = step(state, at("END_TURN", PRIYA));

    expect(state.phase).toBe("ended");
    expect(lastEvent(state, "matchEnded")).toMatchObject({ reason: "roundCap" });
    expect(refusal(state, at("ROLL", NAVEEN))).toBe("E_MATCH_NOT_LIVE");
  });

  it("edge case #33: ties at the cap break by tiles, then buildings, then seat", () => {
    let state = newMatch({ rules: { ...newMatch().rules, rounds: { cap: 1, turnTimerSeconds: null } } });
    // Equal cash; Priya owns one tile at cost ₹1,400 but paid nothing (test grant), so net worth
    // favours her; give Naveen the same tile value in cash to tie, then Priya wins on tile count.
    state = grant(state, PRIYA, [1]);
    state = setCash(state, NAVEEN, 11400);
    state = rollAs(state, NAVEEN, [1, 3]);
    state = step(state, at("END_TURN", NAVEEN));
    state = rollAs(state, PRIYA, [1, 3]);
    state = step(state, at("END_TURN", PRIYA));

    expect(lastEvent(state, "matchEnded")).toMatchObject({ standings: [PRIYA, NAVEEN] });
  });
});

describe("jail (rulebook §12)", () => {
  function jailed(): MatchState {
    let state = grant(newMatch(), NAVEEN, [10]);
    state = rollAs(state, NAVEEN, [2, 2]);
    state = step(state, at("END_TURN", NAVEEN));
    state = rollAs(state, NAVEEN, [3, 3]);
    state = step(state, at("END_TURN", NAVEEN));
    state = rollAs(state, NAVEEN, [1, 1]); // third double → jail
    state = step(state, at("END_TURN", NAVEEN));
    state = rollAs(state, PRIYA, [1, 3]);
    return step(state, at("END_TURN", PRIYA)); // back to Naveen, in jail
  }

  it("opens the turn at jailChoice with the IN JAIL card", () => {
    const state = jailed();
    expect(state.turn.stage).toBe("jailChoice");
    expect(lastEvent(state, "inJail")).toMatchObject({ playerId: NAVEEN, roundsHeld: 1, maxRoundsHeld: 3, bail: 5000 });
    expect(legalActions(state, NAVEEN)).toEqual(expect.arrayContaining(["ROLL", "PAY_BAIL"]));
    expect(legalActions(state, NAVEEN)).not.toContain("BUILD");
  });

  it("paying bail (₹5,000 to the bank) releases the player to preRoll", () => {
    let state = jailed();
    const cashBefore = state.players[NAVEEN]!.cash;
    state = step(state, at("PAY_BAIL", NAVEEN));

    expect(state.players[NAVEEN]!.jail.in).toBe(false);
    expect(state.players[NAVEEN]!.cash).toBe(cashBefore - 5000);
    expect(state.turn.stage).toBe("preRoll");
    expect(lastEvent(state, "jailReleased")).toMatchObject({ how: "bail" });
  });

  it("refuses bail the player cannot afford, leaving Roll available", () => {
    let state = jailed();
    state = setCash(state, NAVEEN, 100);
    expect(refusal(state, at("PAY_BAIL", NAVEEN))).toBe("E_BAIL_INSUFFICIENT");
    expect(refusal(state, at("ROLL", NAVEEN))).toBe("OK");
  });

  it("rolling a double releases without paying and moves the player", () => {
    let state = jailed();
    state = rollAs(state, NAVEEN, [4, 4]);

    expect(state.players[NAVEEN]!.jail.in).toBe(false);
    expect(lastEvent(state, "jailReleased")).toMatchObject({ how: "double" });
    expect(state.players[NAVEEN]!.position).toBe(0); // 8 + 8 = 16 → start, bonus paid
    expect(lastEvent(state, "startBonus")).toBeDefined();
  });

  it("a non-double keeps the player in jail for the turn", () => {
    let state = jailed();
    state = rollAs(state, NAVEEN, [1, 2]);

    expect(state.players[NAVEEN]!.jail).toEqual({ in: true, roundsHeld: 1 });
    expect(state.players[NAVEEN]!.position).toBe(8);
    expect(state.turn.stage).toBe("postRoll");
  });

  it("release is automatic after the maximum rounds held, paid or not", () => {
    let state = jailed();
    for (let round = 0; round < 3; round++) {
      state = rollAs(state, NAVEEN, [1, 2]);
      state = step(state, at("END_TURN", NAVEEN));
      state = rollAs(state, PRIYA, [1, 3]);
      state = step(state, at("END_TURN", PRIYA));
    }
    expect(state.players[NAVEEN]!.jail.in).toBe(false);
    expect(lastEvent(state, "jailReleased")).toMatchObject({ how: "served" });
    expect(state.turn.stage).toBe("preRoll");
  });

  it("a jail pass card walks out without paying", () => {
    let state = jailed();
    state.players[NAVEEN]!.holdCards.push({ id: "card-jp", effect: { kind: "jailPass" }, uses: 1, expires: "never", tradeable: true, grantedRound: 1 });
    const use: Action = { kind: "USE_CARD", by: NAVEEN, cardId: "card-jp", atMs: 0 };
    expect(validate(state, use).ok).toBe(true);
    state = step(state, use);

    expect(state.players[NAVEEN]!.jail.in).toBe(false);
    expect(state.players[NAVEEN]!.holdCards).toEqual([]);
    expect(state.turn.stage).toBe("preRoll");
  });

  it("edge case #8: rent is collected from a jailed owner only when the corner's toggle is on", () => {
    let state = jailed();
    state = grant(state, NAVEEN, [12 + 1]); // Adyar, index 13
    state = rollAs(state, NAVEEN, [1, 2]); // stays in jail
    state = step(state, at("END_TURN", NAVEEN));
    // Priya at 4 → needs 9 to land on 13.
    const priyaCash = state.players[PRIYA]!.cash;
    state = rollAs(state, PRIYA, [4, 5]);
    expect(state.players[PRIYA]!.cash).toBe(priyaCash - 40); // base rent 2.5% of ₹1,600
  });

  it("blocks build, sell, mortgage and trade while held (E_JAIL_BLOCKED)", () => {
    let state = jailed();
    state = grant(state, NAVEEN, [1, 2, 3]);
    expect(refusal(state, { kind: "MORTGAGE", by: NAVEEN, tileIndexes: [1], atMs: 0 })).toBe("E_JAIL_BLOCKED");
    expect(refusal(state, { kind: "OFFER_TRADE", by: NAVEEN, to: PRIYA, give: { cash: 100, tileIndexes: [], holdCardIds: [] }, get: { cash: 0, tileIndexes: [], holdCardIds: [] }, atMs: 0 })).toBe("E_JAIL_BLOCKED");
  });
});

describe("corner and card spaces", () => {
  it("landing on the GET IN jail corner charges the entry amount and jails the player", () => {
    let state = newMatch();
    state = rollAs(state, NAVEEN, [4, 4]); // → 8, the jail corner with GET IN ₹100
    expect(state.players[NAVEEN]!.jail.in).toBe(true);
    expect(state.players[NAVEEN]!.cash).toBe(10000 - 100);
    expect(lastEvent(state, "sentToJail")).toMatchObject({ reason: "landed", entryCharge: 100 });
  });

  it("landing on the rest house skips the next turn and charges ₹1,000 when it comes round", () => {
    let state = newMatch();
    state = { ...state, players: { ...state.players, [NAVEEN]: { ...state.players[NAVEEN]!, position: 10 } } };
    state = rollAs(state, NAVEEN, [2, 3]); // → 15, the rest house
    expect(state.players[NAVEEN]!.skipTurns).toBe(1);
    state = step(state, at("END_TURN", NAVEEN));
    state = rollAs(state, PRIYA, [1, 3]);
    state = step(state, at("END_TURN", PRIYA));

    // Naveen's turn is skipped and charged; the dice pass straight to Priya.
    expect(lastEvent(state, "restHouse")).toMatchObject({ playerId: NAVEEN, turnsSkipped: 1, amount: 1000 });
    expect(state.players[NAVEEN]!.cash).toBe(10000 - 1000);
    expect(state.turn.playerId).toBe(PRIYA);
  });

  it("a tax office charges a flat amount to the bank (INCOME TAX)", () => {
    let state = newMatch();
    state.board.tiles[4] = { kind: "card", name: "Tax office", cardType: "tax", deckId: null, tax: { mode: "flat", flatAmount: 1800, percent: 10, percentOf: "cash" } };
    state = rollAs(state, NAVEEN, [1, 3]);
    expect(state.players[NAVEEN]!.cash).toBe(8200);
    expect(state.bank.ledger.absorbed).toBe(1800);
    expect(lastEvent(state, "taxCharged")).toMatchObject({ amount: 1800, debtId: null });
  });

  it("a percent tax of cash rounds to a rupee and goes to the pot when the board says so", () => {
    let state = newMatch({ rules: { ...newMatch().rules, money: { startingCash: 10000, passBonus: 2000, finesTo: "pot" } } });
    state.board.tiles[4] = { kind: "card", name: "Tax office", cardType: "tax", deckId: null, tax: { mode: "percent", flatAmount: 0, percent: 10, percentOf: "cash" } };
    state = rollAs(state, NAVEEN, [1, 3]);
    expect(state.players[NAVEEN]!.cash).toBe(9000);
    expect(state.bank.finePot).toBe(1000);
  });

  it("a chance space draws from its deck (the test board's deck is empty, edge case #38)", () => {
    const state = rollAs(newMatch(), NAVEEN, [1, 3]);
    expect(lastEvent(state, "cardDrawn")).toMatchObject({ tileIndex: 4, deckId: "d-chance", source: "emptyDeck", applied: false });
    expect(state.turn.stage).toBe("postRoll");
  });
});

describe("TIMER_EXPIRED (docs/flows/turn.md defaults)", () => {
  const expire: Action = { kind: "TIMER_EXPIRED", scope: "turn", atMs: 30_000 };

  it("awaiting a roll: rolls, resolves and ends the turn", () => {
    let state = forceNextRoll(newMatch(), [1, 3]);
    state = step(state, expire);
    expect(lastEvent(state, "timerExpired")).toMatchObject({ applied: ["rolled"] });
    expect(state.turn.playerId).toBe(PRIYA);
  });

  it("awaiting a roll that lands on an unowned tile: rolls, then declines, in that order", () => {
    let state = forceNextRoll(newMatch(), [1, 1]);
    state = step(state, expire);
    expect(lastEvent(state, "timerExpired")).toMatchObject({ applied: ["rolled", "declined purchase"] });
    expect(state.tiles[2]!.ownerId).toBeNull();
    expect(state.auction).toMatchObject({ tileIndex: 2 });
  });

  it("with a jail decision open: rolls for doubles and pays no bail", () => {
    let state = newMatch();
    state.players[NAVEEN]!.jail = { in: true, roundsHeld: 0 };
    state.players[NAVEEN]!.position = 8;
    state.turn.stage = "jailChoice";
    state = forceNextRoll(state, [1, 3]); // not a double: stays in jail
    state = step(state, expire);
    expect(lastEvent(state, "timerExpired")).toMatchObject({ applied: ["rolled for doubles"] });
    expect(state.players[NAVEEN]!.cash).toBe(10000);
    expect(state.players[NAVEEN]!.jail.in).toBe(true);
    expect(state.turn.playerId).toBe(PRIYA);
  });

  it("with a trade offer open to the actor: rejects it before ending the turn", () => {
    let state = forceNextRoll(newMatch(), [1, 3]);
    state.offers.push({ id: "offer-p", from: PRIYA, to: NAVEEN, give: { cash: 100, tileIndexes: [], holdCardIds: [] }, get: { cash: 0, tileIndexes: [], holdCardIds: [] }, createdAtMs: 0, expiresAtMs: 60_000 });
    state = step(state, expire);
    expect(lastEvent(state, "timerExpired")).toMatchObject({ applied: ["rolled", "rejected offer offer-p"] });
    expect(lastEvent(state, "tradeRejected")).toMatchObject({ offerId: "offer-p", from: PRIYA, to: NAVEEN });
    expect(state.offers).toEqual([]);
    expect(state.turn.playerId).toBe(PRIYA);
  });

  it("with a purchase decision open: declines, which opens an auction when auctions are on", () => {
    let state = rollAs(newMatch(), NAVEEN, [1, 1]);
    state = step(state, expire);
    expect(lastEvent(state, "timerExpired")!).toMatchObject({ applied: ["declined purchase"] });
    expect(state.auction).not.toBeNull();
    expect(state.turn.playerId).toBe(NAVEEN); // the turn resumes after the auction
  });

  it("with raise cash open: the debt stands and the turn passes (edge case #26)", () => {
    let state = grant(newMatch(), PRIYA, [1, 2, 3, 13, 14]);
    for (const index of [1, 2, 3, 13, 14]) {
      state.tiles[index]!.houses = 1;
    }
    state.bank.houses -= 5;
    state = setCash(state, NAVEEN, 50);
    state = rollAs(state, NAVEEN, [1, 1]); // Bay Road with 1 house: ₹70 > ₹50
    expect(state.turn.stage).toBe("raiseCash");
    state = step(state, expire);

    expect(state.debts).toHaveLength(1);
    expect(state.turn.playerId).toBe(PRIYA);
    // On Naveen's next turn the debt is re-presented before anything else.
    state = rollAs(state, PRIYA, [1, 3]);
    state = step(state, at("END_TURN", PRIYA));
    expect(state.turn).toMatchObject({ playerId: NAVEEN, stage: "raiseCash" });
  });

  it("edge case #25: the turn clock is paused during an auction", () => {
    let state = rollAs(newMatch(), NAVEEN, [1, 1]);
    state = step(state, { kind: "PASS_BUY", by: NAVEEN, tileIndex: 2, atMs: 0 });
    expect(state.auction).not.toBeNull();
    expect(refusal(state, expire)).toBe("E_ACTION_ILLEGAL");
  });
});

describe("apply is pure", () => {
  it("never mutates the state it is given", () => {
    const state = forceNextRoll(newMatch(), [1, 3]);
    const frozen = JSON.stringify(state);
    apply(state, at("ROLL", NAVEEN));
    expect(JSON.stringify(state)).toBe(frozen);
  });

  it("throws only on an action validate rejects", () => {
    expect(() => apply(newMatch(), at("ROLL", PRIYA))).toThrow(/E_NOT_YOUR_TURN/);
  });
});
