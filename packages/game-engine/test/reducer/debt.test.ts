import { describe, expect, it } from "vitest";

import { legalActions } from "../../src/reducer/index";
import type { MatchState } from "../../src/state";
import { ARUN, at, eventsOf, grant, lastEvent, NAVEEN, newMatch, PRIYA, refusal, rollAs, setCash, step } from "../support/match";

/**
 * Naveen (₹50) lands on Priya's Bay Road with one house on each purple tile: rent ₹70 > cash,
 * so a debt opens and the turn enters raiseCash. Naveen also owns Mount Road (5) to mortgage.
 */
function inDebt(): MatchState {
  let state = grant(newMatch(), PRIYA, [1, 2, 3, 13, 14]);
  for (const index of [1, 2, 3, 13, 14]) {
    state.tiles[index]!.houses = 1;
  }
  state.bank.houses -= 5;
  state = grant(state, NAVEEN, [5]);
  state = setCash(state, NAVEEN, 50);
  return rollAs(state, NAVEEN, [1, 1]);
}

describe("debts and raise cash (rulebook §16, docs/flows/raise-cash.md)", () => {
  it("rent the player cannot pay opens a debt and the RENT DUE decision; cash is untouched", () => {
    const state = inDebt();

    expect(state.debts).toHaveLength(1);
    expect(state.debts[0]).toMatchObject({ debtorId: NAVEEN, creditorId: PRIYA, amount: 70 });
    expect(state.players[NAVEEN]!.cash).toBe(50);
    expect(state.turn.stage).toBe("raiseCash");
    expect(lastEvent(state, "rentDue")).toMatchObject({ amount: 70, debtId: state.debts[0]!.id });
  });

  it("while in debt only the raise-cash routes and bankruptcy are legal", () => {
    const state = inDebt();
    const legal = legalActions(state, NAVEEN);

    expect(legal).toEqual(expect.arrayContaining(["MORTGAGE", "SELL", "OFFER_TRADE", "DECLARE_BANKRUPTCY"]));
    expect(legal).not.toContain("ROLL");
    expect(legal).not.toContain("END_TURN");
    expect(legal).not.toContain("BUILD");
    expect(legal).not.toContain("REDEEM");
    expect(legal).not.toContain("PAY_DEBT"); // ₹50 cannot cover ₹70 yet
    expect(refusal(state, at("END_TURN", NAVEEN))).toBe("E_DEBT_BLOCKING");
  });

  it("mortgaging raises the cash; PAY_DEBT then settles the creditor and resumes the turn", () => {
    let state = inDebt();
    state = step(state, { kind: "MORTGAGE", by: NAVEEN, tileIndexes: [5], atMs: 0 }); // +₹1,000
    expect(legalActions(state, NAVEEN)).toContain("PAY_DEBT");
    state = step(state, { kind: "PAY_DEBT", by: NAVEEN, debtId: state.debts[0]!.id, atMs: 0 });

    expect(state.debts).toEqual([]);
    expect(state.players[NAVEEN]!.cash).toBe(50 + 1000 - 70);
    expect(state.players[PRIYA]!.cash).toBe(10000 + 70);
    expect(state.turn.stage).toBe("postRoll");
    expect(lastEvent(state, "debtSettled")).toMatchObject({ amount: 70 });
  });

  it("PAY_DEBT with insufficient cash is refused", () => {
    const state = inDebt();
    expect(refusal(state, { kind: "PAY_DEBT", by: NAVEEN, debtId: state.debts[0]!.id, atMs: 0 })).toBe("E_INSUFFICIENT_CASH");
  });

  it("edge case #6: when every route falls short, only Declare bankruptcy remains", () => {
    let state = inDebt();
    state.tiles[5]!.ownerId = null; // nothing left to mortgage or sell
    const legal = legalActions(state, NAVEEN);
    expect(legal).not.toContain("MORTGAGE");
    expect(legal).not.toContain("SELL");
    expect(legal).toContain("DECLARE_BANKRUPTCY");
  });
});

