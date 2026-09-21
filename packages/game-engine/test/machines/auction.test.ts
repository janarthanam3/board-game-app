// Auction machine (docs/06 "Auction", docs/flows/auction.md).

import { describe, expect, it } from "vitest";

import {
  AUCTION_BLOCKING_KINDS,
  type AuctionEvent,
  type AuctionMachineState,
  isAuctionBlocking,
  transitionAuction,
} from "../../src/machines/auction";
import { describeIllegalPairs, describeResync, next } from "./support";

const NAVEEN = "p-naveen";
const PRIYA = "p-priya";
const ARUN = "p-arun";

const S = {
  opening: { kind: "opening", tileIndex: 2 },
  bidding: {
    kind: "bidding",
    tileIndex: 2,
    minBid: 1400,
    leadingBid: 0,
    leadingBidderId: null,
    bidders: [NAVEEN, PRIYA, ARUN],
    passed: [],
    bidTimerMs: 15_000,
    clockMs: 15_000,
  },
  resolving: { kind: "resolving", tileIndex: 2, winnerId: PRIYA, amount: 1500 },
  noSale: { kind: "noSale", tileIndex: 2 },
  closed: { kind: "closed", tileIndex: 2, outcome: "sold" },
} satisfies Record<string, AuctionMachineState>;

const E = {
  opened: { kind: "opened", minBid: 1400, bidders: [NAVEEN, PRIYA, ARUN], bidTimerMs: 15_000 },
  bid: { kind: "bid", by: PRIYA, amount: 1400, cash: 10_000, debtOpen: false },
  pass: { kind: "pass", by: ARUN },
  clockExpired: { kind: "clockExpired" },
  winnerPaid: { kind: "winnerPaid" },
  bankKeeps: { kind: "bankKeeps" },
} satisfies Record<string, AuctionEvent>;

const led: AuctionMachineState = { ...S.bidding, leadingBid: 1400, leadingBidderId: PRIYA, clockMs: 9_000 };

describe("legal transitions", () => {
  it("opening + opened -> bidding (minBid set, clock = bid timer, bidders = solvent players)", () => {
    expect(next(transitionAuction(S.opening, E.opened))).toEqual(S.bidding);
  });
  it("bidding + bid -> bidding (leading moves, clock resets to the full bid timer)", () => {
    expect(next(transitionAuction(led, { kind: "bid", by: ARUN, amount: 1500, cash: 10_000, debtOpen: false }))).toEqual({
      ...led,
      leadingBid: 1500,
      leadingBidderId: ARUN,
      clockMs: 15_000,
    });
  });
  it("bidding + pass -> bidding (bidder removed)", () => {
    expect(next(transitionAuction(S.bidding, E.pass))).toEqual({ ...S.bidding, passed: [ARUN] });
  });
  it("bidding + pass -> resolving (one bidder left, holding the leading bid)", () => {
    const afterOne = next(transitionAuction(led, { kind: "pass", by: NAVEEN }));
    expect(next(transitionAuction(afterOne, { kind: "pass", by: ARUN }))).toEqual({
      kind: "resolving",
      tileIndex: 2,
      winnerId: PRIYA,
      amount: 1400,
    });
  });
  it("bidding + pass -> noSale (every bidder passed with no bid)", () => {
    let state: AuctionMachineState = S.bidding;
    state = next(transitionAuction(state, { kind: "pass", by: NAVEEN }));
    state = next(transitionAuction(state, { kind: "pass", by: PRIYA }));
    expect(next(transitionAuction(state, { kind: "pass", by: ARUN }))).toEqual(S.noSale);
  });
  it("bidding + clockExpired -> resolving (a leader exists)", () => {
    expect(next(transitionAuction(led, E.clockExpired))).toEqual({ kind: "resolving", tileIndex: 2, winnerId: PRIYA, amount: 1400 });
  });
  it("bidding + clockExpired -> noSale (no bids)", () => {
    expect(next(transitionAuction(S.bidding, E.clockExpired))).toEqual(S.noSale);
  });
  it("resolving + winnerPaid -> closed (winner pays bank, deed transfers)", () => {
    expect(next(transitionAuction(S.resolving, E.winnerPaid))).toEqual({ kind: "closed", tileIndex: 2, outcome: "sold" });
  });
  it("noSale + bankKeeps -> closed (bank keeps the tile)", () => {
    expect(next(transitionAuction(S.noSale, E.bankKeeps))).toEqual({ kind: "closed", tileIndex: 2, outcome: "noSale" });
  });
});

