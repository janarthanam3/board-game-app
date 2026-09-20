import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { advance, nextUint32, pick, type Rng, rollDice } from "../src/rng";

describe("nextUint32 (rulebook §19, mulberry32)", () => {
  it("gives the same 10,000-draw sequence for the same seed", () => {
    const first = draws({ seed: 42, cursor: 0 }, 10_000);
    const second = draws({ seed: 42, cursor: 0 }, 10_000);
    expect(second).toEqual(first);
  });

  it("gives a different sequence for a different seed", () => {
    expect(draws({ seed: 42, cursor: 0 }, 100)).not.toEqual(draws({ seed: 43, cursor: 0 }, 100));
  });

  it("matches the reference mulberry32 outputs, so any platform agrees", () => {
    // First five outputs of mulberry32 for seed 42, computed independently.
    expect(draws({ seed: 42, cursor: 0 }, 5)).toEqual([2581720956, 1925393290, 3661312704, 2876485805, 750819978]);
  });

  it("advances the cursor by exactly one per draw and never mutates its input", () => {
    const start: Rng = { seed: 7, cursor: 3 };
    const frozen = { ...start };
    const { rng } = nextUint32(start);

    expect(rng.cursor).toBe(4);
    expect(rng.seed).toBe(7);
    expect(start).toEqual(frozen);
  });

  it("resumes mid-stream: drawing from cursor N equals the N-th draw of a fresh stream", () => {
    const fresh = draws({ seed: 99, cursor: 0 }, 50);
    const { value } = nextUint32({ seed: 99, cursor: 25 });
    expect(value).toBe(fresh[25]);
  });

  it("returns unsigned 32-bit integers", () => {
    for (const value of draws({ seed: 1, cursor: 0 }, 1000)) {
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(0xffffffff);
    }
  });
});

describe("rollDice", () => {
  it("rolls two dice, each 1–6, from two separate draws", () => {
    const { dice, rng } = rollDice({ seed: 42, cursor: 0 });
    const [first, second] = [nextUint32({ seed: 42, cursor: 0 }), nextUint32({ seed: 42, cursor: 1 })];

    expect(dice).toEqual([1 + (first.value % 6), 1 + (second.value % 6)]);
    expect(rng.cursor).toBe(2);
  });

  it("covers every face over many rolls and never leaves 1–6", () => {
    const seen = new Set<number>();
    let rng: Rng = { seed: 2026, cursor: 0 };
    for (let i = 0; i < 2000; i++) {
      const roll = rollDice(rng);
      rng = roll.rng;
      for (const die of roll.dice) {
        expect(die).toBeGreaterThanOrEqual(1);
        expect(die).toBeLessThanOrEqual(6);
        seen.add(die);
      }
    }
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe("pick", () => {
  it("picks an item from the list using one draw", () => {
    const items = ["chance-1", "chance-2", "chance-3"];
    const { item, rng } = pick({ seed: 5, cursor: 0 }, items);

    expect(items).toContain(item);
    expect(rng.cursor).toBe(1);
  });

  it("is deterministic and reaches every item", () => {
    const items = ["a", "b", "c", "d", "e"];
    const run = () => {
      let rng: Rng = { seed: 11, cursor: 0 };
      const picked: string[] = [];
      for (let i = 0; i < 200; i++) {
        const result = pick(rng, items);
        rng = result.rng;
        picked.push(result.item);
      }
      return picked;
    };
    const picks = run();
    expect(run()).toEqual(picks);
    expect(new Set(picks).size).toBe(items.length);
  });

  it("refuses an empty list rather than returning undefined", () => {
    expect(() => pick({ seed: 1, cursor: 0 }, [])).toThrow(/empty/);
  });
});

describe("advance", () => {
  it("skips N draws without producing values, landing on the same cursor as N draws", () => {
    let rng: Rng = { seed: 3, cursor: 0 };
    for (let i = 0; i < 17; i++) {
      rng = nextUint32(rng).rng;
    }
    expect(advance({ seed: 3, cursor: 0 }, 17)).toEqual(rng);
  });
});

describe("the package never reaches for platform randomness or time", () => {
  it("has no Math.random or Date.now anywhere under src/", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(resolve(__dirname, "../src"))) {
      const text = readFileSync(file, "utf8");
      if (/Math\.random|Date\.now|new Date\(/.test(text)) {
        offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });
});

function draws(start: Rng, count: number): number[] {
  const values: number[] = [];
  let rng = start;
  for (let i = 0; i < count; i++) {
    const next = nextUint32(rng);
    values.push(next.value);
    rng = next.rng;
  }
  return values;
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? sourceFiles(full) : full.endsWith(".ts") ? [full] : [];
  });
}
