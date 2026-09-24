// BoardMap (docs/03 "Game components", 1c §3 #5–#9 / §5 / §6 / §8, 2a §2.1 / §3.1 #4–#9 / §4 / §5,
// docs/12 accessibility).

import { player } from "@royal-navy/shared";
import { fireEvent, render, screen, within } from "@testing-library/react-native";

import { BoardMap, CENTRE_CAPTIONS, FIT_WARNING, PAN_HINT, type BoardShape } from "./index";

/** A seat colour from the tokens; a group colour is board data, so its name is used as-is. */
const GOLD_SEAT = player.seats[0]!.fill as string;
const SET_COLOUR = "violet";

/** The builder's real map width (docs/12 per-screen table) — 40 slots at Fit are ~19 dp here. */
const BUILDER_VIEWPORT = 210;
/** The play HUD's map is the full content column. */
const PLAY_VIEWPORT = 326;

function board(rows: number, cols: number, filled = true): BoardShape {
  const size = 2 * rows + 2 * cols - 4;
  return {
    rows,
    cols,
    tiles: Array.from({ length: size }, (_, index) => {
      if (index === 0) return { kind: "corner" as const, name: "Start", corner: "GO" };
      if (!filled && index % 5 === 0) return null;
      return { kind: "property" as const, name: `Tile ${index}`, cost: 1_400, groupColour: SET_COLOUR };
    }),
  };
}

