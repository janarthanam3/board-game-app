// 1c · the play HUD. One test per acceptance criterion in §11, plus §5's states and §6's
// interactions (docs/screens/1c-play-hud.md).

import type { MatchState } from "@royal-navy/game-engine";
import { text } from "@royal-navy/shared";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { renderRouter, screen as routerScreen, waitFor } from "expo-router/testing-library";
import { BackHandler, Dimensions } from "react-native";

import { useMatchStore } from "../../stores/match";
import { focusOn } from "../../ui/accessibilityFocus";
import { useSessionStore } from "../../stores/session";
import { useSettingsStore } from "../../stores/settings";

import { Holdings, LIST_NOTE, MatchHud, type MatchHudProps, NO_PROPERTIES, PAUSE_TITLE, PauseSheet } from "./index";
import { ARUN, clone, midgame, NAVEEN } from "./testFixtures";

/**
 * The design's own frame unless a test says otherwise: "Frame 360 × 780" (§2). jest-expo's default
 * window is 750 dp wide, which is the tablet split (§8) — not the layout the spec draws.
 */
function setWindow(width: number, height: number, fontScale = 1): void {
  const size = { width, height, scale: 2, fontScale };
  Dimensions.set({ window: size, screen: size });
}

beforeEach(() => {
  setWindow(360, 780);
});

function renderHud(props: Partial<MatchHudProps> = {}) {
  const defaults: MatchHudProps = {
    state: midgame(),
    matchName: "Friday Night",
    boardName: "Chennai 16 (test)",
    viewerId: NAVEEN,
    local: false,
    view: "cards",
    sort: "colour",
    onViewChange: jest.fn(),
    onSortChange: jest.fn(),
    onPrimaryAction: jest.fn(),
    onOpenTile: jest.fn(),
    onOpenRules: jest.fn(),
    onOpenSettings: jest.fn(),
    onLeaveMatch: jest.fn(),
  };
  const merged = { ...defaults, ...props };
  const view = render(<MatchHud {...merged} />);
  return { ...view, props: merged };
}

/** Where each region sits in the rendered tree, by the order its testID appears. */
function regionOrder(): string[] {
  const tree = JSON.stringify(screen.toJSON());
  return ["board-map", "player-strip", "cash-row", "holdings"]
    .map((testID) => ({ testID, at: tree.indexOf(`"${testID}"`) }))
    .sort((a, b) => a.at - b.at)
    .map((entry) => entry.testID);
}

/**
 * The rendered JSON tree (not the React element tree, which is circular), so a test can ask what a
 * region contains and in which order.
 */
interface RenderedNode {
  props?: Record<string, unknown>;
  children?: (RenderedNode | string)[] | null;
}

function nodeWithTestID(testID: string): RenderedNode {
  const found = findNode(screen.toJSON() as unknown as RenderedNode, testID);
  if (!found) {
    throw new Error(`no rendered node with testID "${testID}"`);
  }
  return found;
}

function findNode(node: RenderedNode | string | null, testID: string): RenderedNode | null {
  if (node === null || typeof node === "string") {
    return null;
  }
  if (node.props?.["testID"] === testID) {
    return node;
  }
  for (const child of node.children ?? []) {
    const found = findNode(child, testID);
    if (found) {
      return found;
    }
  }
  return null;
}

/** Every string rendered under a node, in order. */
function textsUnder(node: RenderedNode | string): string[] {
  if (typeof node === "string") {
    return [node];
  }
  return (node.children ?? []).flatMap(textsUnder);
}

jest.mock("../../ui/accessibilityFocus", () => ({ focusOn: jest.fn() }));

const focusOnMock = focusOn as jest.MockedFunction<typeof focusOn>;

/** A rendered element's style, flattened — RN allows an array of styles on any node. */
function flattenStyle(element: { props: { style?: unknown } }): Record<string, unknown> {
  const style = element.props.style;
  return Object.assign({}, ...(Array.isArray(style) ? style.flat(4) : [style]).filter(Boolean)) as Record<string, unknown>;
}

