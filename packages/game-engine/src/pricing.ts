// Percentage-based pricing (rulebook §3). Money is integer rupees; every derived amount is rounded
// to the nearest ₹5 and never below ₹5.

import type { PricedField } from "./state";

/** Percent clamps: 0.1 – 500 %. */
export const PERCENT_MIN = 0.1;
export const PERCENT_MAX = 500;
/** Cost clamps: ₹10 – ₹9,99,999. */
export const COST_MIN = 10;
export const COST_MAX = 999999;
/** Derived money rounds to the nearest ₹5 and is never less than ₹5. */
export const MONEY_STEP = 5;
export const MIN_DERIVED_AMOUNT = 5;

/** roundToStep(x, step) = round(x / step) × step, half away from zero. */
export function roundToStep(value: number, step: number): number {
  const magnitude = Math.round(Math.abs(value) / step) * step;
  return value < 0 ? -magnitude : magnitude;
}

export function clampPercent(percent: number): number {
  return Math.min(PERCENT_MAX, Math.max(PERCENT_MIN, percent));
}

export function clampCost(cost: number): number {
  return Math.min(COST_MAX, Math.max(COST_MIN, cost));
}

/** amountFromPercent(cost, pct) = roundToStep(cost × pct / 100, 5), floor ₹5. */
export function amountFromPercent(cost: number, percent: number): number {
  const raw = (cost * clampPercent(percent)) / 100;
  return Math.max(MIN_DERIVED_AMOUNT, roundToStep(raw, MONEY_STEP));
}

/**
 * percentFromAmount(cost, amt) = round(amt / cost × 1000) / 10 — one decimal, trailing .0 dropped
 * by virtue of being a number. Display only; money never flows through this direction.
 * (§3's worked examples show 21 % and 54 % for 300 and 750 of 1,400, which this formula does not
 * produce — see OQ-16.)
 */
export function percentFromAmount(cost: number, amount: number): number {
  return Math.round((amount / cost) * 1000) / 10;
}

/**
 * The storage rule: a priced field is either the flat amount the author typed, or a percent of its
 * base — cost for most fields, house cost for sell-house, hotel cost for sell-hotel.
 */
export function resolvePrice(field: PricedField, base: number): number {
  return field.mode === "flat" ? field.flat : amountFromPercent(base, field.percent);
}