describe("BID validation (docs/06: amount ≥ max(minBid, leading + 1), ≤ cash, not passed, no debt)", () => {
  it("refuses a bid below minBid", () => {
    expect(transitionAuction(S.bidding, { ...E.bid, amount: 1399 })).toEqual({ ok: false, reason: expect.stringContaining("E_BID_TOO_LOW") });
  });
  it("refuses a bid equal to the leading bid (rulebook edge case #5)", () => {
    expect(transitionAuction(led, { kind: "bid", by: ARUN, amount: 1400, cash: 10_000, debtOpen: false })).toEqual({
      ok: false,
      reason: expect.stringContaining("E_BID_TOO_LOW"),
    });
  });
  it("accepts leading + 1", () => {
    expect(transitionAuction(led, { kind: "bid", by: ARUN, amount: 1401, cash: 10_000, debtOpen: false }).ok).toBe(true);
  });
  it("refuses a bid above the bidder's cash", () => {
    expect(transitionAuction(S.bidding, { ...E.bid, amount: 1500, cash: 1499 })).toEqual({ ok: false, reason: expect.stringContaining("E_BID_OVER_CASH") });
  });
  it("refuses a bid from a bidder who passed (passing is final for the lot)", () => {
    const passed = next(transitionAuction(S.bidding, { kind: "pass", by: PRIYA }));
    expect(transitionAuction(passed, E.bid)).toEqual({ ok: false, reason: expect.stringContaining("E_AUCTION_PASSED") });
  });
  it("refuses a second pass from the same bidder", () => {
    const passed = next(transitionAuction(S.bidding, { kind: "pass", by: PRIYA }));
    expect(transitionAuction(passed, { kind: "pass", by: PRIYA })).toEqual({ ok: false, reason: expect.stringContaining("E_AUCTION_PASSED") });
  });
  it("refuses a bidder with an unresolved debt", () => {
    expect(transitionAuction(S.bidding, { ...E.bid, debtOpen: true })).toEqual({ ok: false, reason: expect.stringContaining("E_DEBT_BLOCKING") });
  });
  it("refuses a player who is not among the lot's bidders", () => {
    expect(transitionAuction(S.bidding, { ...E.bid, by: "p-stranger" })).toEqual({ ok: false, reason: expect.stringContaining("not a bidder") });
    expect(transitionAuction(S.bidding, { kind: "pass", by: "p-stranger" })).toEqual({ ok: false, reason: expect.stringContaining("not a bidder") });
  });
  it("the leader may raise their own bid", () => {
    expect(next(transitionAuction(led, { kind: "bid", by: PRIYA, amount: 1600, cash: 10_000, debtOpen: false }))).toMatchObject({
      leadingBid: 1600,
      leadingBidderId: PRIYA,
    });
  });
});

describe("clock (docs/flows/auction.md invariants 1–2)", () => {
  it("a bid always resets the clock to the board's full bid timer", () => {
    const state = next(transitionAuction({ ...S.bidding, clockMs: 800 }, E.bid));
    expect(state.kind === "bidding" && state.clockMs).toBe(15_000);
  });
  it("the clock only expires in bidding; every other state ignores it explicitly", () => {
    for (const state of [S.opening, S.resolving, S.noSale, S.closed]) {
      expect(transitionAuction(state, E.clockExpired).ok).toBe(false);
    }
  });
});

describe("blocking states", () => {
  it("declares none — Skip on the AUCTION LIVE card always stays out", () => {
    expect(AUCTION_BLOCKING_KINDS).toEqual([]);
    expect(Object.values(S).some(isAuctionBlocking)).toBe(false);
  });
});

describe("exhaustiveness", () => {
  it("an event outside the union reaches the never check and throws", () => {
    const bogus = { kind: "WITHDRAW" } as unknown as AuctionEvent;
    expect(() => transitionAuction(S.bidding, bogus)).toThrow(/unhandled machine case/);
  });
});

describe("illegal pairs", () => {
  const legal = new Set([
    "opening -> opened",
    "bidding -> bid",
    "bidding -> pass",
    "bidding -> clockExpired",
    "resolving -> winnerPaid",
    "noSale -> bankKeeps",
  ]);
  describeIllegalPairs(Object.values(S), Object.values(E), legal, transitionAuction);
});

describe("resync", () => {
  describeResync([...Object.values(S), led], E.clockExpired, transitionAuction);
});