/** Runs the sheet's and the chip highlight's animations to their end (every test is on fake timers). */
function settle(): void {
  act(() => {
    jest.advanceTimersByTime(500);
  });
}

/** Arun's turn is the fixture's; this hands it to the viewer. */
function myTurn(): MatchState {
  const state = clone(midgame());
  state.turn = { playerId: NAVEEN, stage: "preRoll", doublesThisTurn: 0, dice: null, deadlineMs: null };
  return state;
}

describe("1c acceptance criteria", () => {
  it("AC1: the layout order is board, player strip, cash row, holdings", () => {
    renderHud();
    expect(regionOrder()).toEqual(["board-map", "player-strip", "cash-row", "holdings"]);
  });

  it("AC2: the header shows the match name and Round <n> · <m> players", () => {
    renderHud();
    expect(screen.getByText("Friday Night")).toBeTruthy();
    expect(screen.getByText("Round 3 · 4 players")).toBeTruthy();
  });

  it("AC3: the active player's chip and token are marked, and the turn line names them", () => {
    const { props, rerender } = renderHud();
    expect(screen.getByText("Arun's turn")).toBeTruthy();
    expect(screen.getByTestId(`player-chip-${ARUN}-active`)).toBeTruthy();
    expect(screen.queryByTestId(`player-chip-${NAVEEN}-active`)).toBeNull();
    // The actor's token is the one the board follows; the gold ring is the viewer's own, on the
    // viewer's own turn (§5 "instead") — the two readings are in docs/design-concerns.md.
    expect(screen.getByTestId(`board-token-${ARUN}`)).toBeTruthy();
    expect(flattenStyle(screen.getByTestId(`board-token-${ARUN}`)).borderWidth).toBeUndefined();

    rerender(<MatchHud {...props} state={myTurn()} />);
    expect(flattenStyle(screen.getByTestId(`board-token-${NAVEEN}`)).borderWidth).toBe(2);
  });

  it("AC4: the primary action follows §4 and is disabled with a reason off-turn", () => {
    const { props, rerender } = renderHud();
    const button = screen.getByTestId("primary-action");
    expect(button).toBeDisabled();
    expect(button.props.accessibilityHint).toBe("Waiting for Arun.");
    expect(screen.getByText("OK")).toBeTruthy();

    rerender(<MatchHud {...props} state={myTurn()} />);
    expect(screen.getByText("Roll")).toBeTruthy();
    expect(screen.getByTestId("primary-action")).not.toBeDisabled();
  });

  it("AC5: board zoom clamps to 100%–400%", () => {
    renderHud();
    expect(screen.getByText("100%")).toBeTruthy();
    // 100 → 180 → 240 → 400 → 400 (the documented stops, OQ-23).
    for (let press = 0; press < 5; press++) {
      fireEvent.press(screen.getByLabelText("Zoom in"));
    }
    expect(screen.getByText("400%")).toBeTruthy();
    for (let press = 0; press < 6; press++) {
      fireEvent.press(screen.getByLabelText("Zoom out"));
    }
    // Play mode never reaches the builder's 50% stop (1c §6).
    expect(screen.getByText("100%")).toBeTruthy();
  });

  it("AC6: the property card shows all ten keys in order, with rent now live", () => {
    renderHud();
    const keys = [
      "cost",
      "base rent",
      "1 house",
      "2 houses",
      "3 houses",
      "hotel rent",
      "house cost",
      "hotel cost",
      "mortgage",
      "rent now",
    ];
    const texts = textsUnder(nodeWithTestID("property-card-1"));
    expect(texts.filter((text) => keys.includes(text))).toEqual(keys);
    // Marina Drive carries one house, so rent now is the 1-house rung (₹70), not the base rent.
    expect(texts[texts.indexOf("rent now") + 1]).toBe("₹70");
    expect(texts).toContain("1 houses · 0 hotel built");
  });

  it("AC7: the list view shows name and cost per row and expands to the card's data", () => {
    renderHud({ view: "list" });
    expect(textsUnder(nodeWithTestID("property-row-1"))).toEqual(["Marina Drive", "cost ₹1,400"]);
    expect(screen.getByText(LIST_NOTE)).toBeTruthy();
    expect(screen.queryByTestId("property-card-1")).toBeNull();

    fireEvent.press(screen.getByTestId("property-row-1"));
    expect(screen.getByTestId("property-row-1-expanded")).toBeTruthy();
    expect(screen.getByTestId("property-card-1")).toBeTruthy();
  });

  it("AC8: the holdings region is the only scroller, and the board never scrolls off", () => {
    renderHud();
    const scrollers = screen.getAllByTestId("scroll-region");
    expect(scrollers).toHaveLength(1);
    // The one vertical scroller is inside the holdings region; the strip's is horizontal (§8).
    expect(findNode(nodeWithTestID("holdings"), "scroll-region")).not.toBeNull();
    expect(screen.getByTestId("player-chips").props.horizontal).toBe(true);
  });

  it("AC9: Android back and the Menu button both open the pause sheet, and neither leaves the match", () => {
    renderHud();
    expect(screen.queryByText(PAUSE_TITLE)).toBeNull();

    fireEvent.press(screen.getByLabelText("Menu"));
    expect(screen.getByText(PAUSE_TITLE)).toBeTruthy();
    // Back closes the topmost overlay first, then reopens the sheet — it never leaves.
    act(() => {
      BackHandler.mockPressBack();
    });
    settle();
    expect(screen.queryByText(PAUSE_TITLE)).toBeNull();
    act(() => {
      BackHandler.mockPressBack();
    });
    expect(screen.getByText(PAUSE_TITLE)).toBeTruthy();
    expect(BackHandler.exitApp).not.toHaveBeenCalled();
    // The HUD stays rendered behind the sheet (3i §3 #1).
    expect(screen.getByTestId("cash-row")).toBeTruthy();
  });

  it("AC10: the press reports the action and changes nothing on its own", () => {
    // The optimistic apply and its rollback are the turn loop's (E3); the HUD renders the state it
    // is given and reports the intent, so a rejected action can only come back as a new state.
    const { props } = renderHud({ state: myTurn() });
    fireEvent.press(screen.getByTestId("primary-action"));
    expect(props.onPrimaryAction).toHaveBeenCalledWith(expect.objectContaining({ intent: "roll", label: "Roll" }));
    expect(screen.getByText("Roll")).toBeTruthy();
  });

  it("AC11: going bankrupt replaces the HUD with 1g", async () => {
    useMatchStore.setState({
      current: {
        matchId: "m-1",
        players: [NAVEEN, ARUN],
        me: NAVEEN,
        turnPlayerId: ARUN,
        modalLock: false,
        auctionLive: false,
        owesMoreThanCash: false,
        eliminated: true,
        spectator: false,
        local: false,
      },
      snapshot: { state: midgame(), name: "Friday Night" },
    });
    useSessionStore.setState({ status: "signedIn", accountId: "acc-1", onboardingCompleted: true, pendingHref: null });

    renderRouter("app", { initialUrl: "/match/m-1" });

    await waitFor(() => expect(routerScreen).toHavePathname("/match/m-1/out"));
    expect(routerScreen.queryByTestId("hud")).toBeNull();
  });

  it("AC12: every money value renders as ₹ with Indian grouping and no decimals", () => {
    const state = clone(midgame());
    state.players[NAVEEN]!.cash = 120_000;
    renderHud({ state });
    expect(screen.getByTestId("cash-value")).toHaveTextContent("₹1,20,000");
    for (const value of ["₹1,400", "₹700", "₹70"]) {
      expect(screen.getAllByText(value).length).toBeGreaterThan(0);
    }
    expect(screen.queryByText(/₹[\d,]+\.\d/)).toBeNull();
  });
});

