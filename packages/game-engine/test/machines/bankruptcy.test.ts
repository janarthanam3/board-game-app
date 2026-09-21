// Raise-cash (child) and bankruptcy (parent) machines — docs/06 "Raise cash" and "Bankruptcy",
// docs/flows/raise-cash.md, docs/flows/bankruptcy.md.

import { describe, expect, it } from "vitest";

import {
  BANKRUPTCY_BLOCKING_KINDS,
  BANKRUPTCY_RESOLUTION_ORDER,
  type BankruptcyEvent,
  type BankruptcyMachineState,
  isBankruptcyBlocking,
  isRaiseCashBlocking,
  RAISE_CASH_BLOCKING_KINDS,
  type RaiseCashEvent,
  type RaiseCashMachineState,
  transitionBankruptcy,
  transitionRaiseCash,
} from "../../src/machines/bankruptcy";
import { describeIllegalPairs, describeResync, next } from "./support";

const NAVEEN = "p-naveen";
const KARTHIK = "p-karthik";

describe("raise cash", () => {
  const S = {
    open: { kind: "open", debtId: "debt-1", debt: 1200, cash: 500, raised: 0, route: "mortgage" },
    paying: { kind: "paying", debtId: "debt-1" },
    exhausted: { kind: "exhausted", debtId: "debt-1", shortBy: 300 },
    bankrupt: { kind: "bankrupt", debtId: "debt-1" },
    settled: { kind: "settled", debtId: "debt-1" },
  } satisfies Record<string, RaiseCashMachineState>;

  const E = {
    switchRoute: { kind: "switchRoute", route: "sell" },
    assetToggled: { kind: "assetToggled", raised: 700 },
    pay: { kind: "pay" },
    routesChecked: { kind: "routesChecked", allRoutesMax: 400 },
    declareBankruptcy: { kind: "declareBankruptcy" },
    paid: { kind: "paid" },
  } satisfies Record<string, RaiseCashEvent>;

  describe("legal transitions", () => {
    it("open + switchRoute -> open (picks on other routes are kept)", () => {
      expect(next(transitionRaiseCash(S.open, E.switchRoute))).toEqual({ ...S.open, route: "sell" });
    });
    it("open + assetToggled -> open (raised recomputed)", () => {
      expect(next(transitionRaiseCash(S.open, E.assetToggled))).toEqual({ ...S.open, raised: 700 });
    });
    it("open + pay -> paying (cash + raised ≥ debt)", () => {
      const covered = next(transitionRaiseCash(S.open, E.assetToggled));
      expect(next(transitionRaiseCash(covered, E.pay))).toEqual(S.paying);
    });
    it("open + pay -> paying when cash + raised equals the debt exactly", () => {
      const exact = next(transitionRaiseCash(S.open, { kind: "assetToggled", raised: 700 }));
      expect(transitionRaiseCash(exact, E.pay).ok).toBe(true);
    });
    it("paying + paid -> settled (debt cleared)", () => {
      expect(next(transitionRaiseCash(S.paying, E.paid))).toEqual(S.settled);
    });
    it("open + routesChecked -> exhausted (even all routes fall short)", () => {
      expect(next(transitionRaiseCash(S.open, E.routesChecked))).toEqual(S.exhausted);
    });
    it("open + routesChecked -> open when all routes together can cover the debt", () => {
      expect(next(transitionRaiseCash(S.open, { kind: "routesChecked", allRoutesMax: 700 }))).toEqual(S.open);
    });
    it("exhausted + declareBankruptcy -> bankrupt", () => {
      expect(next(transitionRaiseCash(S.exhausted, E.declareBankruptcy))).toEqual(S.bankrupt);
    });
    it("open + declareBankruptcy -> bankrupt", () => {
      expect(next(transitionRaiseCash(S.open, E.declareBankruptcy))).toEqual(S.bankrupt);
    });
  });

  describe("guards", () => {
    it("open + pay is refused while cash + raised < debt (Pay stays disabled)", () => {
      expect(transitionRaiseCash(S.open, E.pay)).toEqual({ ok: false, reason: expect.stringContaining("short") });
    });
  });

  describe("blocking states (raise-cash.md invariant 1: the only involuntary, undismissable screen)", () => {
    it("declares open, exhausted and paying as blocking", () => {
      expect(RAISE_CASH_BLOCKING_KINDS).toEqual(["open", "exhausted", "paying"]);
      expect(isRaiseCashBlocking(S.open)).toBe(true);
      expect(isRaiseCashBlocking(S.exhausted)).toBe(true);
      expect(isRaiseCashBlocking(S.paying)).toBe(true);
      expect(isRaiseCashBlocking(S.settled)).toBe(false);
      expect(isRaiseCashBlocking(S.bankrupt)).toBe(false);
    });
  });

  describe("exhaustiveness", () => {
    it("an event outside the union reaches the never check and throws", () => {
      const bogus = { kind: "LIQUIDATE" } as unknown as RaiseCashEvent;
      expect(() => transitionRaiseCash(S.open, bogus)).toThrow(/unhandled machine case/);
    });
  });

  describe("illegal pairs", () => {
    const legal = new Set([
      "open -> switchRoute",
      "open -> assetToggled",
      "open -> routesChecked",
      "open -> declareBankruptcy",
      "exhausted -> declareBankruptcy",
      "paying -> paid",
    ]);
    // `open -> pay` is legal only under its guard; the sample state is short, so it is expected to refuse.
    describeIllegalPairs(Object.values(S), Object.values(E), legal, transitionRaiseCash);
  });

  describe("resync", () => {
    describeResync(Object.values(S), E.pay, transitionRaiseCash);
  });
});

