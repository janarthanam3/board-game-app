// Turn machine (docs/06 "Turn", docs/flows/turn.md). One test per legal transition, named
// `<from> + <event> -> <to>`; illegal pairs, timer expiry and resync are generated per state.

import { describe, expect, it } from "vitest";

import {
  isTurnBlocking,
  TURN_BLOCKING_KINDS,
  transitionTurn,
  type TurnEvent,
  type TurnMachineState,
  turnTimerDefaults,
} from "../../src/machines/turn";
import { describeIllegalPairs, describeResync, next } from "./support";

const S = {
  turnStart: { kind: "turnStart" },
  jailChoice: { kind: "jailChoice" },
  preRoll: { kind: "preRoll" },
  rolling: { kind: "rolling" },
  moving: { kind: "moving", from: 0, to: 5 },
  landing: { kind: "landing", tileIndex: 5 },
  decision: { kind: "decision", tileIndex: 5 },
  payment: { kind: "payment", amount: 1200, creditorId: "p-karthik" },
  cardDraw: { kind: "cardDraw" },
  cornerEffect: { kind: "cornerEffect" },
  auction: { kind: "auction", tileIndex: 5 },
  raiseCash: { kind: "raiseCash", debtId: "debt-1" },
  postRoll: { kind: "postRoll", dice: [3, 4], doublesThisTurn: 0 },
  jail: { kind: "jail" },
  bankrupt: { kind: "bankrupt" },
  turnEnd: { kind: "turnEnd" },
} satisfies Record<string, TurnMachineState>;

const E = {
  turnOpened: { kind: "turnOpened", inJail: false },
  jailReleased: { kind: "jailReleased", how: "bail" },
  jailStays: { kind: "jailStays" },
  roll: { kind: "roll", debtOpen: false },
  sideAction: { kind: "sideAction", action: "BUILD", debtOpen: false, valid: true },
  diceResolved: { kind: "diceResolved", from: 0, to: 5 },
  tokenArrived: { kind: "tokenArrived" },
  landingResolved: { kind: "landingResolved", outcome: { kind: "nothing" } },
  buy: { kind: "buy" },
  pass: { kind: "pass", auctionsOn: true },
  paymentAttempted: { kind: "paymentAttempted", cash: 5000, debtId: "debt-1" },
  effectApplied: { kind: "effectApplied" },
  cornerResolved: { kind: "cornerResolved", sentToJail: false },
  auctionResolved: { kind: "auctionResolved" },
  debtSettled: { kind: "debtSettled", cash: 2000, debt: 1200 },
  declareBankruptcy: { kind: "declareBankruptcy" },
  rollResolved: { kind: "rollResolved", dice: [3, 4], doublesThisTurn: 0, chosen: false, boardHasJail: true },
  jailed: { kind: "jailed" },
  eliminated: { kind: "eliminated" },
  turnTimerExpired: { kind: "turnTimerExpired" },
} satisfies Record<string, TurnEvent>;

const freshPostRoll: TurnMachineState = { kind: "postRoll", dice: null, doublesThisTurn: 0 };