describe("1c states (§5)", () => {
  it("your turn: the action is live", () => {
    renderHud({ state: myTurn() });
    expect(screen.getByTestId("primary-action")).not.toBeDisabled();
  });

  it("animating a move: the board locks and the action shows OK disabled", () => {
    renderHud({ state: myTurn(), moving: true });
    expect(screen.getByText("OK")).toBeTruthy();
    expect(screen.getByTestId("primary-action")).toBeDisabled();
    expect(screen.getByLabelText("Zoom in")).toBeDisabled();
  });

  it("loading: the board and the strip are skeletons until the first snapshot", () => {
    renderHud({ state: null });
    expect(screen.getByTestId("board-skeleton", { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByTestId("player-strip-skeleton", { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByTestId("board-map")).toBeNull();
  });

  it("empty holdings: No properties yet.", () => {
    const state = clone(midgame());
    state.tiles.forEach((tile) => {
      tile.ownerId = null;
    });
    renderHud({ state });
    expect(screen.getByText(NO_PROPERTIES)).toBeTruthy();
    expect(NO_PROPERTIES).toBe("No properties yet.");
    expect(screen.getByText("My properties · 0")).toBeTruthy();
  });
});

describe("1c interactions (§6)", () => {
  it("a board tile opens its property card", () => {
    const { props } = renderHud();
    fireEvent.press(screen.getByTestId("board-tile-1"));
    expect(props.onOpenTile).toHaveBeenCalledWith(1);
  });

  it("a player chip opens that player's summary, and a long press goes to 3q", () => {
    const onOpenPlayer = jest.fn();
    const onLongPressPlayer = jest.fn();
    renderHud({ onOpenPlayer, onLongPressPlayer });
    fireEvent.press(screen.getByTestId(`player-chip-${ARUN}`));
    expect(onOpenPlayer).toHaveBeenCalledWith(ARUN);
    fireEvent(screen.getByTestId(`player-chip-${ARUN}`), "longPress");
    expect(onLongPressPlayer).toHaveBeenCalledWith(ARUN);
  });

  it("Cards / List switches the holdings view", () => {
    const { props } = renderHud();
    fireEvent.press(screen.getByTestId("segment-list"));
    expect(props.onViewChange).toHaveBeenCalledWith("list");
  });

  it("the sort chip cycles colour → cost → rent now", () => {
    const { props } = renderHud();
    expect(screen.getByTestId("holdings-sort")).toHaveTextContent("colour");
    fireEvent.press(screen.getByTestId("holdings-sort"));
    expect(props.onSortChange).toHaveBeenCalledWith("cost");
  });

  it("the pause sheet's Rules and Settings push their screens, and Leave asks first", () => {
    const { props } = renderHud();
    fireEvent.press(screen.getByLabelText("Menu"));
    fireEvent.press(screen.getByTestId("pause-rules"));
    expect(props.onOpenRules).toHaveBeenCalled();
    fireEvent.press(screen.getByTestId("pause-settings"));
    expect(props.onOpenSettings).toHaveBeenCalled();

    fireEvent.press(screen.getByTestId("pause-leave"));
    expect(screen.getByText("Leave this match?")).toBeTruthy();
    expect(props.onLeaveMatch).not.toHaveBeenCalled();
    fireEvent.press(screen.getByLabelText("Leave"));
    expect(props.onLeaveMatch).toHaveBeenCalled();
  });

  it("the pause sheet's Sound and Haptics write the local preference at once (3i §6)", () => {
    useSettingsStore.setState({ sfx: true, haptics: true });
    renderHud();
    fireEvent.press(screen.getByLabelText("Menu"));
    fireEvent(screen.getByLabelText("Sound"), "valueChange", false);
    expect(useSettingsStore.getState().sfx).toBe(false);
    fireEvent(screen.getByLabelText("Haptics"), "valueChange", false);
    expect(useSettingsStore.getState().haptics).toBe(false);
  });

  it("a board with no turn timer says so in the pause sheet (3i §4)", () => {
    const state = clone(midgame());
    state.rules.rounds.turnTimerSeconds = null;
    renderHud({ state });
    fireEvent.press(screen.getByLabelText("Menu"));
    expect(screen.getByTestId("pause-status")).toHaveTextContent("No turn timer on this board.");
  });

  it("names the actor in the sheet's status line when it is not your turn (3i §5)", () => {
    // The fixture's turn is Arun's and the viewer is Naveen; E6 supplies the seconds.
    renderHud({ secondsLeft: 21 });
    fireEvent.press(screen.getByLabelText("Menu"));
    expect(screen.getByTestId("pause-status")).toHaveTextContent("Arun's turn · 21s left");
  });

  it("claims nothing about the board's timer before the first snapshot", () => {
    renderHud({ state: null });
    fireEvent.press(screen.getByLabelText("Menu"));
    expect(screen.queryByTestId("pause-status")).toBeNull();
  });

  it("a local match is told the match is saved, not that it goes bankrupt", () => {
    renderHud({ local: true });
    fireEvent.press(screen.getByLabelText("Menu"));
    fireEvent.press(screen.getByTestId("pause-leave"));
    expect(screen.getByText("The match is saved. You can resume it from Game modes.")).toBeTruthy();
  });
});

describe("the set colour, which is board data and not a token (OQ-51)", () => {
  it("paints the set line and the list bar in a group colour the platform can render", () => {
    // The fixture's purple group: a colour React Native parses.
    renderHud();
    expect(screen.getByTestId("property-card-1-set")).toHaveStyle({ color: "purple" });
  });

  it("falls back rather than drawing nothing when the board stores an unrenderable colour", () => {
    const state = clone(midgame());
    // `sky` and `amber` are in the shipped seed and are not CSS colour keywords.
    state.board.groups[0]!.colour = "sky";
    renderHud({ state });
    // The line still reads, in the meta colour, and still names the set.
    expect(screen.getByTestId("property-card-1-set")).toHaveTextContent("sky set");
    expect(screen.getByTestId("property-card-1-set")).toHaveStyle({ color: text.muted });
  });
});

describe("1c accessibility (§9)", () => {
  it("a player chip is one focus stop, announcing the name and the cash in words", () => {
    renderHud();
    expect(screen.getByLabelText("Arun, nine thousand one hundred rupees")).toBeTruthy();
  });

  it("the turn line is a polite live region", () => {
    renderHud();
    expect(screen.getByTestId("turn-line").props.accessibilityLiveRegion).toBe("polite");
  });

  it("money in the cash row is announced in words, not as ₹", () => {
    renderHud();
    expect(screen.getByTestId("cash-value").props.accessibilityLabel).toBe("six thousand two hundred rupees");
  });
});

describe("3i §9: focus returns to the Menu button", () => {
  it("hands focus back to the control that opened the sheet, once it has animated away", () => {
    renderHud();
    fireEvent.press(screen.getByLabelText("Menu"));
    focusOnMock.mockClear();

    fireEvent.press(screen.getByTestId("pause-resume"));
    // §10 dismisses over 200 ms; focus moves after that, not under a sheet still on screen.
    expect(focusOnMock).not.toHaveBeenCalled();
    settle();
    expect(focusOnMock).toHaveBeenCalledTimes(1);
  });

  it("does the same when Android back closes the sheet", () => {
    renderHud();
    fireEvent.press(screen.getByLabelText("Menu"));
    focusOnMock.mockClear();

    act(() => {
      BackHandler.mockPressBack();
    });
    settle();
    expect(focusOnMock).toHaveBeenCalledTimes(1);
  });
});

describe("1c responsive (§8)", () => {
  it("360 dp: one column, the board square, the strip scrolling sideways", () => {
    renderHud();
    expect(screen.getByTestId("player-chips").props.horizontal).toBe(true);
    // The board takes the content column: 360 dp less the frame's 17 dp padding either side.
    expect(renderedBoardSize()).toBe(360 - 17 * 2);
  });

  it("tablet: board left, strip and holdings right, and the strip stays horizontal in portrait", () => {
    setWindow(800, 1200);
    renderHud();
    // §8 splits the tablet 60/40 but only landscape "becomes a vertical column"; §2 draws the strip
    // horizontal, so a portrait tablet keeps it that way.
    expect(screen.getByTestId("player-chips").props.horizontal).toBe(true);
    // 60% of the 480 dp content column (docs/02 "Responsive"), less its padding.
    expect(renderedBoardSize()).toBe(Math.round((480 - 34) * 0.6));
  });

  it("landscape: the same split, and there the strip becomes a vertical column", () => {
    setWindow(780, 360);
    renderHud();
    expect(screen.getByTestId("player-chips").props.horizontal).toBe(false);
    expect(renderedBoardSize()).toBe(Math.round((480 - 34) * 0.6));
  });

  it("130% font scale: the chips grow to 64 dp and the strip still scrolls", () => {
    setWindow(360, 780, 1.3);
    renderHud();
    expect(screen.getByTestId(`player-chip-${ARUN}`)).toHaveStyle({ minHeight: 64 });
    expect(screen.getByTestId("player-chips").props.horizontal).toBe(true);
  });
});

/**
 * The board's rendered square. At Fit the grid is exactly the viewport wide (layout.ts: boardSize =
 * tileSize × span, and tileSize = viewport / span at zoom 1), so the grid's width is the viewport
 * the HUD handed to `BoardMap`.
 */
function renderedBoardSize(): number {
  const style = nodeWithTestID("board-grid").props?.["style"] as { width?: number } | undefined;
  return style?.width ?? 0;
}

describe("the pause sheet on its own (3i)", () => {
  it("keeps §2's fixed order: status, Sound, Haptics, Rules, Resume match, Settings, Leave match", () => {
    render(
      <PauseSheet
        visible
        boardName="Chennai 16 (test)"
        local={false}
        turnTimerSeconds={null}
        onDismiss={jest.fn()}
        onOpenRules={jest.fn()}
        onOpenSettings={jest.fn()}
        onLeaveMatch={jest.fn()}
        leaveDialogOpen={false}
        onLeavePress={jest.fn()}
        onLeaveDismiss={jest.fn()}
      />,
    );
    const texts = textsUnder(nodeWithTestID("pause-sheet"));
    const order = ["Paused", "No turn timer on this board.", "Sound", "Haptics", "Rules", "Resume match", "Settings", "Leave match"];
    expect(texts.filter((text) => order.includes(text))).toEqual(order);
  });

  it("offers a spectator no Resume match and no timer line (§5)", () => {
    render(
      <PauseSheet
        visible
        spectating
        boardName="Chennai 16 (test)"
        local={false}
        turnTimerSeconds={null}
        onDismiss={jest.fn()}
        onOpenRules={jest.fn()}
        onOpenSettings={jest.fn()}
        onLeaveMatch={jest.fn()}
        leaveDialogOpen={false}
        onLeavePress={jest.fn()}
        onLeaveDismiss={jest.fn()}
      />,
    );
    expect(screen.queryByTestId("pause-resume")).toBeNull();
    expect(screen.queryByTestId("pause-no-timer")).toBeNull();
    expect(screen.getByTestId("pause-rules")).toBeTruthy();
    expect(screen.getByTestId("pause-leave")).toBeTruthy();
  });
});

describe("the holdings region on its own", () => {
  it("renders the empty line rather than a card list when nothing is held", () => {
    render(
      <Holdings
        holdings={[]}
        view="cards"
        sort="colour"
        expandedTileIndex={null}
        onViewChange={jest.fn()}
        onSortPress={jest.fn()}
        onRowPress={jest.fn()}
      />,
    );
    expect(screen.getByTestId("holdings-empty")).toHaveTextContent(NO_PROPERTIES);
  });
});
