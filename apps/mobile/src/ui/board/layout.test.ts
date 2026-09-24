// Ring layout, zoom and pan maths (docs/03 `BoardMap`, docs/05 §1, 1c §6/§8/§11, 2a §2.1/§5/§11).

import { ringSize } from "@royal-navy/game-engine";

import {
  boardLayout,
  clampPan,
  clampZoom,
  edgeOf,
  FIT_ZOOM,
  MAX_ZOOM,
  minZoom,
  panToTile,
  stepZoom,
  tileAtPoint,
  tileIsTappable,
  ZOOM_STOPS,
  zoomStops,
} from "./layout";

/** The four sizes the task names: 16, 24, 40 and a custom ring. */
const SIZES = [
  { rows: 5, cols: 5, size: 16 },
  { rows: 7, cols: 7, size: 24 },
  { rows: 11, cols: 11, size: 40 },
  { rows: 6, cols: 8, size: 24 },
] as const;

/** The builder's real map width (docs/12 per-screen table), which is where 40 slots get tight. */
const BUILDER_VIEWPORT = 210;

describe("boardLayout", () => {
  it.each(SIZES)("lays out every slot of a $rows×$cols ring ($size tiles)", ({ rows, cols, size }) => {
    const layout = boardLayout({ rows, cols, viewport: 320, zoom: FIT_ZOOM });
    expect(ringSize(rows, cols)).toBe(size);
    expect(layout.tiles).toHaveLength(size);
    expect(layout.tiles.map((tile) => tile.index)).toEqual(Array.from({ length: size }, (_, index) => index));
  });

  it("starts at the bottom-left corner and runs clockwise (rulebook §1)", () => {
    const layout = boardLayout({ rows: 5, cols: 5, viewport: 320, zoom: FIT_ZOOM });
    const start = layout.tiles[0]!;
    const up = layout.tiles[1]!;
    const topLeft = layout.tiles[4]!;
    const acrossTop = layout.tiles[5]!;

    expect(Math.min(...layout.tiles.map((tile) => tile.left))).toBe(start.left);
    expect(Math.max(...layout.tiles.map((tile) => tile.top))).toBe(start.top);
    expect(up.left).toBe(start.left);
    expect(up.top).toBeLessThan(start.top);
    expect(topLeft.top).toBeLessThan(up.top);
    expect(acrossTop.left).toBeGreaterThan(topLeft.left);
    expect(acrossTop.top).toBe(topLeft.top);
  });

  it("centres a non-square ring inside the square viewport (docs/12 responsive)", () => {
    const layout = boardLayout({ rows: 6, cols: 8, viewport: 320, zoom: FIT_ZOOM });
    const lefts = layout.tiles.map((tile) => tile.left);
    const tops = layout.tiles.map((tile) => tile.top);
    expect(Math.max(...lefts) + layout.tileSize - Math.min(...lefts)).toBeCloseTo(layout.tileSize * 8, 5);
    expect(Math.max(...tops) + layout.tileSize - Math.min(...tops)).toBeCloseTo(layout.tileSize * 6, 5);
    expect(Math.min(...tops)).toBeCloseTo(layout.boardSize - (Math.max(...tops) + layout.tileSize), 5);
  });

  it("at Fit on an 11×11 board a tile is about 27 dp — the figure the warning copy quotes", () => {
    const layout = boardLayout({ rows: 11, cols: 11, viewport: 300, zoom: FIT_ZOOM });
    expect(layout.tileSize).toBeGreaterThanOrEqual(25);
    expect(layout.tileSize).toBeLessThanOrEqual(30);
  });

  it("scales tiles with the zoom", () => {
    const fit = boardLayout({ rows: 11, cols: 11, viewport: 300, zoom: FIT_ZOOM });
    const doubled = boardLayout({ rows: 11, cols: 11, viewport: 300, zoom: 2 });
    expect(doubled.tileSize).toBeCloseTo(fit.tileSize * 2, 5);
    expect(doubled.boardSize).toBeCloseTo(fit.boardSize * 2, 5);
  });

  it("leaves a centre area for the board art", () => {
    const layout = boardLayout({ rows: 7, cols: 7, viewport: 320, zoom: FIT_ZOOM });
    expect(layout.centre.left).toBeCloseTo(layout.tileSize, 5);
    expect(layout.centre.size).toBeCloseTo(layout.boardSize - layout.tileSize * 2, 5);
  });
});

