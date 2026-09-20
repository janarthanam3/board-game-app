import { describe, expect, it } from "vitest";

import {
  amountFromPercent,
  clampCost,
  clampPercent,
  COST_MAX,
  COST_MIN,
  MIN_DERIVED_AMOUNT,
  PERCENT_MAX,
  PERCENT_MIN,
  percentFromAmount,
  resolvePrice,
  roundToStep,
} from "../src/pricing";

describe("roundToStep (rulebook §3)", () => {
  it.each([
    [756, 5, 755],
    [294, 5, 295],
    [13.75, 5, 15],
    [12.5, 5, 15], // half away from zero
    [35, 5, 35],
    [0, 5, 0],
  ])("rounds %s to the nearest %s → %s", (value, step, expected) => {
    expect(roundToStep(value, step)).toBe(expected);
  });
});

describe("amountFromPercent — the design's worked examples", () => {
  it.each([
    ["Base rent", 1400, 2.5, 35],
    ["1 house", 1400, 5, 70],
    ["2 houses", 1400, 10, 140],
    ["3 houses", 1400, 20, 280],
    ["4 houses", 1400, 30, 420],
    ["Hotel rent (756 → 755)", 1400, 54, 755],
    ["Mortgage", 1400, 50, 700],
    ["House cost (294 → 295)", 1400, 21, 295],
    ["Sell property", 1400, 70, 980],
    ["Utility mortgage", 1200, 50, 600],
    ["Utility sell to bank", 1200, 70, 840],
    ["Base rent on ₹600", 600, 2.5, 15],
    ["Base rent on ₹550 (13.75 → 15)", 550, 2.5, 15],
  ])("%s: %s at %s%% → ₹%s", (_label, cost, percent, expected) => {
    expect(amountFromPercent(cost, percent)).toBe(expected);
  });

  it("never derives less than ₹5", () => {
    expect(MIN_DERIVED_AMOUNT).toBe(5);
    expect(amountFromPercent(10, 0.1)).toBe(5);
    expect(amountFromPercent(100, 1)).toBe(5);
  });

  it("returns integer rupees only", () => {
    for (const [cost, percent] of [[1400, 2.5], [999999, 0.1], [10, 500], [333, 33.3]]) {
      expect(Number.isInteger(amountFromPercent(cost!, percent!))).toBe(true);
    }
  });
});

describe("percentFromAmount — round(amt / cost × 1000) / 10, as §3 states it", () => {
  it.each([
    [1400, 35, 2.5],
    [1400, 700, 50],
    [1400, 980, 70],
    [1200, 600, 50],
    // §3 says the design displays these as 21 % and 54 %; its formula gives 21.4 and 53.6 — OQ-16.
    [1400, 300, 21.4],
    [1400, 750, 53.6],
  ])("₹%s at ₹%s → %s%% (one decimal, trailing .0 dropped)", (cost, amount, expected) => {
    expect(percentFromAmount(cost, amount)).toBe(expected);
  });
});

describe("clamps", () => {
  it("percent 0.1 – 500", () => {
    expect(PERCENT_MIN).toBe(0.1);
    expect(PERCENT_MAX).toBe(500);
    expect(clampPercent(0)).toBe(0.1);
    expect(clampPercent(1000)).toBe(500);
    expect(clampPercent(54)).toBe(54);
  });

  it("cost ₹10 – ₹9,99,999", () => {
    expect(COST_MIN).toBe(10);
    expect(COST_MAX).toBe(999999);
    expect(clampCost(1)).toBe(10);
    expect(clampCost(5000000)).toBe(999999);
    expect(clampCost(1400)).toBe(1400);
  });

  it("amountFromPercent clamps the percent at 500", () => {
    expect(amountFromPercent(1400, 9999)).toBe(amountFromPercent(1400, 500));
    expect(amountFromPercent(1400, 500)).toBe(7000);
  });
});

describe("resolvePrice — the storage rule", () => {
  it("returns a flat field as typed", () => {
    expect(resolvePrice({ mode: "flat", flat: 750 }, 1400)).toBe(750);
  });

  it("derives a percent field from its base", () => {
    expect(resolvePrice({ mode: "percent", percent: 54 }, 1400)).toBe(755);
  });

  it("uses the field's own base: sell house is a % of house cost", () => {
    const houseCost = resolvePrice({ mode: "flat", flat: 300 }, 1400);
    expect(resolvePrice({ mode: "percent", percent: 50 }, houseCost)).toBe(150);
  });
});
