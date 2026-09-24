// Board geometry and movement (rulebook §1). A board is a ring of tiles around a rectangular grid;
// only the perimeter holds tiles. Slots are 0-based here (1-based in the UI), clockwise from the
// start corner at the bottom-left.

import type { TileIndex } from "./state";

/** Custom steppers accept rows and columns 3–15 (rulebook §1). */
export const GRID_MIN = 3;
export const GRID_MAX = 15;
/** Fewer ring positions than this is rejected at the stepper (D7). */
export const MIN_RING_SIZE = 12;
/** The stepper's inline message, verbatim (rulebook §1, D7). */
export const RING_TOO_SMALL_MESSAGE = "At least 12 tiles needed.";

/** ringSize(rows, cols) = 2 × rows + 2 × cols − 4 */
export function ringSize(rows: number, cols: number): number {
  return 2 * rows + 2 * cols - 4;
}

export type GridValidation =
  | { ok: true; ringSize: number }
  | { ok: false; code: "E_GRID_RANGE" }
  | { ok: false; code: "E_RING_TOO_SMALL"; message: string };

/** Whether a rows × cols grid is a legal board: integers 3–15, and at least 12 ring positions. */
export function validateGrid(rows: number, cols: number): GridValidation {
  if (!inRange(rows) || !inRange(cols)) {
    return { ok: false, code: "E_GRID_RANGE" };
  }
  const size = ringSize(rows, cols);
  if (size < MIN_RING_SIZE) {
    return { ok: false, code: "E_RING_TOO_SMALL", message: RING_TOO_SMALL_MESSAGE };
  }
  return { ok: true, ringSize: size };
}

function inRange(n: number): boolean {
  return Number.isInteger(n) && n >= GRID_MIN && n <= GRID_MAX;
}

// ─── Movement ───────────────────────────────────────────────────────────────────

export interface Move {
  to: TileIndex;
  /** True when the pass bonus is due for this move. */
  passedStart: boolean;
}

/**
 * Clockwise: next = (current + steps) mod N. The pass bonus is due whenever the move crosses
 * index 0 forwards, including landing exactly on it.
 */
export function moveForward(from: TileIndex, steps: number, size: number): Move {
  const raw = from + steps;
  return { to: raw % size, passedStart: steps > 0 && raw >= size };
}

/** Anticlockwise: next = (current − steps + N) mod N. A backward move never pays the bonus. */
export function moveBackward(from: TileIndex, steps: number, size: number): Move {
  return { to: (((from - steps) % size) + size) % size, passedStart: false };
}

/**
 * "Move anywhere" / "To tile" (rulebook §1; edge cases #13, #14). The rule's `collectPassBonus`
 * flag **permits** the bonus; the jump must also reach the start tile or cross it going forward
 * — OQ-22 item 1, answered. A jump that lands short of index 0 pays nothing even with the flag on.
 */
export function teleport(from: TileIndex, to: TileIndex, collectPassBonus: boolean): Move {
  // A jump that does not move cannot reach anything, so it pays nothing even from Start itself.
  const reachesStart = to !== from && (to === 0 || to < from);
  return { to, passedStart: collectPassBonus && reachesStart };
}

// ─── Layout on the grid (for the board map) ─────────────────────────────────────

export interface GridCell {
  /** 0 = top row. */
  row: number;
  col: number;
}

/**
 * Where ring index `index` sits on a rows × cols grid: from the bottom-left corner, up the left
 * edge, across the top, down the right edge and back along the bottom.
 */
export function ringPosition(index: TileIndex, rows: number, cols: number): GridCell {
  const size = ringSize(rows, cols);
  if (!Number.isInteger(index) || index < 0 || index >= size) {
    throw new Error(`ringPosition: index ${index} is off a ring of ${size}`);
  }
  const leftEdge = rows; // bottom-left up to top-left inclusive
  const topEdge = cols - 1; // top-left exclusive to top-right inclusive
  const rightEdge = rows - 1; // top-right exclusive to bottom-right inclusive

  if (index < leftEdge) {
    return { row: rows - 1 - index, col: 0 };
  }
  if (index < leftEdge + topEdge) {
    return { row: 0, col: index - leftEdge + 1 };
  }
  if (index < leftEdge + topEdge + rightEdge) {
    return { row: index - leftEdge - topEdge + 1, col: cols - 1 };
  }
  return { row: rows - 1, col: cols - 1 - (index - leftEdge - topEdge - rightEdge + 1) };
}

// ─── Draft rings for the builder ────────────────────────────────────────────────

/** A ring under construction: one slot per position, `null` where nothing is placed yet. */
export interface DraftRing<Tile> {
  rows: number;
  cols: number;
  slots: (Tile | null)[];
}

/** An all-empty ring with the start tile pre-placed at index 0 and nothing else. */
export function generateRing<Tile>(rows: number, cols: number, startTile: Tile): DraftRing<Tile> {
  const validation = validateGrid(rows, cols);
  if (!validation.ok) {
    throw new Error(`generateRing: ${describe(validation)}`);
  }
  const slots: (Tile | null)[] = Array.from({ length: validation.ringSize }, () => null);
  slots[0] = startTile;
  return { rows, cols, slots };
}

/**
 * Growing keeps every placed tile at its index and appends empty slots. Shrinking removes the
 * highest indices and returns the tiles that were on them so the builder can move them to the
 * unplaced list — nothing is deleted. Slot 0 (the start tile) is never removed.
 */
export function resizeRing<Tile>(
  ring: DraftRing<Tile>,
  rows: number,
  cols: number,
): { ring: DraftRing<Tile>; unassigned: Tile[] } {
  const validation = validateGrid(rows, cols);
  if (!validation.ok) {
    throw new Error(`resizeRing: ${describe(validation)}`);
  }
  const target = validation.ringSize;
  const kept = ring.slots.slice(0, target);
  const removed = ring.slots.slice(target);
  const unassigned = removed.filter((slot): slot is Tile => slot !== null);
  while (kept.length < target) {
    kept.push(null);
  }
  return { ring: { rows, cols, slots: kept }, unassigned };
}

function describe(validation: Exclude<GridValidation, { ok: true }>): string {
  return validation.code === "E_RING_TOO_SMALL"
    ? validation.message
    : `rows and columns must be integers ${GRID_MIN}–${GRID_MAX}`;
}