describe("zoom stops (OQ-23 answered: 50 / 100 / 180 / 240 / 400)", () => {
  it("carries exactly those stops", () => {
    expect([...ZOOM_STOPS]).toEqual([0.5, 1, 1.8, 2.4, 4]);
    expect(FIT_ZOOM).toBe(1);
    expect(MAX_ZOOM).toBe(4);
  });

  it("play starts at 100% and build reaches 50% (1c §6 vs 2a §5 — the per-mode split)", () => {
    expect(minZoom("play")).toBe(1);
    expect(minZoom("select")).toBe(1);
    expect(minZoom("build")).toBe(0.5);
    expect(zoomStops("play")).toEqual([1, 1.8, 2.4, 4]);
    expect(zoomStops("build")).toEqual([0.5, 1, 1.8, 2.4, 4]);
  });

  it("clamps per mode", () => {
    expect(clampZoom(0.2, "play")).toBe(1);
    expect(clampZoom(0.2, "build")).toBe(0.5);
    expect(clampZoom(9, "play")).toBe(4);
  });

  it("steps between stops rather than by a made-up increment", () => {
    expect(stepZoom(1, "in", "play")).toBe(1.8);
    expect(stepZoom(1.8, "in", "play")).toBe(2.4);
    expect(stepZoom(2.4, "in", "play")).toBe(4);
    expect(stepZoom(4, "in", "play")).toBe(4);
    expect(stepZoom(1.8, "out", "play")).toBe(1);
    expect(stepZoom(1, "out", "play")).toBe(1);
    expect(stepZoom(1, "out", "build")).toBe(0.5);
  });

  it("snaps a pinch that landed between stops to the next one", () => {
    expect(stepZoom(1.4, "in", "play")).toBe(1.8);
    expect(stepZoom(1.4, "out", "play")).toBe(1);
  });
});

describe("tap targets", () => {
  it("a tile is tappable only at 44 dp or more", () => {
    expect(tileIsTappable(44)).toBe(true);
    expect(tileIsTappable(43.9)).toBe(false);
  });

  it("40 slots at Fit in the builder are below the threshold; zooming in clears it", () => {
    const fit = boardLayout({ rows: 11, cols: 11, viewport: BUILDER_VIEWPORT, zoom: FIT_ZOOM });
    expect(tileIsTappable(fit.tileSize)).toBe(false);
    expect(tileIsTappable(boardLayout({ rows: 11, cols: 11, viewport: BUILDER_VIEWPORT, zoom: 2.4 }).tileSize)).toBe(true);
  });

  it("16 slots at Fit are also under 44 dp at the builder's real viewport", () => {
    // This is why the warning cannot be gated on tile size: it would fire on a 16-slot board,
    // whose copy ("about 27dp") would then be wrong.
    const fit = boardLayout({ rows: 5, cols: 5, viewport: BUILDER_VIEWPORT, zoom: FIT_ZOOM });
    expect(fit.tileSize).toBeLessThan(44);
  });
});

describe("pan (1c §6 drag to pan, §11 AC5 keep the active token in view)", () => {
  const layout = boardLayout({ rows: 11, cols: 11, viewport: 300, zoom: 2 });

  it("cannot move a board that already fits", () => {
    const fit = boardLayout({ rows: 11, cols: 11, viewport: 300, zoom: FIT_ZOOM });
    expect(clampPan({ x: -50, y: 30 }, fit.boardSize, 300)).toEqual({ x: 0, y: 0 });
  });

  it("allows travel only as far as the board overhangs the viewport", () => {
    const slack = layout.boardSize - 300;
    expect(clampPan({ x: -10_000, y: -10_000 }, layout.boardSize, 300)).toEqual({ x: -slack, y: -slack });
    expect(clampPan({ x: 500, y: 500 }, layout.boardSize, 300)).toEqual({ x: 0, y: 0 });
  });

  it("brings a tile to the middle of the viewport, clamped to the board", () => {
    const middleTile = 20;
    const offset = panToTile(layout, middleTile, 300);
    const rect = layout.tiles[middleTile]!;
    const centreX = rect.left + rect.size / 2 + offset.x;
    expect(centreX).toBeGreaterThan(0);
    expect(centreX).toBeLessThan(300);
  });

  it("every slot is reachable at maximum zoom — the board is not stuck in one quadrant", () => {
    const zoomed = boardLayout({ rows: 11, cols: 11, viewport: 300, zoom: MAX_ZOOM });
    for (const tile of zoomed.tiles) {
      const offset = panToTile(zoomed, tile.index, 300);
      const x = tile.left + tile.size / 2 + offset.x;
      const y = tile.top + tile.size / 2 + offset.y;
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(300);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(300);
    }
  });

  it("finds the slot under a point, and nothing in the centre", () => {
    const rect = layout.tiles[3]!;
    expect(tileAtPoint(layout, rect.left + 1, rect.top + 1)).toBe(3);
    expect(tileAtPoint(layout, layout.boardSize / 2, layout.boardSize / 2)).toBeNull();
  });
});

describe("edges (2a §8 empty-slot label)", () => {
  it("names each edge from the ring geometry", () => {
    // 5×5: slot 1 is the start corner, 2–5 run up the west edge, then across the north.
    expect(edgeOf(0, 5, 5)).toBe("south");
    expect(edgeOf(3, 5, 5)).toBe("west");
    expect(edgeOf(5, 5, 5)).toBe("north");
    expect(edgeOf(9, 5, 5)).toBe("east");
    expect(edgeOf(14, 5, 5)).toBe("south");
  });
});