describe("legal transitions", () => {
  it("turnStart + turnOpened -> preRoll (not in jail)", () => {
    expect(next(transitionTurn(S.turnStart, E.turnOpened))).toEqual(S.preRoll);
  });
  it("turnStart + turnOpened -> jailChoice (in jail)", () => {
    expect(next(transitionTurn(S.turnStart, { kind: "turnOpened", inJail: true }))).toEqual(S.jailChoice);
  });
  it.each(["bail", "double", "passCard", "roundsServed"] as const)("jailChoice + jailReleased(%s) -> preRoll", (how) => {
    expect(next(transitionTurn(S.jailChoice, { kind: "jailReleased", how }))).toEqual(S.preRoll);
  });
  it("jailChoice + jailStays -> turnEnd", () => {
    expect(next(transitionTurn(S.jailChoice, E.jailStays))).toEqual(S.turnEnd);
  });
  it("preRoll + roll -> rolling", () => {
    expect(next(transitionTurn(S.preRoll, E.roll))).toEqual(S.rolling);
  });
  it.each(["BUILD", "SELL", "MORTGAGE", "REDEEM", "TRADE"] as const)("preRoll + sideAction(%s) -> preRoll", (action) => {
    expect(next(transitionTurn(S.preRoll, { kind: "sideAction", action, debtOpen: false, valid: true }))).toEqual(S.preRoll);
  });
  it("rolling + diceResolved -> moving", () => {
    expect(next(transitionTurn(S.rolling, E.diceResolved))).toEqual(S.moving);
  });
  it("moving + tokenArrived -> landing (on the destination tile)", () => {
    expect(next(transitionTurn(S.moving, E.tokenArrived))).toEqual(S.landing);
  });
  it("landing + landingResolved(unowned) -> decision", () => {
    expect(next(transitionTurn(S.landing, { kind: "landingResolved", outcome: { kind: "unowned" } }))).toEqual(S.decision);
  });
  it("landing + landingResolved(rentDue) -> payment", () => {
    const event: TurnEvent = { kind: "landingResolved", outcome: { kind: "rentDue", amount: 1200, creditorId: "p-karthik" } };
    expect(next(transitionTurn(S.landing, event))).toEqual(S.payment);
  });
  it("landing + landingResolved(card) -> cardDraw", () => {
    expect(next(transitionTurn(S.landing, { kind: "landingResolved", outcome: { kind: "card" } }))).toEqual(S.cardDraw);
  });
  it("landing + landingResolved(corner) -> cornerEffect", () => {
    expect(next(transitionTurn(S.landing, { kind: "landingResolved", outcome: { kind: "corner" } }))).toEqual(S.cornerEffect);
  });
  it("landing + landingResolved(nothing) -> postRoll", () => {
    expect(next(transitionTurn(S.landing, E.landingResolved))).toEqual(freshPostRoll);
  });
  it("decision + buy -> postRoll", () => {
    expect(next(transitionTurn(S.decision, E.buy))).toEqual(freshPostRoll);
  });
  it("decision + pass -> auction (auctions on)", () => {
    expect(next(transitionTurn(S.decision, E.pass))).toEqual(S.auction);
  });
  it("decision + pass -> postRoll (auctions off)", () => {
    expect(next(transitionTurn(S.decision, { kind: "pass", auctionsOn: false }))).toEqual(freshPostRoll);
  });
  it("payment + paymentAttempted -> postRoll (paid in full)", () => {
    expect(next(transitionTurn(S.payment, E.paymentAttempted))).toEqual(freshPostRoll);
  });
  it("payment + paymentAttempted -> raiseCash (cash < amount)", () => {
    expect(next(transitionTurn(S.payment, { kind: "paymentAttempted", cash: 1199, debtId: "debt-1" }))).toEqual(S.raiseCash);
  });
  it("payment + paymentAttempted -> postRoll when cash equals the amount exactly", () => {
    expect(next(transitionTurn(S.payment, { kind: "paymentAttempted", cash: 1200, debtId: "debt-1" }))).toEqual(freshPostRoll);
  });
  it("cardDraw + effectApplied -> postRoll", () => {
    expect(next(transitionTurn(S.cardDraw, E.effectApplied))).toEqual(freshPostRoll);
  });
  it("cornerEffect + cornerResolved -> jail (sent to jail)", () => {
    expect(next(transitionTurn(S.cornerEffect, { kind: "cornerResolved", sentToJail: true }))).toEqual(S.jail);
  });
  it("cornerEffect + cornerResolved -> postRoll (other corner effects)", () => {
    expect(next(transitionTurn(S.cornerEffect, E.cornerResolved))).toEqual(freshPostRoll);
  });
  it("auction + auctionResolved -> postRoll", () => {
    expect(next(transitionTurn(S.auction, E.auctionResolved))).toEqual(freshPostRoll);
  });
  it("raiseCash + debtSettled -> postRoll (cash ≥ debt)", () => {
    expect(next(transitionTurn(S.raiseCash, E.debtSettled))).toEqual(freshPostRoll);
  });
  it("raiseCash + declareBankruptcy -> bankrupt", () => {
    expect(next(transitionTurn(S.raiseCash, E.declareBankruptcy))).toEqual(S.bankrupt);
  });
  it("postRoll + rollResolved -> preRoll (doubles under the limit)", () => {
    const event: TurnEvent = { kind: "rollResolved", dice: [4, 4], doublesThisTurn: 1, chosen: false, boardHasJail: true };
    expect(next(transitionTurn(S.postRoll, event))).toEqual(S.preRoll);
  });
  it("postRoll + rollResolved -> preRoll on the second double too", () => {
    const event: TurnEvent = { kind: "rollResolved", dice: [2, 2], doublesThisTurn: 2, chosen: false, boardHasJail: true };
    expect(next(transitionTurn(S.postRoll, event))).toEqual(S.preRoll);
  });
  it("postRoll + rollResolved -> jail (third double, board has jail)", () => {
    const event: TurnEvent = { kind: "rollResolved", dice: [4, 4], doublesThisTurn: 3, chosen: false, boardHasJail: true };
    expect(next(transitionTurn(S.postRoll, event))).toEqual(S.jail);
  });
  it("postRoll + rollResolved -> turnEnd (no extra roll)", () => {
    expect(next(transitionTurn(S.postRoll, E.rollResolved))).toEqual(S.turnEnd);
  });
  it("postRoll + rollResolved -> turnEnd for a chosen double (chooseDice never re-rolls)", () => {
    const event: TurnEvent = { kind: "rollResolved", dice: [4, 4], doublesThisTurn: 1, chosen: true, boardHasJail: true };
    expect(next(transitionTurn(S.postRoll, event))).toEqual(S.turnEnd);
  });
  it("postRoll + rollResolved -> turnEnd for a third double on a board without a jail", () => {
    const event: TurnEvent = { kind: "rollResolved", dice: [4, 4], doublesThisTurn: 3, chosen: false, boardHasJail: false };
    expect(next(transitionTurn(S.postRoll, event))).toEqual(S.turnEnd);
  });
  it("jail + jailed -> turnEnd", () => {
    expect(next(transitionTurn(S.jail, E.jailed))).toEqual(S.turnEnd);
  });
  it("bankrupt + eliminated -> turnEnd", () => {
    expect(next(transitionTurn(S.bankrupt, E.eliminated))).toEqual(S.turnEnd);
  });
});

