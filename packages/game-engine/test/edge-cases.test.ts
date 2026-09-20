// Rulebook §21 "Edge cases": one test per row the engine owns. Rows owned by the server, the
// client or a later engine task are listed with their owner so the table stays complete and
// nothing is silently skipped.

import { describe, expect, it } from "vitest";

import type { Action } from "../src/actions";
import { moveBackward } from "../src/board";
import { legalActions } from "../src/reducer/index";
import { at, grant, lastEvent, NAVEEN, newMatch, PRIYA, refusal, rollAs, setCash, step } from "./support/match";

const PURPLE = [1, 2, 3, 13, 14];

describe("rulebook §21 — engine rows", () => {
  it("#1 unowned tile with cash < cost: Buy disabled, Pass and Auction remain, no debt", () => {
    const state = rollAs(setCash(newMatch(), NAVEEN, 100), NAVEEN, [1, 1]);
    expect(refusal(state, { kind: "BUY", by: NAVEEN, tileIndex: 2, atMs: 0 })).toBe("E_INSUFFICIENT_CASH");
    expect(refusal(state, { kind: "PASS_BUY", by: NAVEEN, tileIndex: 2, atMs: 0 })).toBe("OK");
    expect(state.debts).toEqual([]);
  });

  it("#2 decline with auctions off: tile stays with the bank; turn continues", () => {
    let state = newMatch({ rules: { ...newMatch().rules, auction: { enabled: false, startingPrice: 100, bidTimerSeconds: 20 } } });
    state = rollAs(state, NAVEEN, [1, 1]);
    state = step(state, { kind: "PASS_BUY", by: NAVEEN, tileIndex: 2, atMs: 0 });
    expect(state.tiles[2]!.ownerId).toBeNull();
    expect(state.turn.stage).toBe("postRoll");
  });

  it("#3 auction with no bids: the bank keeps the tile", () => {
    let state = rollAs(newMatch(), NAVEEN, [1, 1]);
    state = step(state, { kind: "PASS_BUY", by: NAVEEN, tileIndex: 2, atMs: 0 });
    state = step(state, { kind: "TIMER_EXPIRED", scope: "auction", atMs: 1 });
    expect(state.tiles[2]!.ownerId).toBeNull();
    expect(lastEvent(state, "auctionNoSale")).toBeDefined();
  });

  it("#4 cash escrowed on each accepted bid; released when outbid", () => {
    let state = rollAs(newMatch(), NAVEEN, [1, 1]);
    state = step(state, { kind: "PASS_BUY", by: NAVEEN, tileIndex: 2, atMs: 0 });
    state = step(state, { kind: "BID", by: PRIYA, amount: 1400, atMs: 0 });
    expect(state.players[PRIYA]!.cash).toBe(8600);
    state = step(state, { kind: "BID", by: NAVEEN, amount: 1500, atMs: 0 });
    expect(state.players[PRIYA]!.cash).toBe(10000);
  });

  it("#5 equal simultaneous bids: the second is rejected with E_BID_TOO_LOW", () => {
    let state = rollAs(newMatch(), NAVEEN, [1, 1]);
    state = step(state, { kind: "PASS_BUY", by: NAVEEN, tileIndex: 2, atMs: 0 });
    state = step(state, { kind: "BID", by: PRIYA, amount: 1400, atMs: 0 });
    expect(refusal(state, { kind: "BID", by: NAVEEN, amount: 1400, atMs: 0 })).toBe("E_BID_TOO_LOW");
  });

  it("#6 rent exceeds cash and every route: only Declare bankruptcy remains", () => {
    let state = grant(newMatch(), PRIYA, PURPLE);
    for (const index of PURPLE) state.tiles[index]!.houses = 1;
    state.bank.houses -= 5;
    state = setCash(state, NAVEEN, 10);
    state = rollAs(state, NAVEEN, [1, 1]);
    const legal = legalActions(state, NAVEEN);
    expect(legal).toContain("DECLARE_BANKRUPTCY");
    expect(legal).not.toContain("MORTGAGE");
    expect(legal).not.toContain("PAY_DEBT");
  });

  it("#7 a creditor who went bankrupt: the payment does not vanish — it goes to the bank", () => {
    let state = grant(newMatch(), PRIYA, PURPLE);
    for (const index of PURPLE) state.tiles[index]!.houses = 1;
    state.bank.houses -= 5;
    state = grant(state, NAVEEN, [5]);
    state = setCash(state, NAVEEN, 50);
    state = rollAs(state, NAVEEN, [1, 1]); // Naveen owes Priya ₹70
    state.players[PRIYA]!.bankrupt = { out: true, round: 1, owedTo: "bank", amount: 0 }; // (creditor eliminated meanwhile)
    for (const index of PURPLE) { state.tiles[index]!.ownerId = null; state.tiles[index]!.houses = 0; }
    state.bank.houses += 5;
    state = step(state, { kind: "MORTGAGE", by: NAVEEN, tileIndexes: [5], atMs: 0 });
    const absorbedBefore = state.bank.ledger.absorbed;
    state = step(state, { kind: "PAY_DEBT", by: NAVEEN, debtId: state.debts[0]!.id, atMs: 0 });
    expect(state.bank.ledger.absorbed).toBe(absorbedBefore + 70);
  });

  it("#8 owner in jail collects rent only with the corner's toggle on", () => {
    let state = grant(newMatch(), PRIYA, [3]);
    state.players[PRIYA]!.jail = { in: true, roundsHeld: 0 };
    state.players[PRIYA]!.position = 8;
    state = rollAs(state, NAVEEN, [1, 2]);
    expect(state.players[NAVEEN]!.cash).toBe(10000 - 30); // 2.5 % of ₹1,200
    let off = grant(newMatch(), PRIYA, [3]);
    off.players[PRIYA]!.jail = { in: true, roundsHeld: 0 };
    const jail = off.board.tiles[8];
    if (jail?.kind === "corner") jail.collectRentWhileHeld = false;
    off = rollAs(off, NAVEEN, [1, 2]);
    expect(off.players[NAVEEN]!.cash).toBe(10000);
  });

  it("#9 third double with no jail: turn ends, no penalty", () => {
    let state = newMatch();
    state.board.tiles[8] = { kind: "corner", name: "Plain", cornerType: "none", drawMode: "fixed", getOut: null, stayHere: null, getIn: null, blockActionsWhileHeld: false, collectRentWhileHeld: true };
    state = rollAs(state, NAVEEN, [2, 2]);
    state = step(state, at("END_TURN", NAVEEN));
    state = rollAs(state, NAVEEN, [2, 2]);
    state = step(state, at("END_TURN", NAVEEN));
    state = rollAs(state, NAVEEN, [1, 1]);
    state = step(state, at("END_TURN", NAVEEN));
    expect(state.players[NAVEEN]!.jail.in).toBe(false);
    expect(state.turn.playerId).toBe(PRIYA);
  });

  it("#11 a chosen dice total is never a double: no extra roll", () => {
    let state = grant(newMatch(), NAVEEN, [6]); // own Anna Salai so the landing resolves
    state.players[NAVEEN]!.holdCards.push({ id: "card-cd", effect: { kind: "chooseDice" }, uses: 1, expires: "never", tradeable: false, grantedRound: 1 });
    const choose: Action = { kind: "CHOOSE_DICE", by: NAVEEN, total: 6, atMs: 0 };
    state = step(state, choose);
    expect(lastEvent(state, "diceRolled")).toMatchObject({ chosen: true, doubles: false });
    expect(state.players[NAVEEN]!.position).toBe(6);
    state = step(state, at("END_TURN", NAVEEN));
    expect(state.turn.playerId).toBe(PRIYA);
  });

  it("#12 moving backward across index 0 pays no bonus (board maths)", () => {
    expect(moveBackward(2, 3, 16)).toEqual({ to: 15, passedStart: false });
  });

  it("#15 supply exhausted: nothing is built, E_SUPPLY_EXHAUSTED", () => {
    let state = grant(newMatch(), NAVEEN, PURPLE);
    state = rollAs(state, NAVEEN, [1, 2]);
    state.bank.houses = 0;
    for (const index of [5, 6, 9, 10, 11]) { state.tiles[index]!.ownerId = PRIYA; state.tiles[index]!.houses = 4; }
    state.rules.sets.buildEvenly = false;
    state.tiles[1]!.houses = 4; state.tiles[2]!.houses = 4; state.tiles[3]!.houses = 4;
    expect(refusal(state, { kind: "BUILD", by: NAVEEN, tileIndex: 13, what: "house", atMs: 0 })).toBe("E_SUPPLY_EXHAUSTED");
  });

  it("#16 hotel with only three houses standing is rejected", () => {
    let state = grant(newMatch(), NAVEEN, PURPLE);
    state.rules.sets.buildEvenly = false;
    state = rollAs(state, NAVEEN, [1, 2]);
    state.tiles[1]!.houses = 3;
    state.bank.houses -= 3;
    expect(refusal(state, { kind: "BUILD", by: NAVEEN, tileIndex: 1, what: "hotel", atMs: 0 })).toBe("E_BUILD_HOUSE_LIMIT");
  });

  it("#17 even-build rejects a 2nd house while others have 1 (or 0)", () => {
    let state = grant(newMatch(), NAVEEN, PURPLE);
    state = rollAs(state, NAVEEN, [1, 2]);
    state = step(state, { kind: "BUILD", by: NAVEEN, tileIndex: 1, what: "house", atMs: 0 });
    expect(refusal(state, { kind: "BUILD", by: NAVEEN, tileIndex: 1, what: "house", atMs: 0 })).toBe("E_BUILD_UNEVEN");
  });

  it("#18 mortgaging a tile with houses is rejected", () => {
    let state = grant(newMatch(), NAVEEN, PURPLE);
    state = rollAs(state, NAVEEN, [1, 2]);
    state = step(state, { kind: "BUILD", by: NAVEEN, tileIndex: 1, what: "house", atMs: 0 });
    expect(refusal(state, { kind: "MORTGAGE", by: NAVEEN, tileIndexes: [1], atMs: 0 })).toBe("E_MORTGAGE_HAS_BUILDINGS");
  });

  it("#19 mortgage breaks the set mid-build: further builds are rejected, placed houses stay", () => {
    let state = grant(newMatch(), NAVEEN, PURPLE);
    state = rollAs(state, NAVEEN, [1, 2]);
    state = step(state, { kind: "BUILD", by: NAVEEN, tileIndex: 1, what: "house", atMs: 0 });
    state = step(state, { kind: "MORTGAGE", by: NAVEEN, tileIndexes: [13, 14, 3], atMs: 0 }); // 2 of 5 left counting
    expect(refusal(state, { kind: "BUILD", by: NAVEEN, tileIndex: 2, what: "house", atMs: 0 })).toBe("E_BUILD_NEEDS_SET");
    expect(state.tiles[1]!.houses).toBe(1);
  });

  it("#20 redeem with insufficient cash: refused, no debt", () => {
    let state = grant(newMatch(), NAVEEN, [1]);
    state.tiles[1]!.mortgaged = true;
    state = setCash(state, NAVEEN, 10);
    expect(refusal(state, { kind: "REDEEM", by: NAVEEN, tileIndexes: [1], atMs: 0 })).toBe("E_REDEEM_INSUFFICIENT");
    expect(state.debts).toEqual([]);
  });

  it("#21 a trade leaving a side with negative cash is rejected at validation", () => {
    const state = grant(newMatch(), NAVEEN, [1]);
    expect(refusal(state, { kind: "OFFER_TRADE", by: NAVEEN, to: PRIYA, give: { cash: 10001, tileIndexes: [], holdCardIds: [] }, get: { cash: 0, tileIndexes: [], holdCardIds: [] }, atMs: 0 })).toBe("E_TRADE_INVALID");
  });

  it("#22 a trade including a tile with buildings is rejected", () => {
    let state = grant(newMatch(), NAVEEN, PURPLE);
    state.rules.sets.buildEvenly = false;
    state.tiles[1]!.houses = 1;
    state.bank.houses -= 1;
    expect(refusal(state, { kind: "OFFER_TRADE", by: NAVEEN, to: PRIYA, give: { cash: 0, tileIndexes: [1], holdCardIds: [] }, get: { cash: 100, tileIndexes: [], holdCardIds: [] }, atMs: 0 })).toBe("E_TRADE_INVALID");
  });

  it("#23 an offer accepted after 60 s is refused with E_OFFER_EXPIRED", () => {
    let state = grant(newMatch(), NAVEEN, [1]);
    state = step(state, { kind: "OFFER_TRADE", by: NAVEEN, to: PRIYA, give: { cash: 0, tileIndexes: [1], holdCardIds: [] }, get: { cash: 100, tileIndexes: [], holdCardIds: [] }, atMs: 0 });
    expect(refusal(state, { kind: "RESPOND_TRADE", by: PRIYA, offerId: state.offers[0]!.id, accept: true, atMs: 60_000 })).toBe("E_OFFER_EXPIRED");
  });

  it("#25 the turn clock is paused during an auction", () => {
    let state = rollAs(newMatch(), NAVEEN, [1, 1]);
    state = step(state, { kind: "PASS_BUY", by: NAVEEN, tileIndex: 2, atMs: 0 });
    expect(refusal(state, { kind: "TIMER_EXPIRED", scope: "turn", atMs: 1 })).toBe("E_ACTION_ILLEGAL");
  });

  it("#26 turn expiry with raise cash open: turn passes, debt persists, reopens next turn", () => {
    let state = grant(newMatch(), PRIYA, PURPLE);
    for (const index of PURPLE) state.tiles[index]!.houses = 1;
    state.bank.houses -= 5;
    state = setCash(state, NAVEEN, 10);
    state = rollAs(state, NAVEEN, [1, 1]);
    state = step(state, { kind: "TIMER_EXPIRED", scope: "turn", atMs: 1 });
    expect(state.debts).toHaveLength(1);
    expect(state.turn.playerId).toBe(PRIYA);
  });

  it("#30 only one solvent player remains: the match ends as last player standing", () => {
    let state = grant(newMatch(), PRIYA, PURPLE);
    for (const index of PURPLE) state.tiles[index]!.houses = 1;
    state.bank.houses -= 5;
    state = setCash(state, NAVEEN, 10);
    state = rollAs(state, NAVEEN, [1, 1]);
    state = step(state, at("DECLARE_BANKRUPTCY", NAVEEN));
    expect(lastEvent(state, "matchEnded")).toMatchObject({ reason: "lastStanding" });
  });

  it("#32 round cap reached mid-round: the round completes first", () => {
    let state = newMatch({ rules: { ...newMatch().rules, rounds: { cap: 1, turnTimerSeconds: null } } });
    state = rollAs(state, NAVEEN, [1, 3]);
    state = step(state, at("END_TURN", NAVEEN));
    expect(state.phase).toBe("live");
  });

  it("#33 net-worth tie: most tiles → most buildings → lowest seat", () => {
    let state = newMatch({ rules: { ...newMatch().rules, rounds: { cap: 1, turnTimerSeconds: null } } });
    state = grant(state, PRIYA, [1]);
    state = setCash(state, NAVEEN, 11400);
    state = rollAs(state, NAVEEN, [1, 3]);
    state = step(state, at("END_TURN", NAVEEN));
    state = rollAs(state, PRIYA, [1, 3]);
    state = step(state, at("END_TURN", PRIYA));
    expect(lastEvent(state, "matchEnded")).toMatchObject({ standings: [PRIYA, NAVEEN] });
  });

  it("#40 a round-scoped hold card is discarded at the start of the next round", () => {
    let state = newMatch();
    state.players[NAVEEN]!.holdCards.push({ id: "card-r", effect: { kind: "rentWaiver" }, uses: 1, expires: "round", tradeable: false, grantedRound: 1 });
    state = rollAs(state, NAVEEN, [1, 3]);
    state = step(state, at("END_TURN", NAVEEN));
    state = rollAs(state, PRIYA, [1, 3]);
    state = step(state, at("END_TURN", PRIYA)); // round 2 opens for Naveen
    expect(state.players[NAVEEN]!.holdCards).toEqual([]);
  });

  it("#43 bankruptcy to the bank with auctions off: tiles return unowned, no auction", () => {
    let state = newMatch({ rules: { ...newMatch().rules, auction: { enabled: false, startingPrice: 100, bidTimerSeconds: 20 } } });
    state.board.tiles[4] = { kind: "card", name: "Tax office", cardType: "tax", deckId: null, tax: { mode: "flat", flatAmount: 500, percent: 0, percentOf: "cash" } };
    state = grant(state, NAVEEN, [5]);
    state = setCash(state, NAVEEN, 100);
    state = rollAs(state, NAVEEN, [1, 3]);
    state = step(state, at("DECLARE_BANKRUPTCY", NAVEEN));
    expect(state.tiles[5]!.ownerId).toBeNull();
    expect(state.bank.pendingAuctions).toEqual([]);
  });
});

