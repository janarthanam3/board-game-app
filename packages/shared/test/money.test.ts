import { describe, expect, it } from "vitest";

import { formatRupees, rupeesInWords } from "../src/money";

describe("formatRupees (Indian digit grouping)", () => {
  it.each([
    [0, "₹0"],
    [35, "₹35"],
    [1_400, "₹1,400"],
    [10_000, "₹10,000"],
    [1_20_000, "₹1,20,000"],
    [1_00_00_000, "₹1,00,00,000"],
    [-1_200, "₹-1,200"],
  ])("formats %i as %s", (amount, expected) => {
    expect(formatRupees(amount)).toBe(expected);
  });

  it("refuses a non-integer amount (no paise, CLAUDE.md)", () => {
    expect(() => formatRupees(12.5)).toThrow(/integer/);
  });
});

describe("rupeesInWords (docs/12: money is announced as words)", () => {
  it.each([
    [0, "zero rupees"],
    [35, "thirty-five rupees"],
    [1_200, "one thousand two hundred rupees"],
    [10_000, "ten thousand rupees"],
    [1_20_000, "one lakh twenty thousand rupees"],
    [-500, "minus five hundred rupees"],
  ])("says %i as %s", (amount, expected) => {
    expect(rupeesInWords(amount)).toBe(expected);
  });
});