describe("guards", () => {
  it("preRoll + roll is refused while a debt is unresolved", () => {
    const result = transitionTurn(S.preRoll, { kind: "roll", debtOpen: true });
    expect(result).toEqual({ ok: false, reason: expect.stringContaining("unresolved debt") });
  });
  it("preRoll + sideAction is refused while a debt is unresolved", () => {
    const result = transitionTurn(S.preRoll, { ...E.sideAction, debtOpen: true });
    expect(result).toEqual({ ok: false, reason: expect.stringContaining("unresolved debt") });
  });
  it("preRoll + sideAction is refused when the action's own validation failed", () => {
    const result = transitionTurn(S.preRoll, { ...E.sideAction, valid: false });
    expect(result).toEqual({ ok: false, reason: expect.stringContaining("validation") });
  });
  it("raiseCash + debtSettled is refused while cash is still short", () => {
    const result = transitionTurn(S.raiseCash, { kind: "debtSettled", cash: 1199, debt: 1200 });
    expect(result).toEqual({ ok: false, reason: expect.stringContaining("cash") });
  });
});

describe("turn-timer expiry (docs/flows/turn.md, documented default order)", () => {
  it("preRoll: roll and resolve, decline, reject trades, leave debts standing, end turn", () => {
    expect(turnTimerDefaults(S.preRoll)).toEqual(["rollAndResolve", "declinePurchase", "rejectTrades", "leaveDebtStanding", "endTurn"]);
    expect(next(transitionTurn(S.preRoll, E.turnTimerExpired))).toEqual(S.turnEnd);
  });
  it("decision: decline the purchase, reject trades, end turn", () => {
    expect(turnTimerDefaults(S.decision)).toEqual(["declinePurchase", "rejectTrades", "endTurn"]);
    expect(next(transitionTurn(S.decision, E.turnTimerExpired))).toEqual(S.turnEnd);
  });
  it("jailChoice: roll for doubles with no bail, then the roll's own defaults, end turn", () => {
    expect(turnTimerDefaults(S.jailChoice)).toEqual(["rollForDoubles", "declinePurchase", "rejectTrades", "leaveDebtStanding", "endTurn"]);
    expect(next(transitionTurn(S.jailChoice, E.turnTimerExpired))).toEqual(S.turnEnd);
  });
  it("raiseCash: no forced liquidation — reject trades, the debt stands, end turn", () => {
    expect(turnTimerDefaults(S.raiseCash)).toEqual(["rejectTrades", "leaveDebtStanding", "endTurn"]);
    expect(next(transitionTurn(S.raiseCash, E.turnTimerExpired))).toEqual(S.turnEnd);
  });
  it("postRoll: reject trades, end turn", () => {
    expect(turnTimerDefaults(S.postRoll)).toEqual(["rejectTrades", "endTurn"]);
    expect(next(transitionTurn(S.postRoll, E.turnTimerExpired))).toEqual(S.turnEnd);
  });
  it("auction: the turn clock is paused, so expiry is an explicit no-op", () => {
    expect(turnTimerDefaults(S.auction)).toEqual([]);
    expect(transitionTurn(S.auction, E.turnTimerExpired)).toEqual({ ok: false, reason: expect.stringContaining("paused") });
  });
  it.each([S.turnStart, S.rolling, S.moving, S.landing, S.payment, S.cardDraw, S.cornerEffect, S.jail, S.bankrupt, S.turnEnd])(
    "$kind: a server-side transition holds no clock, so expiry is an explicit no-op",
    (state) => {
      expect(turnTimerDefaults(state)).toEqual([]);
      expect(transitionTurn(state, E.turnTimerExpired).ok).toBe(false);
    },
  );
  it("never includes build, sell, mortgage or trade in any default list", () => {
    for (const state of Object.values(S)) {
      for (const step of turnTimerDefaults(state)) {
        expect(["build", "sell", "mortgage", "trade"]).not.toContain(step);
      }
    }
  });
});