describe("bankruptcy resolution order (docs/flows/bankruptcy.md, normative)", () => {
  it("to a player creditor: buildings sold, cash and deeds (mortgages intact) and tradeable cards transfer, then elimination", () => {
    let state = inDebt();
    // Give Naveen an estate: Mount Road (5) mortgaged, Anna Salai (6) with a house, two cards.
    state.tiles[5]!.mortgaged = true;
    state = grant(state, NAVEEN, [6]);
    state.rules.sets.buildEvenly = false;
    state.tiles[6]!.houses = 1;
    state.bank.houses -= 1;
    state.players[NAVEEN]!.holdCards.push(
      { id: "card-keep", effect: { kind: "jailPass" }, uses: 1, expires: "never", tradeable: true, grantedRound: 1 },
      { id: "card-drop", effect: { kind: "rentWaiver" }, uses: 1, expires: "never", tradeable: false, grantedRound: 1 },
    );
    const priyaBefore = state.players[PRIYA]!.cash;
    state = step(state, at("DECLARE_BANKRUPTCY", NAVEEN));

    const naveen = state.players[NAVEEN]!;
    expect(naveen.bankrupt).toMatchObject({ out: true, round: 1, owedTo: PRIYA, amount: 70 });
    // 1. The house on Anna Salai (cost 2000, house cost 21 % → 420, sell 50 % → 210) was sold first…
    expect(state.tiles[6]).toMatchObject({ houses: 0, ownerId: PRIYA });
    expect(state.bank.houses).toBe(32 - 5);
    // 2. …then all cash (₹50 + ₹210) went to Priya.
    expect(naveen.cash).toBe(0);
    expect(state.players[PRIYA]!.cash).toBe(priyaBefore + 50 + 210);
    // 3. Deeds transferred with the mortgage intact.
    expect(state.tiles[5]).toMatchObject({ ownerId: PRIYA, mortgaged: true });
    // 4. Only the tradeable card followed.
    expect(state.players[PRIYA]!.holdCards.map((card) => card.id)).toEqual(["card-keep"]);
    expect(naveen.holdCards).toEqual([]);
    // 5. Eliminated: debt cleared, the event names the estate.
    expect(state.debts).toEqual([]);
    expect(lastEvent(state, "bankrupt")).toMatchObject({ playerId: NAVEEN, creditorId: PRIYA, tiles: [5, 6], cashTransferred: 260 });
  });

  it("sells buildings before anything else, in that order, as the log shows", () => {
    let state = inDebt();
    state = grant(state, NAVEEN, [6]);
    state.rules.sets.buildEvenly = false;
    state.tiles[6]!.houses = 2;
    state.bank.houses -= 2;
    state = step(state, at("DECLARE_BANKRUPTCY", NAVEEN));
    // Sell-back proceeds are issued by the bank before the cash transfer: the ledger shows it.
    expect(state.bank.ledger.issued).toBe(20000 + 420); // starting cash, plus two houses sold back at ₹210
  });

  it("with fewer than two solvent players left the match ends as last player standing", () => {
    let state = inDebt();
    state = step(state, at("DECLARE_BANKRUPTCY", NAVEEN));
    expect(state.phase).toBe("ended");
    expect(lastEvent(state, "matchEnded")).toMatchObject({ reason: "lastStanding", standings: [PRIYA, NAVEEN] });
  });

  it("to the bank: cash to the bank, deeds queued for auction next round, every card discarded", () => {
    let state = newMatch({
      players: [
        { id: NAVEEN, name: "Naveen", colour: "gold" },
        { id: PRIYA, name: "Priya", colour: "blue" },
        { id: ARUN, name: "Arun", colour: "green" },
      ],
    });
    state.board.tiles[4] = { kind: "card", name: "Tax office", cardType: "tax", deckId: null, tax: { mode: "flat", flatAmount: 500, percent: 0, percentOf: "cash" } };
    state = grant(state, NAVEEN, [5, 6]);
    state = setCash(state, NAVEEN, 100);
    state.players[NAVEEN]!.holdCards.push({ id: "card-t", effect: { kind: "jailPass" }, uses: 1, expires: "never", tradeable: true, grantedRound: 1 });
    state = rollAs(state, NAVEEN, [1, 3]); // the tax office: ₹500 > ₹100
    expect(state.debts[0]).toMatchObject({ creditorId: "bank" });

    state = step(state, at("DECLARE_BANKRUPTCY", NAVEEN));

    expect(state.players[NAVEEN]!.bankrupt).toMatchObject({ owedTo: "bank" });
    expect(state.bank.ledger.absorbed).toBe(9900 + 100); // setCash absorbed 9,900; the estate's ₹100
    expect(state.tiles[5]!.ownerId).toBeNull();
    expect(state.bank.pendingAuctions).toEqual([{ tileIndex: 5, fromRound: 2 }, { tileIndex: 6, fromRound: 2 }]);
    expect(state.players[PRIYA]!.holdCards).toEqual([]);
    expect(state.phase).toBe("live");
    expect(state.turn.playerId).toBe(PRIYA);
  });

  it("bank-bankruptcy lots open one at a time at the start of the next round", () => {
    let state = newMatch({
      players: [
        { id: NAVEEN, name: "Naveen", colour: "gold" },
        { id: PRIYA, name: "Priya", colour: "blue" },
        { id: ARUN, name: "Arun", colour: "green" },
      ],
    });
    state.board.tiles[4] = { kind: "card", name: "Tax office", cardType: "tax", deckId: null, tax: { mode: "flat", flatAmount: 500, percent: 0, percentOf: "cash" } };
    state = grant(state, NAVEEN, [5, 6]);
    state = setCash(state, NAVEEN, 100);
    state = rollAs(state, NAVEEN, [1, 3]);
    state = step(state, at("DECLARE_BANKRUPTCY", NAVEEN));

    // No lot opens yet: "Auctions begin next round". Priya and Arun finish round 1 on tiles they own.
    expect(state.auction).toBeNull();
    state = grant(state, PRIYA, [3]);
    state = rollAs(state, PRIYA, [1, 2]);
    state = step(state, at("END_TURN", PRIYA));
    state = grant(state, ARUN, [2]);
    state = rollAs(state, ARUN, [1, 1]); // a double: Arun rolls again
    state = step(state, at("END_TURN", ARUN));
    state = grant(state, ARUN, [7]);
    state = rollAs(state, ARUN, [2, 3]); // → 7, own utility
    state = step(state, at("END_TURN", ARUN));

    // Round 2 opens for Priya with the first lot live, at the board's starting price.
    expect(state.round).toBe(2);
    expect(state.auction).toMatchObject({ tileIndex: 5, minBid: 100, resumeStage: "preRoll" });
    expect(lastEvent(state, "auctionOpened")).toMatchObject({ reason: "bankruptcy" });

    state = step(state, { kind: "BID", by: ARUN, amount: 100, atMs: 0 });
    state = step(state, { kind: "TIMER_EXPIRED", scope: "auction", atMs: 1 });
    // The second lot follows immediately; after it the turn resumes at preRoll.
    expect(state.auction).toMatchObject({ tileIndex: 6 });
    state = step(state, { kind: "TIMER_EXPIRED", scope: "auction", atMs: 2 });
    expect(state.auction).toBeNull();
    expect(state.tiles[5]!.ownerId).toBe(ARUN);
    expect(state.tiles[6]!.ownerId).toBeNull();
    expect(state.turn).toMatchObject({ playerId: PRIYA, stage: "preRoll" });
  });

  it("edge case #43: bankruptcy to the bank with auctions off returns the tiles unowned, no auction", () => {
    let state = newMatch({
      players: [
        { id: NAVEEN, name: "Naveen", colour: "gold" },
        { id: PRIYA, name: "Priya", colour: "blue" },
        { id: ARUN, name: "Arun", colour: "green" },
      ],
      rules: { ...newMatch().rules, auction: { enabled: false, startingPrice: 100, bidTimerSeconds: 20 } },
    });
    state.board.tiles[4] = { kind: "card", name: "Tax office", cardType: "tax", deckId: null, tax: { mode: "flat", flatAmount: 500, percent: 0, percentOf: "cash" } };
    state = grant(state, NAVEEN, [5]);
    state = setCash(state, NAVEEN, 100);
    state = rollAs(state, NAVEEN, [1, 3]);
    state = step(state, at("DECLARE_BANKRUPTCY", NAVEEN));

    expect(state.tiles[5]!.ownerId).toBeNull();
    expect(state.bank.pendingAuctions).toEqual([]);
  });

  it("a bankrupt player can never act again; their turns are skipped", () => {
    let state = newMatch({
      players: [
        { id: NAVEEN, name: "Naveen", colour: "gold" },
        { id: PRIYA, name: "Priya", colour: "blue" },
        { id: ARUN, name: "Arun", colour: "green" },
      ],
    });
    state.board.tiles[4] = { kind: "card", name: "Tax office", cardType: "tax", deckId: null, tax: { mode: "flat", flatAmount: 500, percent: 0, percentOf: "cash" } };
    state = setCash(state, NAVEEN, 100);
    state = rollAs(state, NAVEEN, [1, 3]);
    state = step(state, at("DECLARE_BANKRUPTCY", NAVEEN));

    expect(refusal(state, at("ROLL", NAVEEN))).toBe("E_ACTION_ILLEGAL");
    expect(legalActions(state, NAVEEN)).toEqual([]);
    state = grant(state, PRIYA, [3]);
    state = rollAs(state, PRIYA, [1, 2]);
    state = step(state, at("END_TURN", PRIYA));
    state = grant(state, ARUN, [3]);
    state = rollAs(state, ARUN, [1, 2]);
    state = step(state, at("END_TURN", ARUN));
    expect(state.turn.playerId).toBe(PRIYA); // Naveen's seat is skipped
    expect(eventsOf(state, "turnStarted").filter((event) => "playerId" in event && event.playerId === NAVEEN)).toHaveLength(1);
  });

  it("declaring without a debt is refused", () => {
    expect(refusal(newMatch(), at("DECLARE_BANKRUPTCY", NAVEEN))).toBe("E_ACTION_ILLEGAL");
  });
});
