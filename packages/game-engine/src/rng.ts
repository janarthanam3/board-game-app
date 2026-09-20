// Seeded randomness for the engine (rulebook §19). Every random outcome in a match comes from an
// Rng held inside MatchState; platform randomness is banned in this package (lint rule + test).
//
// mulberry32: a small, fast 32-bit generator whose state is one integer. Its n-th output depends
// only on (seed, n), so the state is just { seed, cursor } and any draw can be recomputed — that
// is what makes replay exact on any platform.

export interface Rng {
  /** The match seed, fixed at creation. */
  readonly seed: number;
  /** How many draws have been taken. Never decreases. */
  readonly cursor: number;
}

// The mulberry32 increment. After n draws the generator's state is seed + n × this (mod 2^32).
const INCREMENT = 0x6d2b79f5;

/** One 32-bit draw. Returns the value and the advanced Rng; never mutates its input. */
export function nextUint32(rng: Rng): { value: number; rng: Rng } {
  // `| 0` keeps the arithmetic in 32-bit integer space, exactly like the reference implementation.
  const a = (rng.seed + (rng.cursor + 1) * INCREMENT) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  const value = (t ^ (t >>> 14)) >>> 0;
  return { value, rng: { seed: rng.seed, cursor: rng.cursor + 1 } };
}

/** Two dice, 1–6 each, from two separate draws — never one draw split in two (rulebook §19 #4). */
export function rollDice(rng: Rng): { dice: [number, number]; rng: Rng } {
  const first = nextUint32(rng);
  const second = nextUint32(first.rng);
  return { dice: [1 + (first.value % 6), 1 + (second.value % 6)], rng: second.rng };
}

/** Picks one item of a non-empty list with one draw (deck shuffle draws, rulebook §19 #5). */
export function pick<T>(rng: Rng, items: readonly T[]): { item: T; rng: Rng } {
  if (items.length === 0) {
    throw new Error("pick: cannot pick from an empty list");
  }
  const { value, rng: next } = nextUint32(rng);
  // Modulo bias here is at most items.length / 2^32 — far below anything a match could notice.
  const item = items[value % items.length] as T;
  return { item, rng: next };
}

/** Skips `count` draws. Useful for tests and for resyncing a cursor without producing values. */
export function advance(rng: Rng, count: number): Rng {
  return { seed: rng.seed, cursor: rng.cursor + count };
}