describe("blocking states", () => {
  it("declares raiseCash and bankrupt as the states Android back cannot leave", () => {
    expect(TURN_BLOCKING_KINDS).toEqual(["raiseCash", "bankrupt"]);
    expect(isTurnBlocking(S.raiseCash)).toBe(true);
    expect(isTurnBlocking(S.bankrupt)).toBe(true);
    expect(isTurnBlocking(S.preRoll)).toBe(false);
    expect(isTurnBlocking(S.decision)).toBe(false);
  });
});

describe("exhaustiveness", () => {
  it("an event outside the union reaches the never check and throws", () => {
    const bogus = { kind: "TELEPORT" } as unknown as TurnEvent;
    expect(() => transitionTurn(S.preRoll, bogus)).toThrow(/unhandled machine case/);
  });
});

describe("illegal pairs", () => {
  const legal = new Set([
    "turnStart -> turnOpened",
    "jailChoice -> jailReleased",
    "jailChoice -> jailStays",
    "jailChoice -> turnTimerExpired",
    "preRoll -> roll",
    "preRoll -> sideAction",
    "preRoll -> turnTimerExpired",
    "rolling -> diceResolved",
    "moving -> tokenArrived",
    "landing -> landingResolved",
    "decision -> buy",
    "decision -> pass",
    "decision -> turnTimerExpired",
    "payment -> paymentAttempted",
    "cardDraw -> effectApplied",
    "cornerEffect -> cornerResolved",
    "auction -> auctionResolved",
    "raiseCash -> debtSettled",
    "raiseCash -> declareBankruptcy",
    "raiseCash -> turnTimerExpired",
    "postRoll -> rollResolved",
    "postRoll -> turnTimerExpired",
    "jail -> jailed",
    "bankrupt -> eliminated",
  ]);
  describeIllegalPairs(Object.values(S), Object.values(E), legal, transitionTurn);
});

describe("resync", () => {
  describeResync(Object.values(S), E.turnTimerExpired, transitionTurn);
});
