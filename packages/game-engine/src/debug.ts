// Testing hooks (SPEC.md "Testing hooks"). Not used by match logic — the client/server
// reconciliation check and the property tests compare states with `__debug.hash`.

import type { MatchState } from "./state";

/**
 * JSON with object keys in sorted order, so two states that differ only in the order their keys
 * were written serialise identically. Arrays keep their order — it is meaningful everywhere in
 * MatchState (seat order, the log, a group's tiles).
 */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`);
  return `{${entries.join(",")}}`;
}

/**
 * FNV-1a over the stable serialisation, as eight lowercase hex digits. Deterministic across
 * platforms: integer maths only, no platform randomness, no locale, no clock.
 */
export function hash(state: MatchState): string {
  const text = stableStringify(state);
  let value = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    value ^= text.charCodeAt(index);
    // FNV prime 16777619, kept in 32 bits with Math.imul so it never becomes a float.
    value = Math.imul(value, 0x01000193) >>> 0;
  }
  return value.toString(16).padStart(8, "0");
}

export const __debug = { hash, stableStringify };