describe("ring rendering", () => {
  it.each([
    [5, 5, 16],
    [7, 7, 24],
    [11, 11, 40],
    [6, 8, 24],
  ])("renders every slot of a %i×%i board (%i tiles)", (rows, cols, size) => {
    render(<BoardMap board={board(rows, cols)} viewport={PLAY_VIEWPORT} />);
    expect(screen.getAllByTestId(/^board-tile-\d+$/)).toHaveLength(size);
  });

  it("is one grid for the reader, with a label per tile (docs/12)", () => {
    render(<BoardMap board={board(5, 5)} viewport={PLAY_VIEWPORT} />);
    // Queried by prop: "grid" is an ARIA role React Native does not list, so RNTL's role query
    // cannot match it even though the element carries it.
    const grid = screen.getByTestId("board-grid");
    expect(grid.props.accessibilityRole).toBe("grid");
    expect(screen.getByLabelText("Slot 2, Tile 1, property, ₹1,400")).toBeTruthy();
  });

  it("shows the pan hint verbatim", () => {
    render(<BoardMap board={board(5, 5)} viewport={PLAY_VIEWPORT} />);
    expect(screen.getByText(PAN_HINT)).toBeTruthy();
    expect(PAN_HINT).toBe("Pinch to zoom · drag to pan");
  });

  it("renders the four corner labels the design names", () => {
    const corners: Record<number, string> = { 0: "GO", 4: "CHEST", 8: "JAIL", 12: "GO TO" };
    const withCorners: BoardShape = {
      ...board(5, 5),
      tiles: board(5, 5).tiles.map((tile, index) =>
        corners[index] ? { kind: "corner" as const, name: corners[index]!, corner: corners[index]! } : tile,
      ),
    };
    render(<BoardMap board={withCorners} viewport={PLAY_VIEWPORT} zoom={2.4} />);
    for (const label of ["GO", "CHEST", "JAIL", "GO TO"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });
});

describe("the Fit warning (2a §3.1 #9: Fit on 40 slots only)", () => {
  it("appears at Fit on a 40-slot board", () => {
    render(<BoardMap board={board(11, 11)} viewport={BUILDER_VIEWPORT} zoom={1} mode="build" />);
    expect(screen.getByText(FIT_WARNING)).toBeTruthy();
    expect(FIT_WARNING).toBe(
      "At Fit a tile is about 27dp — names clip, prices drop out, and tap targets fall under 44dp. Zoom in to select or place.",
    );
  });

  it("does not appear once the board is zoomed past Fit", () => {
    render(<BoardMap board={board(11, 11)} viewport={BUILDER_VIEWPORT} zoom={1.8} mode="build" />);
    expect(screen.queryByText(FIT_WARNING)).toBeNull();
  });

  it("never appears on the play HUD — it is the builder's line (2a §3.1 #9)", () => {
    render(<BoardMap board={board(11, 11)} viewport={BUILDER_VIEWPORT} zoom={1} />);
    expect(screen.queryByText(FIT_WARNING)).toBeNull();
  });

  it("does not appear on a 16-slot board even though its tiles are also under 44 dp", () => {
    // The copy quotes "about 27dp", which is only true of the 40-slot ring — so the gate is the
    // ring size, not the tile size. This is the case the old 300 dp test could not see.
    render(<BoardMap board={board(5, 5)} viewport={BUILDER_VIEWPORT} zoom={1} mode="build" />);
    expect(screen.queryByText(FIT_WARNING)).toBeNull();
  });
});

describe("tap targets per mode", () => {
  it("play: a tile under 44 dp stays tappable — only its labels drop (1c §8)", () => {
    const onTilePress = jest.fn();
    render(<BoardMap board={board(11, 11)} viewport={PLAY_VIEWPORT} zoom={1} onTilePress={onTilePress} />);
    fireEvent.press(screen.getByTestId("board-tile-1"));
    expect(onTilePress).toHaveBeenCalledWith(1);
    expect(screen.getByTestId("board-tile-1").props.accessibilityState).toMatchObject({ disabled: false });
  });

  it("build: a tile under 44 dp is display-only — taps are ignored (2a §4)", () => {
    const onTilePress = jest.fn();
    render(<BoardMap board={board(11, 11)} viewport={BUILDER_VIEWPORT} zoom={1} mode="build" onTilePress={onTilePress} />);
    fireEvent.press(screen.getByTestId("board-tile-1"));
    expect(onTilePress).not.toHaveBeenCalled();
    expect(screen.getByTestId("board-tile-1").props.accessibilityState).toMatchObject({ disabled: true });
  });

  it("build: the first tap on a display-only slot surfaces the warning as a toast, once", () => {
    const onDisplayOnlyTap = jest.fn();
    render(
      <BoardMap board={board(11, 11)} viewport={BUILDER_VIEWPORT} zoom={1} mode="build" onDisplayOnlyTap={onDisplayOnlyTap} />,
    );
    fireEvent.press(screen.getByTestId("board-tile-1"));
    fireEvent.press(screen.getByTestId("board-tile-2"));
    expect(onDisplayOnlyTap).toHaveBeenCalledTimes(1);
    expect(onDisplayOnlyTap).toHaveBeenCalledWith(FIT_WARNING);
  });

  it("select: a tile under 44 dp stays tappable — only the builder goes display-only", () => {
    const onTilePress = jest.fn();
    render(
      <BoardMap
        board={board(11, 11)}
        viewport={BUILDER_VIEWPORT}
        zoom={1}
        mode="select"
        highlight={[1]}
        onTilePress={onTilePress}
      />,
    );
    fireEvent.press(screen.getByTestId("board-tile-1"));
    expect(onTilePress).toHaveBeenCalledWith(1);
  });

  it("build: a display-only board smaller than 40 slots raises no toast — the copy would be false", () => {
    const onDisplayOnlyTap = jest.fn();
    render(
      <BoardMap board={board(5, 5)} viewport={BUILDER_VIEWPORT} zoom={1} mode="build" onDisplayOnlyTap={onDisplayOnlyTap} />,
    );
    fireEvent.press(screen.getByTestId("board-tile-1"));
    expect(onDisplayOnlyTap).not.toHaveBeenCalled();
  });

  it("build: the same slot is selectable once it is 44 dp or more", () => {
    const onTilePress = jest.fn();
    render(<BoardMap board={board(11, 11)} viewport={BUILDER_VIEWPORT} zoom={2.4} mode="build" onTilePress={onTilePress} />);
    fireEvent.press(screen.getByTestId("board-tile-1"));
    expect(onTilePress).toHaveBeenCalledWith(1);
  });

  it("every slot is a button for the reader (2a §8)", () => {
    render(<BoardMap board={board(11, 11)} viewport={BUILDER_VIEWPORT} zoom={1} mode="build" />);
    expect(screen.getByTestId("board-tile-1").props.accessibilityRole).toBe("button");
  });
});

describe("locked (1c §5: board interaction locked while a move animates)", () => {
  it("ignores taps while locked", () => {
    const onTilePress = jest.fn();
    render(<BoardMap board={board(5, 5)} viewport={PLAY_VIEWPORT} locked onTilePress={onTilePress} />);
    fireEvent.press(screen.getByTestId("board-tile-1"));
    expect(onTilePress).not.toHaveBeenCalled();
  });

  it("disables the zoom controls while locked", () => {
    render(<BoardMap board={board(5, 5)} viewport={PLAY_VIEWPORT} locked />);
    expect(screen.getByLabelText("Zoom in").props.accessibilityState).toMatchObject({ disabled: true });
  });
});

describe("zoom bar", () => {
  it("shows the live percentage and walks the documented stops", () => {
    const onZoomChange = jest.fn();
    render(<BoardMap board={board(5, 5)} viewport={PLAY_VIEWPORT} zoom={1} onZoomChange={onZoomChange} />);
    expect(screen.getByText("100%")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Zoom in"));
    expect(onZoomChange).toHaveBeenCalledWith(1.8);
  });

  it("Fit returns to 100%", () => {
    const onZoomChange = jest.fn();
    render(<BoardMap board={board(5, 5)} viewport={PLAY_VIEWPORT} zoom={2.4} onZoomChange={onZoomChange} />);
    fireEvent.press(screen.getByLabelText("Fit"));
    expect(onZoomChange).toHaveBeenCalledWith(1);
  });

  it("build mode can reach 50%, play mode cannot (the per-mode split)", () => {
    const build = jest.fn();
    const { unmount } = render(
      <BoardMap board={board(5, 5)} viewport={BUILDER_VIEWPORT} zoom={1} mode="build" onZoomChange={build} />,
    );
    fireEvent.press(screen.getByLabelText("Zoom out"));
    expect(build).toHaveBeenCalledWith(0.5);
    unmount();

    const play = jest.fn();
    render(<BoardMap board={board(5, 5)} viewport={PLAY_VIEWPORT} zoom={1} onZoomChange={play} />);
    fireEvent.press(screen.getByLabelText("Zoom out"));
    expect(play).toHaveBeenCalledWith(1);
  });
});

describe("zoom transitions (2a §9: a step settles over 200 ms, Fit over 280 ms)", () => {
  // Every easing the board animates with must resolve through easingFor(), which throws on a
  // spelling it does not know. Only a re-render with a *changed* zoom runs that code, so these
  // two cases are what stand between a mis-spelled token and a crash on the real screen.
  it("survives a re-render that zooms in to another stop", () => {
    const { rerender } = render(<BoardMap board={board(5, 5)} viewport={PLAY_VIEWPORT} zoom={1} />);
    expect(() => rerender(<BoardMap board={board(5, 5)} viewport={PLAY_VIEWPORT} zoom={1.8} />)).not.toThrow();
    expect(screen.getByText("180%")).toBeTruthy();
  });

  it("survives a re-render back to Fit, whose easing token differs from the step's", () => {
    const { rerender } = render(<BoardMap board={board(5, 5)} viewport={PLAY_VIEWPORT} zoom={2.4} />);
    expect(() => rerender(<BoardMap board={board(5, 5)} viewport={PLAY_VIEWPORT} zoom={1} />)).not.toThrow();
    expect(screen.getByText("100%")).toBeTruthy();
  });

  it("survives a token moving to a new tile (the hop easing)", () => {
    const token = { playerId: "p-naveen", name: "Naveen", colour: GOLD_SEAT, active: true };
    const { rerender } = render(
      <BoardMap board={board(5, 5)} viewport={PLAY_VIEWPORT} tokens={[{ ...token, tileIndex: 1 }]} />,
    );
    expect(() =>
      rerender(<BoardMap board={board(5, 5)} viewport={PLAY_VIEWPORT} tokens={[{ ...token, tileIndex: 4 }]} />),
    ).not.toThrow();
  });

  it("survives picking a tile up (the pick-up easing)", () => {
    const { rerender } = render(
      <BoardMap board={board(5, 5)} viewport={PLAY_VIEWPORT} zoom={1.8} mode="build" pickedUpIndex={null} />,
    );
    expect(() =>
      rerender(<BoardMap board={board(5, 5)} viewport={PLAY_VIEWPORT} zoom={1.8} mode="build" pickedUpIndex={1} />),
    ).not.toThrow();
  });
});

describe("tile faces (docs/03 `TileFace`: below ~40 dp the name goes, then the price)", () => {
  it("shows name and price when there is room (1c §8: labels drop below 44 dp)", () => {
    render(<BoardMap board={board(5, 5)} viewport={PLAY_VIEWPORT} zoom={1.8} />);
    const tile = within(screen.getByTestId("board-tile-1"));
    expect(tile.getByText("Tile 1")).toBeTruthy();
    expect(tile.getByText("₹1,400")).toBeTruthy();
  });

  it("drops a corner label below 44 dp too — it is a board tile label (1c §8)", () => {
    render(<BoardMap board={board(11, 11)} viewport={BUILDER_VIEWPORT} zoom={1} />);
    expect(screen.queryByText("GO")).toBeNull();
    expect(screen.getByLabelText("Slot 1, Start, corner")).toBeTruthy();
  });

  it("drops both at Fit on 40 slots, while the reader's label is unchanged", () => {
    render(<BoardMap board={board(11, 11)} viewport={BUILDER_VIEWPORT} zoom={1} />);
    const tile = within(screen.getByTestId("board-tile-1"));
    expect(tile.queryByText("Tile 1")).toBeNull();
    expect(tile.queryByText("₹1,400")).toBeNull();
    expect(screen.getByLabelText("Slot 2, Tile 1, property, ₹1,400")).toBeTruthy();
  });
});

describe("ownership, buildings and tokens", () => {
  const owned: BoardShape = {
    ...board(5, 5),
    tiles: board(5, 5).tiles.map((tile, index) =>
      index === 1 && tile ? { ...tile, ownerColour: GOLD_SEAT, ownerName: "Priya", houses: 2, hotel: false } : tile,
    ),
  };

  it("renders an owner pip and one pip per house", () => {
    render(<BoardMap board={owned} viewport={PLAY_VIEWPORT} zoom={1.8} />);
    expect(screen.getByTestId("board-tile-1-owner")).toBeTruthy();
    expect(screen.getAllByTestId(/^board-tile-1-house-/)).toHaveLength(2);
    expect(screen.queryByTestId("board-tile-1-hotel")).toBeNull();
  });

  it("renders a single hotel pip instead of houses", () => {
    const withHotel: BoardShape = {
      ...owned,
      tiles: owned.tiles.map((tile, index) => (index === 1 && tile ? { ...tile, houses: 0, hotel: true } : tile)),
    };
    render(<BoardMap board={withHotel} viewport={PLAY_VIEWPORT} zoom={1.8} />);
    expect(screen.getByTestId("board-tile-1-hotel")).toBeTruthy();
    expect(screen.queryAllByTestId(/^board-tile-1-house-/)).toHaveLength(0);
  });

  it("names the owner and the buildings in the tile's label (docs/12)", () => {
    render(<BoardMap board={owned} viewport={PLAY_VIEWPORT} zoom={1.8} />);
    expect(screen.getByLabelText("Slot 2, Tile 1, property, ₹1,400, owned by Priya, 2 houses")).toBeTruthy();
  });

  it("places a token on its tile", () => {
    render(
      <BoardMap
        board={board(5, 5)}
        viewport={PLAY_VIEWPORT}
        tokens={[{ playerId: "p-naveen", name: "Naveen", colour: GOLD_SEAT, tileIndex: 3 }]}
      />,
    );
    expect(screen.getByTestId("board-token-p-naveen")).toBeTruthy();
    expect(screen.getByLabelText("Naveen on slot 4")).toBeTruthy();
  });

  it("rings the active player's own token in gold (1c §5)", () => {
    render(
      <BoardMap
        board={board(5, 5)}
        viewport={PLAY_VIEWPORT}
        tokens={[
          { playerId: "p-naveen", name: "Naveen", colour: GOLD_SEAT, tileIndex: 3, active: true },
          { playerId: "p-priya", name: "Priya", colour: GOLD_SEAT, tileIndex: 5 },
        ]}
      />,
    );
    expect(flatten(screen.getByTestId("board-token-p-naveen").props.style).borderWidth).toBe(2);
    expect(flatten(screen.getByTestId("board-token-p-priya").props.style).borderWidth).toBeUndefined();
  });
});

describe("modes (docs/03 BoardMap prop table)", () => {
  it("build mode shows an empty slot as a dashed plus, labelled with its edge (2a §8)", () => {
    render(<BoardMap board={board(5, 5, false)} viewport={PLAY_VIEWPORT} zoom={1.8} mode="build" />);
    expect(screen.getByTestId("board-tile-5-empty")).toBeTruthy();
    expect(screen.getByLabelText("Slot 6, empty, north edge")).toBeTruthy();
  });

  it("build mode renders the centre art with its three caption lines (2a §3.1 #6)", () => {
    render(<BoardMap board={board(5, 5)} viewport={PLAY_VIEWPORT} zoom={1} mode="build" />);
    for (const caption of CENTRE_CAPTIONS) {
      expect(screen.getByText(caption)).toBeTruthy();
    }
    // All three lines sit inside the one dashed panel, head at 12 dp and hints at 10 dp.
    const slot = screen.getByTestId("image-slot");
    expect(within(slot).getByText(CENTRE_CAPTIONS[2])).toBeTruthy();
    expect(flatten(screen.getByText(CENTRE_CAPTIONS[0]).props.style).fontSize).toBe(12);
    expect(flatten(screen.getByText(CENTRE_CAPTIONS[1]).props.style).fontSize).toBe(10);
  });

  it("sizes the centre art to the ring's inner area", () => {
    render(<BoardMap board={board(5, 5)} viewport={PLAY_VIEWPORT} zoom={1} mode="build" />);
    const centre = flatten(screen.getByTestId("board-centre-art").props.style);
    const tile = PLAY_VIEWPORT / 5;
    expect(centre.width).toBeCloseTo(PLAY_VIEWPORT - tile * 2, 5);
    expect(centre.height).toBeCloseTo(PLAY_VIEWPORT - tile * 2, 5);
    expect(centre.left).toBeCloseTo(tile, 5);
  });

  it("play mode leaves the centre empty", () => {
    render(<BoardMap board={board(5, 5)} viewport={PLAY_VIEWPORT} />);
    expect(screen.getByTestId("board-centre-art")).toBeTruthy();
    expect(screen.queryByText(CENTRE_CAPTIONS[0])).toBeNull();
  });

  it("select mode tints the eligible tiles and only they are pressable", () => {
    const onTilePress = jest.fn();
    render(
      <BoardMap board={board(5, 5)} viewport={PLAY_VIEWPORT} zoom={1.8} mode="select" highlight={[2]} onTilePress={onTilePress} />,
    );
    expect(screen.getByTestId("board-tile-2-highlight")).toBeTruthy();
    expect(screen.queryByTestId("board-tile-3-highlight")).toBeNull();
    fireEvent.press(screen.getByTestId("board-tile-3"));
    expect(onTilePress).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId("board-tile-2"));
    expect(onTilePress).toHaveBeenCalledWith(2);
  });
});

describe("card spaces (docs/03 TileFace: name, price **or rule count**)", () => {
  it("shows the deck's rule count where a property shows its price", () => {
    const withCard: BoardShape = {
      ...board(5, 5),
      tiles: board(5, 5).tiles.map((tile, index) =>
        index === 2 ? { kind: "card" as const, name: "Chance", ruleCount: 6 } : tile,
      ),
    };
    render(<BoardMap board={withCard} viewport={PLAY_VIEWPORT} zoom={1.8} />);
    expect(within(screen.getByTestId("board-tile-2")).getByText("6 rules")).toBeTruthy();
    expect(screen.getByLabelText("Slot 3, Chance, card, 6 rules")).toBeTruthy();
  });

  it("says one rule in the singular", () => {
    const withCard: BoardShape = {
      ...board(5, 5),
      tiles: board(5, 5).tiles.map((tile, index) =>
        index === 2 ? { kind: "card" as const, name: "Chance", ruleCount: 1 } : tile,
      ),
    };
    render(<BoardMap board={withCard} viewport={PLAY_VIEWPORT} zoom={1.8} />);
    expect(within(screen.getByTestId("board-tile-2")).getByText("1 rule")).toBeTruthy();
  });
});

describe("board tile type does not scale (docs/12 font-scale table)", () => {
  it("turns font scaling off on the tile name and price", () => {
    render(<BoardMap board={board(5, 5)} viewport={PLAY_VIEWPORT} zoom={1.8} />);
    const tile = within(screen.getByTestId("board-tile-1"));
    expect(tile.getByText("Tile 1").props.allowFontScaling).toBe(false);
    expect(tile.getByText("₹1,400").props.allowFontScaling).toBe(false);
  });
});

describe("moving a tile (2a §5)", () => {
  it("holding a filled slot picks it up", () => {
    const onTileLongPress = jest.fn();
    render(<BoardMap board={board(5, 5)} viewport={PLAY_VIEWPORT} zoom={1.8} mode="build" onTileLongPress={onTileLongPress} />);
    fireEvent(screen.getByTestId("board-tile-1"), "longPress");
    expect(onTileLongPress).toHaveBeenCalledWith(1);
  });

  it("dropping it on another slot swaps the two", () => {
    const onTileMove = jest.fn();
    const onTilePress = jest.fn();
    render(
      <BoardMap
        board={board(5, 5)}
        viewport={PLAY_VIEWPORT}
        zoom={1.8}
        mode="build"
        pickedUpIndex={1}
        onTileMove={onTileMove}
        onTilePress={onTilePress}
      />,
    );
    fireEvent.press(screen.getByTestId("board-tile-4"));
    expect(onTileMove).toHaveBeenCalledWith(1, 4);
    expect(onTilePress).not.toHaveBeenCalled();
  });

  it("mirrors the move with accessibility actions (2a §8)", () => {
    const onTileLongPress = jest.fn();
    const onTileRemove = jest.fn();
    render(
      <BoardMap
        board={board(5, 5)}
        viewport={PLAY_VIEWPORT}
        zoom={1.8}
        mode="build"
        onTileLongPress={onTileLongPress}
        onTileRemove={onTileRemove}
      />,
    );
    const tile = screen.getByTestId("board-tile-1");
    expect(tile.props.accessibilityActions).toEqual([
      { name: "moveToSlot", label: "Move to slot…" },
      { name: "removeFromBoard", label: "Remove from board" },
    ]);
    fireEvent(tile, "accessibilityAction", { nativeEvent: { actionName: "moveToSlot" } });
    expect(onTileLongPress).toHaveBeenCalledWith(1);
    fireEvent(tile, "accessibilityAction", { nativeEvent: { actionName: "removeFromBoard" } });
    expect(onTileRemove).toHaveBeenCalledWith(1);
  });
});

/** RN style props arrive as nested arrays; flatten to one object for assertions. */
function flatten(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) {
    return style.reduce<Record<string, unknown>>((all, part) => ({ ...all, ...flatten(part) }), {});
  }
  return (style ?? {}) as Record<string, unknown>;
}