describe("bankruptcy", () => {
  const toPlayer = { debtorId: NAVEEN, creditorId: KARTHIK } as const;
  const toBank = { debtorId: NAVEEN, creditorId: "bank" } as const;

  const S = {
    selling: { kind: "selling", ...toPlayer },
    toCreditor: { kind: "toCreditor", ...toPlayer },
    toBank: { kind: "toBank", ...toBank },
    queueing: { kind: "queueing", ...toBank },
    eliminating: { kind: "eliminating", ...toPlayer },
    checkPlayers: { kind: "checkPlayers", ...toPlayer, solventRemaining: 2 },
    matchEnding: { kind: "matchEnding", ...toPlayer },
    resolved: { kind: "resolved", ...toPlayer },
  } satisfies Record<string, BankruptcyMachineState>;

  const E = {
    buildingsSold: { kind: "buildingsSold" },
    assetsTransferred: { kind: "assetsTransferred" },
    deedsQueued: { kind: "deedsQueued" },
    cardsDiscarded: { kind: "cardsDiscarded" },
    eliminated: { kind: "eliminated", solventRemaining: 2 },
    checked: { kind: "checked" },
    countdownDone: { kind: "countdownDone" },
  } satisfies Record<string, BankruptcyEvent>;

  it("states the normative resolution order (bankruptcy.md 'Resolution order')", () => {
    expect(BANKRUPTCY_RESOLUTION_ORDER).toEqual(["buildings", "cash", "deeds", "cards", "elimination"]);
  });

  describe("legal transitions", () => {
    it("selling + buildingsSold -> toCreditor (creditor is a player)", () => {
      expect(next(transitionBankruptcy(S.selling, E.buildingsSold))).toEqual(S.toCreditor);
    });
    it("selling + buildingsSold -> toBank (creditor is the bank)", () => {
      expect(next(transitionBankruptcy({ kind: "selling", ...toBank }, E.buildingsSold))).toEqual(S.toBank);
    });
    it("toCreditor + assetsTransferred -> eliminating (cash + deeds with mortgages + tradeable cards)", () => {
      expect(next(transitionBankruptcy(S.toCreditor, E.assetsTransferred))).toEqual(S.eliminating);
    });
    it("toBank + deedsQueued -> queueing (lots for next round)", () => {
      expect(next(transitionBankruptcy(S.toBank, E.deedsQueued))).toEqual(S.queueing);
    });
    it("queueing + cardsDiscarded -> eliminating", () => {
      expect(next(transitionBankruptcy(S.queueing, E.cardsDiscarded))).toEqual({ kind: "eliminating", ...toBank });
    });
    it("eliminating + eliminated -> checkPlayers", () => {
      expect(next(transitionBankruptcy(S.eliminating, E.eliminated))).toEqual(S.checkPlayers);
    });
    it("checkPlayers + checked -> resolved (≥ 2 solvent players remain)", () => {
      expect(next(transitionBankruptcy(S.checkPlayers, E.checked))).toEqual(S.resolved);
    });
    it("checkPlayers + checked -> matchEnding (< 2 solvent players)", () => {
      expect(next(transitionBankruptcy({ ...S.checkPlayers, solventRemaining: 1 }, E.checked))).toEqual(S.matchEnding);
    });
    it("matchEnding + countdownDone -> resolved (3r countdown then ended)", () => {
      expect(next(transitionBankruptcy(S.matchEnding, E.countdownDone))).toEqual(S.resolved);
    });
  });

  describe("blocking states", () => {
    it("the whole resolution is one atomic server transition; eliminating and matchEnding cannot be backed out of", () => {
      expect(BANKRUPTCY_BLOCKING_KINDS).toEqual(["eliminating", "matchEnding"]);
      expect(isBankruptcyBlocking(S.eliminating)).toBe(true);
      expect(isBankruptcyBlocking(S.matchEnding)).toBe(true);
      expect(isBankruptcyBlocking(S.resolved)).toBe(false);
    });
  });

  describe("exhaustiveness", () => {
    it("an event outside the union reaches the never check and throws", () => {
      const bogus = { kind: "UNDO" } as unknown as BankruptcyEvent;
      expect(() => transitionBankruptcy(S.selling, bogus)).toThrow(/unhandled machine case/);
    });
  });

  describe("illegal pairs", () => {
    const legal = new Set([
      "selling -> buildingsSold",
      "toCreditor -> assetsTransferred",
      "toBank -> deedsQueued",
      "queueing -> cardsDiscarded",
      "eliminating -> eliminated",
      "checkPlayers -> checked",
      "matchEnding -> countdownDone",
    ]);
    describeIllegalPairs(Object.values(S), Object.values(E), legal, transitionBankruptcy);
  });

  describe("resync (bankruptcy.md failure branch: declaration is idempotent, resync lands on 1g)", () => {
    describeResync(Object.values(S), E.eliminated, transitionBankruptcy);
  });
});
