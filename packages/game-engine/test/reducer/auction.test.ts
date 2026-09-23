import { describe, expect, it } from "vitest";

import type { Action } from "../../src/actions";
import type { MatchState } from "../../src/state";
import { ARUN, at, lastEvent, NAVEEN, newMatch, PRIYA, refusal, rollAs, setCash, step } from "../support/match";

function threePlayers(): MatchState {
  return newMatch({
    players: [
      { id: NAVEEN, name: "Naveen", colour: "gold" },
      { id: PRIYA, name: "Priya", colour: "blue" },
      { id: ARUN, name: "Arun", colour: "green" },
    ],
  });
}

/** Naveen declines Bay Road (₹1,400): an auction opens with everyone, including him, bidding. */
function openLot(): MatchState {
  let state = rollAs(threePlayers(), NAVEEN, [1, 1]);
  return step(state, { kind: "PASS_BUY", by: NAVEEN, tileIndex: 2, atMs: 0 });
}

const bid = (by: string, amount: number): Action => ({ kind: "BID", by, amount, atMs: 0 });
const expire: Action = { kind: "TIMER_EXPIRED", scope: "auction", atMs: 20_000 };

describe("opening (rulebook §10)", () => {
  it("lists every solvent player as a bidder, including the decliner", () => {
    const state = openLot();
    expect(lastEvent(state, "auctionOpened")).toMatchObject({ tileIndex: 2, minBid: 1400, bidders: [NAVEEN, PRIYA, ARUN], reason: "declined" });
  });

  it("excludes a player who holds an unresolved debt", () => {
    let state = threePlayers();
    state.debts.push({ id: "d-x", debtorId: ARUN, creditorId: "bank", amount: 50, createdRound: 1, payTo: "creditor" });
    state = rollAs(state, NAVEEN, [1, 1]);
    state = step(state, { kind: "PASS_BUY", by: NAVEEN, tileIndex: 2, atMs: 0 });
    expect(lastEvent(state, "auctionOpened")).toMatchObject({ bidders: [NAVEEN, PRIYA] });
    expect(refusal(state, bid(ARUN, 1400))).toBe("E_DEBT_BLOCKING");
  });
});

describe("bidding (docs/06 'Auction')", () => {
  it("refuses a bid below max(minBid, leading + 1) with E_BID_TOO_LOW", () => {
    let state = openLot();
    expect(refusal(state, bid(PRIYA, 1399))).toBe("E_BID_TOO_LOW");
    state = step(state, bid(PRIYA, 1400));
    expect(refusal(state, bid(ARUN, 1400))).toBe("E_BID_TOO_LOW");
    expect(refusal(state, bid(ARUN, 1401))).toBe("OK");
  });

  it("refuses a bid above the bidder's cash with E_BID_OVER_CASH", () => {
    let state = openLot();
    state = setCash(state, PRIYA, 1500);
    expect(refusal(state, bid(PRIYA, 1501))).toBe("E_BID_OVER_CASH");
  });

  it("escrows the leading bid and releases it when outbid (edge case #4)", () => {
    let state = openLot();
    state = step(state, bid(PRIYA, 1400));
    expect(state.players[PRIYA]!.cash).toBe(10000 - 1400);
    expect(state.auction).toMatchObject({ leadingBid: 1400, leadingBidderId: PRIYA, escrow: { [PRIYA]: 1400 } });

    state = step(state, bid(ARUN, 1500));
    expect(state.players[PRIYA]!.cash).toBe(10000); // released
    expect(state.players[ARUN]!.cash).toBe(10000 - 1500);
    expect(state.auction!.escrow).toEqual({ [ARUN]: 1500 });
  });

  it("a leader may raise their own bid; their escrow is replaced, not doubled", () => {
    let state = openLot();
    state = step(state, bid(PRIYA, 1400));
    state = step(state, bid(PRIYA, 1600));
    expect(state.players[PRIYA]!.cash).toBe(10000 - 1600);
    expect(state.auction!.escrow).toEqual({ [PRIYA]: 1600 });
  });

  it("edge case #5: of two equal bids, the second is refused as too low", () => {
    let state = openLot();
    state = step(state, bid(PRIYA, 2000));
    expect(refusal(state, bid(ARUN, 2000))).toBe("E_BID_TOO_LOW");
  });

  it("passing is final for the lot (E_AUCTION_PASSED)", () => {
    let state = openLot();
    state = step(state, at("PASS_BID", ARUN));
    expect(refusal(state, bid(ARUN, 1400))).toBe("E_AUCTION_PASSED");
    expect(refusal(state, at("PASS_BID", ARUN))).toBe("E_AUCTION_PASSED");
  });
});

describe("resolution", () => {
  it("the clock expiring hands the tile to the leader, who pays the bank from escrow (AUCTION WON)", () => {
    let state = openLot();
    state = step(state, bid(PRIYA, 1450));
    state = step(state, expire);

    expect(state.auction).toBeNull();
    expect(state.tiles[2]).toMatchObject({ ownerId: PRIYA, underAuction: false });
    expect(state.players[PRIYA]!.cash).toBe(10000 - 1450);
    expect(state.bank.ledger.absorbed).toBe(1450);
    expect(lastEvent(state, "auctionWon")).toMatchObject({ playerId: PRIYA, amount: 1450 });
    expect(state.turn).toMatchObject({ playerId: NAVEEN, stage: "postRoll" });
  });

  it("resolves early when every other bidder has passed", () => {
    let state = openLot();
    state = step(state, bid(PRIYA, 1400));
    state = step(state, at("PASS_BID", NAVEEN));
    state = step(state, at("PASS_BID", ARUN));
    expect(state.auction).toBeNull();
    expect(state.tiles[2]!.ownerId).toBe(PRIYA);
  });

  it("edge case #3: no bids at all — the bank keeps the tile", () => {
    let state = openLot();
    state = step(state, expire);
    expect(state.tiles[2]!.ownerId).toBeNull();
    expect(lastEvent(state, "auctionNoSale")).toMatchObject({ tileIndex: 2 });
    expect(state.turn.stage).toBe("postRoll");
  });

  it("everyone passing with no bid also ends as no sale", () => {
    let state = openLot();
    for (const id of [NAVEEN, PRIYA, ARUN]) {
      state = step(state, at("PASS_BID", id));
    }
    expect(state.auction).toBeNull();
    expect(lastEvent(state, "auctionNoSale")).toBeDefined();
  });

  it("no auction, no bids: E_AUCTION_OVER", () => {
    const state = newMatch();
    expect(refusal(state, bid(PRIYA, 100))).toBe("E_AUCTION_OVER");
    expect(refusal(state, expire)).toBe("E_AUCTION_OVER");
  });
});
