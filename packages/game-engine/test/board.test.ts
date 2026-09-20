import { describe, expect, it } from "vitest";

import {
  generateRing,
  GRID_MAX,
  GRID_MIN,
  MIN_RING_SIZE,
  moveBackward,
  moveForward,
  resizeRing,
  ringPosition,
  ringSize,
  teleport,
  validateGrid,
} from "../src/board";

describe("ringSize (rulebook §1)", () => {
  it.each([
    ["5×5", 5, 5, 16],
    ["7×7", 7, 7, 24],
    ["11×11", 11, 11, 40],
    ["custom 6×8", 6, 8, 24],
    ["custom 3×4", 3, 4, 10],
    ["custom 15×15", 15, 15, 56],
  ])("%s → %i tiles", (_label, rows, cols, expected) => {
    expect(ringSize(rows, cols)).toBe(expected);
    expect(ringSize(rows, cols)).toBe(2 * rows + 2 * cols - 4);
  });
});

describe("validateGrid", () => {
  it("accepts 6×8 (24 slots) — the design's worked example", () => {
    expect(validateGrid(6, 8)).toEqual({ ok: true, ringSize: 24 });
  });

  it("rejects 3×4 (10 slots) with the stepper's inline message (D7)", () => {
    expect(validateGrid(3, 4)).toEqual({ ok: false, code: "E_RING_TOO_SMALL", message: "At least 12 tiles needed." });
  });

  it("accepts every preset", () => {
    expect(validateGrid(5, 5)).toEqual({ ok: true, ringSize: 16 });
    expect(validateGrid(7, 7)).toEqual({ ok: true, ringSize: 24 });
    expect(validateGrid(11, 11)).toEqual({ ok: true, ringSize: 40 });
  });

  it("rejects rows or columns outside the 3–15 stepper range", () => {
    expect(GRID_MIN).toBe(3);
    expect(GRID_MAX).toBe(15);
    expect(validateGrid(2, 10)).toMatchObject({ ok: false, code: "E_GRID_RANGE" });
    expect(validateGrid(10, 16)).toMatchObject({ ok: false, code: "E_GRID_RANGE" });
    expect(validateGrid(4.5, 10)).toMatchObject({ ok: false, code: "E_GRID_RANGE" });
  });

  it("uses 12 as the minimum ring size", () => {
    expect(MIN_RING_SIZE).toBe(12);
    expect(validateGrid(3, 5)).toEqual({ ok: true, ringSize: 12 });
  });
});

describe("moveForward", () => {
  it("advances clockwise: next = (current + steps) mod N", () => {
    expect(moveForward(3, 4, 16)).toEqual({ to: 7, passedStart: false });
  });

  it("wraps past the last index", () => {
    expect(moveForward(14, 5, 16)).toEqual({ to: 3, passedStart: true });
  });

  it("pays the pass bonus when landing exactly on the start tile", () => {
    expect(moveForward(10, 6, 16)).toEqual({ to: 0, passedStart: true });
  });

  it("does not pay when the move stays short of the start tile", () => {
    expect(moveForward(10, 5, 16)).toEqual({ to: 15, passedStart: false });
  });

  it("does not pay for a zero-step move from the start tile", () => {
    expect(moveForward(0, 0, 16)).toEqual({ to: 0, passedStart: false });
  });

  it("wraps on every ring size", () => {
    expect(moveForward(39, 3, 40)).toEqual({ to: 2, passedStart: true });
    expect(moveForward(23, 1, 24)).toEqual({ to: 0, passedStart: true });
  });
});

describe("moveBackward", () => {
  it("moves anticlockwise: next = (current − steps + N) mod N", () => {
    expect(moveBackward(5, 3, 16)).toEqual({ to: 2, passedStart: false });
  });

  it("never pays the pass bonus, even across index 0 (edge case #12)", () => {
    expect(moveBackward(2, 3, 16)).toEqual({ to: 15, passedStart: false });
    expect(moveBackward(0, 1, 16)).toEqual({ to: 15, passedStart: false });
  });
});