describe("rulebook §21 — rows owned elsewhere", () => {
  // Each row is named with its owner so the table is accounted for in full. A row moves into the
  // engine block above when its owner task lands.
  const owners: Record<number, string> = {
    10: "C6 (card effects: sendToJail with no jail tile logs noJailOnBoard)",
    13: "C6 (card effects: moveAnywhere onto an owned tile)",
    14: "C6 (card effects: moveAnywhere onto the start tile)",
    24: "OQ-2 / D4 server (queued offer while the target is in a modal)",
    27: "D4 server (disconnect grace and auto-play)",
    28: "D4 server (host transfer)",
    29: "D4 server (lobby closes when the host leaves)",
    31: "D4 server (abandoned after every grace expires)",
    34: "D3 API (running matches keep their frozen version, D5)",
    35: "D3 API (unpublish leaves running matches alone)",
    36: "D3 API (published versions carry copies of decks and rules)",
    37: "C6 (dice-number deck fallback)",
    38: "C6 / F2 (empty deck logs 'empty deck'; publish warning)",
    39: "D1/D5 (rules come from the frozen version; not reachable)",
    41: "C6 (forceTradeAccept on a player who cannot pay)",
    42: "C6 (zeroCash on a player who owes a debt)",
    44: "E7 / offline-local-mode (handover cover skips a bankrupt player)",
    45: "F5 (fast mode changes no rule)",
  };

  it("accounts for every one of the 45 rows exactly once", () => {
    const engineRows = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 15, 16, 17, 18, 19, 20, 21, 22, 23, 25, 26, 30, 32, 33, 40, 43];
    const all = [...engineRows, ...Object.keys(owners).map(Number)].sort((a, b) => a - b);
    expect(all).toEqual(Array.from({ length: 45 }, (_, i) => i + 1));
  });
});
