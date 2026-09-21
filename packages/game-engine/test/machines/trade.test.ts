// Trade machine (docs/06 "Trade", docs/flows/trade.md).

import { describe, expect, it } from "vitest";

import {
  isTradeBlocking,
  TRADE_BLOCKING_KINDS,
  TRADE_EXPIRY_MS,
  type TradeEvent,
  type TradeMachineState,
  transitionTrade,
} from "../../src/machines/trade";
import { describeIllegalPairs, describeResync, next } from "./support";

const NAVEEN = "p-naveen";
const PRIYA = "p-priya";

const pending = { offerId: "offer-1", from: NAVEEN, to: PRIYA, expiresAtMs: 65_000 };

const S = {
  composing: { kind: "composing", from: NAVEEN, to: PRIYA },
  offered: { kind: "offered", ...pending },
  queued: { kind: "queued", ...pending },
  reviewing: { kind: "reviewing", ...pending },
  accepted: { kind: "accepted", offerId: "offer-1" },
  rejected: { kind: "rejected", offerId: "offer-1" },
  expired: { kind: "expired", offerId: "offer-1" },
  closed: { kind: "closed" },
} satisfies Record<string, TradeMachineState>;

const E = {
  send: { kind: "send", offerId: "offer-1", validBothSides: true, atMs: 5_000 },
  cancel: { kind: "cancel" },
  targetOpened: { kind: "targetOpened", inAnotherModal: false },
  pendingOpened: { kind: "pendingOpened" },
  accept: { kind: "accept", validBothSides: true },
  reject: { kind: "reject" },
  clockTick: { kind: "clockTick", atMs: 65_000 },
  finalised: { kind: "finalised" },
} satisfies Record<string, TradeEvent>;

describe("legal transitions", () => {
  it("composing + send -> offered (valid both sides, expiry = board's 60 s)", () => {
    expect(TRADE_EXPIRY_MS).toBe(60_000);
    expect(next(transitionTrade(S.composing, E.send))).toEqual(S.offered);
  });
  it("composing + cancel -> closed", () => {
    expect(next(transitionTrade(S.composing, E.cancel))).toEqual(S.closed);
  });
  it("offered + targetOpened -> reviewing", () => {
    expect(next(transitionTrade(S.offered, E.targetOpened))).toEqual(S.reviewing);
  });
  it("offered + targetOpened -> queued (target is in another modal, OQ-2)", () => {
    expect(next(transitionTrade(S.offered, { kind: "targetOpened", inAnotherModal: true }))).toEqual(S.queued);
  });
  it("queued + pendingOpened -> reviewing", () => {
    expect(next(transitionTrade(S.queued, E.pendingOpened))).toEqual(S.reviewing);
  });
  it("reviewing + accept -> accepted (revalidated)", () => {
    expect(next(transitionTrade(S.reviewing, E.accept))).toEqual(S.accepted);
  });
  it("reviewing + reject -> rejected", () => {
    expect(next(transitionTrade(S.reviewing, E.reject))).toEqual(S.rejected);
  });
  it.each([S.offered, S.queued, S.reviewing])("$kind + clockTick -> expired (60 s elapsed)", (state) => {
    expect(next(transitionTrade(state, E.clockTick))).toEqual(S.expired);
  });
  it.each([S.accepted, S.rejected, S.expired])("$kind + finalised -> closed", (state) => {
    expect(next(transitionTrade(state, E.finalised))).toEqual(S.closed);
  });
});

describe("guards", () => {
  it("composing + send is refused when either side fails validation (E_TRADE_INVALID)", () => {
    expect(transitionTrade(S.composing, { ...E.send, validBothSides: false })).toEqual({ ok: false, reason: expect.stringContaining("E_TRADE_INVALID") });
  });
  it("composing + send is refused without a partner", () => {
    expect(transitionTrade({ kind: "composing", from: NAVEEN, to: null }, E.send)).toEqual({ ok: false, reason: expect.stringContaining("partner") });
  });
  it("reviewing + accept revalidates: a stale offer is refused with E_TRADE_INVALID", () => {
    expect(transitionTrade(S.reviewing, { kind: "accept", validBothSides: false })).toEqual({ ok: false, reason: expect.stringContaining("E_TRADE_INVALID") });
  });
});

describe("offer clock (rulebook edge case #23: expiry at exactly 60 s)", () => {
  it.each([S.offered, S.queued, S.reviewing])("$kind: a tick before the deadline is an explicit no-op with time remaining", (state) => {
    expect(transitionTrade(state, { kind: "clockTick", atMs: 64_999 })).toEqual({ ok: false, reason: expect.stringContaining("time remains") });
  });
  it.each([S.composing, S.accepted, S.rejected, S.expired, S.closed])("$kind holds no offer clock", (state) => {
    expect(transitionTrade(state, E.clockTick).ok).toBe(false);
  });
});

describe("blocking states", () => {
  it("declares none — the DEAL OFFER card can always be dismissed", () => {
    expect(TRADE_BLOCKING_KINDS).toEqual([]);
    expect(Object.values(S).some(isTradeBlocking)).toBe(false);
  });
});

describe("exhaustiveness", () => {
  it("an event outside the union reaches the never check and throws", () => {
    const bogus = { kind: "COUNTER" } as unknown as TradeEvent;
    expect(() => transitionTrade(S.reviewing, bogus)).toThrow(/unhandled machine case/);
  });
});

describe("illegal pairs", () => {
  const legal = new Set([
    "composing -> send",
    "composing -> cancel",
    "offered -> targetOpened",
    "offered -> clockTick",
    "queued -> pendingOpened",
    "queued -> clockTick",
    "reviewing -> accept",
    "reviewing -> reject",
    "reviewing -> clockTick",
    "accepted -> finalised",
    "rejected -> finalised",
    "expired -> finalised",
  ]);
  describeIllegalPairs(Object.values(S), Object.values(E), legal, transitionTrade);
});

describe("resync", () => {
  describeResync(Object.values(S), E.clockTick, transitionTrade);
});
