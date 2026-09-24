// Ring layout, zoom and pan maths for the board map. Pure functions, no React: given a grid and a
// viewport, where does every slot sit, what may the zoom be, and how far may the board be dragged?
//
// The ring order comes from the engine (`ringPosition`), so the client and the server agree on what
// "slot 4" means — CLAUDE.md: both run the same engine build.

import { ringPosition, ringSize } from "@royal-navy/game-engine";
import { control } from "@royal-navy/shared";

/** What the map is being used for; it decides the zoom floor and how taps behave. */
export type BoardMode = "play" | "build" | "select";

/**
 * The zoom stops, answered as OQ-23 option 2: the percentages the design actually prints
 * (`2a` shows 180% and 240%, `1c` shows 100%). `−` and `+` walk this list.
 */
export const ZOOM_STOPS = [0.5, 1, 1.8, 2.4, 4] as const;

/** Fit frames the whole ring; docs/03: "zoom | number | 1 = Fit". */
export const FIT_ZOOM = 1;
export const MAX_ZOOM = 4;

/**
 * The floor differs per mode, which is the only reading that obeys both screen specs:
 * `1c` §6 and §11 AC5 clamp play to 100%–400%; `2a` §5 and §11 AC3 clamp build to 50%–400%.
 * The contradiction between them is recorded in docs/design-concerns.md — this is not a winner
 * picked between the two.
 */
export function minZoom(mode: BoardMode): number {
  return mode === "build" ? 0.5 : 1;
}

export function clampZoom(zoom: number, mode: BoardMode = "play"): number {
  return Math.min(MAX_ZOOM, Math.max(minZoom(mode), zoom));
}

/** The stops this mode may reach. */
export function zoomStops(mode: BoardMode): number[] {
  return ZOOM_STOPS.filter((stop) => stop >= minZoom(mode));
}

/** The next stop up or down from wherever the zoom currently sits (a pinch can land between stops). */
export function stepZoom(zoom: number, direction: "in" | "out", mode: BoardMode): number {
  const stops = zoomStops(mode);
  const current = clampZoom(zoom, mode);
  if (direction === "in") {
    return stops.find((stop) => stop > current + 0.001) ?? stops[stops.length - 1]!;
  }
  const below = stops.filter((stop) => stop < current - 0.001);
  return below.length > 0 ? below[below.length - 1]! : stops[0]!;
}

/**
 * A tile is selectable only at the minimum tap target (docs/02 `control.minTapTarget` = 44).
 * `1c` §8 keeps a play-mode tile tappable below it — only its labels drop — while `2a` §4 makes the
 * builder's slots display-only at Fit on 40 slots. `BoardMap` applies that split; this helper just
 * answers the size question.
 */
export function tileIsTappable(tileSize: number): boolean {
  return tileSize >= control.minTapTarget;
}

export interface TileRect {
  index: number;
  left: number;
  top: number;
  size: number;
}

export interface BoardLayout {
  tiles: TileRect[];
  /** The ring's outer edge at this zoom. */
  boardSize: number;
  tileSize: number;
  /** Where the centre art sits: one tile in on every side. */
  centre: { left: number; top: number; size: number };
}

export interface LayoutInput {
  rows: number;
  cols: number;
  /** The viewport's inner width in dp. */
  viewport: number;
  zoom: number;
}

export function boardLayout({ rows, cols, viewport, zoom }: LayoutInput): BoardLayout {
  const size = ringSize(rows, cols);
  // The ring is drawn inside a square viewport, so the longer side sets the tile size.
  const span = Math.max(rows, cols);
  const tileSize = (viewport / span) * zoom;
  const boardSize = tileSize * span;
  // A grid narrower than it is tall (or the reverse) is centred inside the square.
  const offsetX = ((span - cols) / 2) * tileSize;
  const offsetY = ((span - rows) / 2) * tileSize;

  const tiles: TileRect[] = [];
  for (let index = 0; index < size; index++) {
    const cell = ringPosition(index, rows, cols);
    tiles.push({
      index,
      left: offsetX + cell.col * tileSize,
      top: offsetY + cell.row * tileSize,
      size: tileSize,
    });
  }

  return {
    tiles,
    boardSize,
    tileSize,
    centre: { left: tileSize, top: tileSize, size: boardSize - tileSize * 2 },
  };
}

// ─── Pan ────────────────────────────────────────────────────────────────────────

export interface PanOffset {
  x: number;
  y: number;
}

/**
 * Keeps the dragged board inside its viewport: at Fit the board fits exactly and cannot move, and
 * zoomed in it may travel only as far as its overhang. Without this, zooming past Fit leaves
 * everything below and right of the first quadrant unreachable.
 */
export function clampPan(offset: PanOffset, boardSize: number, viewport: number): PanOffset {
  const slack = Math.max(0, boardSize - viewport);
  // `|| 0` normalises the -0 that falls out of clamping against a slack of zero.
  const axis = (value: number): number => Math.min(0, Math.max(-slack, value)) || 0;
  return { x: axis(offset.x), y: axis(offset.y) };
}

/**
 * The pan that brings a tile into the middle of the viewport — `1c` §11 AC5: "the active token is
 * kept in view after each move".
 */
export function panToTile(layout: BoardLayout, tileIndex: number, viewport: number): PanOffset {
  const rect = layout.tiles[tileIndex];
  if (!rect) {
    return { x: 0, y: 0 };
  }
  const centred = {
    x: -(rect.left + rect.size / 2 - viewport / 2),
    y: -(rect.top + rect.size / 2 - viewport / 2),
  };
  return clampPan(centred, layout.boardSize, viewport);
}

/** Which slot sits under a point in board coordinates, or null between the ring and the centre. */
export function tileAtPoint(layout: BoardLayout, x: number, y: number): number | null {
  const hit = layout.tiles.find(
    (tile) => x >= tile.left && x < tile.left + tile.size && y >= tile.top && y < tile.top + tile.size,
  );
  return hit ? hit.index : null;
}

// ─── Edges ──────────────────────────────────────────────────────────────────────

export type BoardEdge = "south" | "west" | "north" | "east";

/**
 * Which edge of the ring a slot sits on, for the assign screen's context line and the empty-slot
 * accessibility label (`2a` §8: "Slot 4, empty, south edge").
 *
 * Derived from the geometry: the start corner is bottom-left and the order runs clockwise up the
 * left edge (rulebook §1), so slot 04 of a 16-slot ring is on the **west** edge. `2a` §2.2 captions
 * that same slot "South edge" — recorded in docs/design-concerns.md; the geometry is what ships.
 */
export function edgeOf(index: number, rows: number, cols: number): BoardEdge {
  const cell = ringPosition(index, rows, cols);
  if (index === 0) {
    return "south";
  }
  if (cell.col === 0) {
    return "west";
  }
  if (cell.row === 0) {
    return "north";
  }
  if (cell.col === cols - 1) {
    return "east";
  }
  return "south";
}