describe("teleport", () => {
  it("pays the pass bonus only when the rule's collectPassBonus flag is set", () => {
    expect(teleport(9, 2, true)).toEqual({ to: 2, passedStart: true });
    expect(teleport(9, 2, false)).toEqual({ to: 2, passedStart: false });
  });

  it("onto the start tile pays only with the flag (edge case #14)", () => {
    expect(teleport(9, 0, false)).toEqual({ to: 0, passedStart: false });
    expect(teleport(9, 0, true)).toEqual({ to: 0, passedStart: true });
  });
});

describe("generateRing", () => {
  it("produces an all-empty ring with the start tile at index 0", () => {
    const ring = generateRing(5, 5, "start");

    expect(ring.rows).toBe(5);
    expect(ring.cols).toBe(5);
    expect(ring.slots).toHaveLength(16);
    expect(ring.slots[0]).toBe("start");
    expect(ring.slots.slice(1).every((slot) => slot === null)).toBe(true);
  });

  it("refuses a grid the validator rejects", () => {
    expect(() => generateRing(3, 4, "start")).toThrow(/At least 12 tiles needed/);
  });
});

describe("resizeRing", () => {
  it("growing keeps every placed tile at its index and appends empty slots", () => {
    const ring = generateRing(5, 5, "start");
    ring.slots[1] = "marina";
    ring.slots[15] = "beach";

    const { ring: grown, unassigned } = resizeRing(ring, 7, 7);

    expect(grown.slots).toHaveLength(24);
    expect(grown.slots[0]).toBe("start");
    expect(grown.slots[1]).toBe("marina");
    expect(grown.slots[15]).toBe("beach");
    expect(grown.slots.slice(16).every((slot) => slot === null)).toBe(true);
    expect(unassigned).toEqual([]);
  });

  it("shrinking removes the highest indices and unassigns their tiles, never deleting them", () => {
    const ring = generateRing(11, 11, "start");
    for (let i = 1; i < 40; i += 2) {
      ring.slots[i] = `tile-${i}`;
    }

    const { ring: shrunk, unassigned } = resizeRing(ring, 5, 5);

    expect(shrunk.slots).toHaveLength(16);
    expect(shrunk.slots[0]).toBe("start");
    expect(shrunk.slots[1]).toBe("tile-1");
    // Placed tiles on indices 17, 19, …, 39 come off the board into the unplaced list.
    expect(unassigned).toEqual([17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37, 39].map((i) => `tile-${i}`));
  });

  it("reports the numbers the 2a5 shrink dialog quotes: 11×11 → 5×5 removes 24 slots", () => {
    const ring = generateRing(11, 11, "start");
    const { ring: shrunk } = resizeRing(ring, 5, 5);
    expect(ring.slots.length - shrunk.slots.length).toBe(24);
  });

  it("refuses to resize to a grid the validator rejects", () => {
    expect(() => resizeRing(generateRing(5, 5, "start"), 3, 4)).toThrow(/At least 12 tiles needed/);
  });
});

describe("ringPosition — clockwise from the bottom-left start corner", () => {
  it("walks up the left edge, across the top, down the right and back along the bottom on 5×5", () => {
    const positions = Array.from({ length: 16 }, (_, index) => ringPosition(index, 5, 5));

    expect(positions[0]).toEqual({ row: 4, col: 0 }); // start: bottom-left
    expect(positions[4]).toEqual({ row: 0, col: 0 }); // top-left corner
    expect(positions[8]).toEqual({ row: 0, col: 4 }); // top-right corner
    expect(positions[12]).toEqual({ row: 4, col: 4 }); // bottom-right corner
    expect(positions[15]).toEqual({ row: 4, col: 1 }); // last slot, just right of start
  });

  it("visits every perimeter cell exactly once and no interior cell", () => {
    for (const [rows, cols] of [[5, 5], [7, 7], [11, 11], [6, 8]] as const) {
      const size = ringSize(rows, cols);
      const seen = new Set<string>();
      for (let index = 0; index < size; index++) {
        const { row, col } = ringPosition(index, rows, cols);
        const onEdge = row === 0 || row === rows - 1 || col === 0 || col === cols - 1;
        expect(onEdge).toBe(true);
        seen.add(`${row},${col}`);
      }
      expect(seen.size).toBe(size);
    }
  });

  it("rejects an index off the ring", () => {
    expect(() => ringPosition(16, 5, 5)).toThrow(/index/);
    expect(() => ringPosition(-1, 5, 5)).toThrow(/index/);
  });
});
