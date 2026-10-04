// `3a` §10's ten acceptance criteria (task E0a), one test per numbered criterion, plus the three
// exits and the failed-health path to offline play.
//
// Fake timers throughout: the screen holds three real durations (400 ms before the progress bar,
// 8000 ms before it gives up, 260 ms of logo entry), and jest.setup's Animated automock runs every
// animation on JS timers.

import { act, fireEvent, render, screen, within } from "@testing-library/react-native";
import { accent, control, danger, surface, text, type } from "@royal-navy/shared";
import { AccessibilityInfo, Dimensions, processColor, StyleSheet } from "react-native";

import { fontFamilyForWeight } from "../../ui/fonts";
import { Splash, type SplashScreenProps } from "./Splash";

const WORDMARK = "Royal Navy";
const TAGLINE = "Business board game";
const VERSION = "v1.0.0";
const CONNECTING = "Connecting to server…";
const ERROR_TITLE = "Can't reach the server";
const ERROR_BODY = "Check your connection and try again.";
const RETRY = "Retry";
const PLAY_OFFLINE = "Play offline";
/** §9: the bottom block's cross-fade. */
const SWAP_MS = 180;

/** The style the renderer actually applies, with any array flattened. */
function flat(node: { props: { style?: unknown } }): Record<string, unknown> {
  return StyleSheet.flatten(node.props.style as never) as Record<string, unknown>;
}

/** The design's own frame; jest-expo's default window is 750 dp wide, which is a tablet here. */
function setWindow(width = 360, height = 780) {
  Dimensions.set({ window: { width, height, scale: 2, fontScale: 1 } });
}

function props(overrides: Partial<SplashScreenProps> = {}): SplashScreenProps {
  return {
    onExit: jest.fn(),
    onPlayOffline: jest.fn(),
    deps: {
      restore: () => Promise.resolve(),
      isConnected: () => Promise.resolve(true),
      health: () => Promise.resolve(true),
      hasRefreshToken: () => true,
      refresh: () => Promise.resolve("restored"),
      onboardingCompleted: () => true,
    },
    ...overrides,
  };
}

/** Lets the mount sequence's promises settle without advancing the 400 ms clock. */
async function settle() {
  await act(async () => {});
}

/** §9: "Exit to next route | 200ms fade | ease-in" — the route is replaced when the fade ends. */
const EXIT_FADE_MS = 200;
/** §9: "Progress fill … min visible 300ms" — held once the bar has actually appeared. */
const FILL_MIN_VISIBLE_MS = 300;

/** Settles the sequence, then runs the exit fade that stands between it and the route change. */
async function settleThenExit(extraMs = 0) {
  await settle();
  await act(async () => {
    jest.advanceTimersByTime(EXIT_FADE_MS + extraMs);
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  setWindow();
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

describe("AC1 · the default bottom block is there on first paint", () => {
  it("renders the version label immediately, with no progress bar and no error card", () => {
    render(<Splash {...props()} />);

    // No act(), no timers advanced: this is the first paint.
    expect(screen.getByText(VERSION)).toBeTruthy();
    expect(screen.queryByText(CONNECTING)).toBeNull();
    expect(screen.queryByTestId("alert-card")).toBeNull();
  });

  it("draws the version label in 3a §3 #7's own tokens, not uppercased by the kicker style", () => {
    render(<Splash {...props()} />);
    const label = screen.getByText(VERSION);

    expect(flat(label)).toMatchObject({
      fontFamily: fontFamilyForWeight(700),
      fontSize: 10,
      letterSpacing: type.kicker.tracking * 10,
      color: accent.blue,
    });
    // The copy is `v1.0.0` — a kicker's uppercase transform would render V1.0.0.
    expect(flat(label).textTransform).toBe("none");
  });
});

describe("AC2 · the logo tile never moves between states", () => {
  it("keeps the identical centre block in default, loading and error", async () => {
    const { rerender } = render(<Splash {...props({ deps: failing() })} />);
    const atDefault = centreBlockShape();

    await settle();
    act(() => jest.advanceTimersByTime(400));
    const atLoadingOrError = centreBlockShape();

    rerender(<Splash {...props({ deps: failing() })} />);
    expect(atLoadingOrError).toEqual(atDefault);

    await settle();
    await settle();
    act(() => jest.advanceTimersByTime(8000));
    expect(screen.getByTestId("alert-card")).toBeTruthy();
    expect(centreBlockShape()).toEqual(atDefault);
  });

  it("holds the logo tile at 104 dp with its 52 dp anchor, and hides it from screen readers", () => {
    render(<Splash {...props()} />);
    const tile = screen.getByTestId("splash-logo", { includeHiddenElements: true });

    expect(flat(tile)).toMatchObject({ width: 104, height: 104, borderRadius: 17 });
    // §8: "Logo tile is accessibilityElementsHidden — decorative".
    expect(tile.props.accessibilityElementsHidden).toBe(true);
    // Phosphor renders the size as the svg width and height.
    const anchor = screen.getByTestId("icon-anchor", { includeHiddenElements: true });
    expect([anchor.props.width, anchor.props.height]).toEqual([52, 52]);
  });
});

describe("AC3 · the progress bar appears after 400 ms of pending work", () => {
  it("shows nothing but the version label at 399 ms, and the bar at 400 ms", async () => {
    render(<Splash {...props({ deps: pending() })} />);

    act(() => jest.advanceTimersByTime(399));
    expect(screen.queryByText(CONNECTING)).toBeNull();
    expect(screen.getByText(VERSION)).toBeTruthy();

    act(() => jest.advanceTimersByTime(1));
    expect(screen.getByText(CONNECTING)).toBeTruthy();
    expect(screen.queryByText(VERSION)).toBeNull();
  });

  it("reports real progress, which starts at zero and is never faked to completion", async () => {
    render(<Splash {...props({ deps: pending() })} />);
    act(() => jest.advanceTimersByTime(400));

    expect(screen.getByTestId("splash-progress").props.accessibilityValue).toEqual({
      min: 0,
      max: 100,
      now: 0,
    });
  });

  it("fills the bar with 3a §3 #9's blue gradient rather than the shared gold", async () => {
    render(<Splash {...props({ deps: pending() })} />);
    act(() => jest.advanceTimersByTime(400));

    const fill = screen.getByTestId("progress-fill-gradient");
    expect(fill.props.colors).toEqual(accent.blueProgress.stops.map((stop) => processColor(stop.color)));
  });
});

describe("AC4 · a failed health check shows the error card with the spec's copy", () => {
  it("shows the title and body verbatim", async () => {
    render(<Splash {...props({ deps: failing() })} />);
    await settle();

    expect(screen.getByText(ERROR_TITLE)).toBeTruthy();
    expect(screen.getByText(ERROR_BODY)).toBeTruthy();
    expect(screen.getByText(RETRY)).toBeTruthy();
    expect(screen.getByText(PLAY_OFFLINE)).toBeTruthy();
  });

  it("announces the card as an alert, with the danger stripe down its left edge", async () => {
    render(<Splash {...props({ deps: failing() })} />);
    await settle();

    const card = screen.getByTestId("alert-card");
    expect(card.props.accessibilityRole).toBe("alert");
    expect(flat(card)).toMatchObject({ borderLeftWidth: 3, borderLeftColor: danger.strong });
  });

  it("gives up after the 8000 ms timeout when nothing ever answers", async () => {
    render(<Splash {...props({ deps: pending() })} />);
    await settle();

    act(() => jest.advanceTimersByTime(7999));
    expect(screen.queryByTestId("alert-card")).toBeNull();

    act(() => jest.advanceTimersByTime(1));
    expect(screen.getByTestId("alert-card")).toBeTruthy();
  });

  it("does not exit anywhere on failure — the player stays on the splash", async () => {
    const onExit = jest.fn();
    render(<Splash {...props({ deps: failing(), onExit })} />);
    await settle();

    expect(onExit).not.toHaveBeenCalled();
  });
});

describe("AC5 · Retry re-runs the sequence and returns to the loading block", () => {
  it("swaps straight back to loading and calls health again", async () => {
    const health = jest.fn(() => Promise.resolve(false));
    render(<Splash {...props({ deps: { ...failing(), health } })} />);
    await settle();
    expect(health).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByText(RETRY));

    // §5's optimistic UI: "bottom block swaps to loading" — without waiting 400 ms again. The error
    // card is still on screen for §9's 180 ms cross-fade, which is what a cross-fade means; it is
    // hidden from screen readers while it leaves, so the query has to ask for hidden elements.
    expect(screen.getByText(CONNECTING)).toBeTruthy();
    expect(screen.getByTestId("alert-card", { includeHiddenElements: true })).toBeTruthy();
    act(() => jest.advanceTimersByTime(SWAP_MS));
    expect(screen.queryByTestId("alert-card", { includeHiddenElements: true })).toBeNull();
    await settle();
    expect(health).toHaveBeenCalledTimes(2);
  });

  it("reaches /modes when the retry succeeds", async () => {
    const onExit = jest.fn();
    let healthy = false;
    render(
      <Splash
        {...props({
          onExit,
          deps: { ...props().deps, health: () => Promise.resolve(healthy) },
        })}
      />,
    );
    await settle();
    expect(screen.getByTestId("alert-card")).toBeTruthy();

    healthy = true;
    fireEvent.press(screen.getByText(RETRY));
    await settleThenExit(FILL_MIN_VISIBLE_MS);

    expect(onExit).toHaveBeenCalledWith("/modes");
  });
});

describe("AC6 · Play offline reaches /modes with online-only entries disabled", () => {
  it("replaces to /modes with offline=true", async () => {
    const onPlayOffline = jest.fn();
    render(<Splash {...props({ deps: failing(), onPlayOffline })} />);
    await settle();

    fireEvent.press(screen.getByText(PLAY_OFFLINE));

    expect(onPlayOffline).toHaveBeenCalledTimes(1);
  });

  it("draws both buttons at 44 dp with 3a §3 #15–#16's own radius", async () => {
    render(<Splash {...props({ deps: failing() })} />);
    await settle();

    for (const testID of ["splash-retry", "splash-play-offline"]) {
      expect(flat(screen.getByTestId(testID))).toMatchObject({
        minHeight: control.minTapTarget,
        borderRadius: 16,
      });
    }
  });

  it("gives Play offline the ghost fill and border 3a §3 #16 states", async () => {
    render(<Splash {...props({ deps: failing() })} />);
    await settle();

    const ghost = within(screen.getByTestId("splash-play-offline"));
    expect(flat(ghost.getByTestId("button-fill"))).toMatchObject({
      backgroundColor: surface.inset,
    });
    expect(flat(screen.getByTestId("splash-play-offline"))).toMatchObject({
      borderColor: surface.ghostBorderStrong.color,
    });
  });
});

describe("AC7 · first run routes to /onboarding, never straight to /auth", () => {
  it("exits to /onboarding when onboarding has not been completed", async () => {
    const onExit = jest.fn();
    render(
      <Splash
        {...props({
          onExit,
          deps: { ...props().deps, onboardingCompleted: () => false, hasRefreshToken: () => false },
        })}
      />,
    );
    await settleThenExit();

    expect(onExit).toHaveBeenCalledWith("/onboarding");
  });

  it("exits to /auth when there is no session and onboarding is done", async () => {
    const onExit = jest.fn();
    render(<Splash {...props({ onExit, deps: { ...props().deps, hasRefreshToken: () => false } })} />);
    await settleThenExit();

    expect(onExit).toHaveBeenCalledWith("/auth");
  });

  it("exits to /modes when the session is restored", async () => {
    const onExit = jest.fn();
    render(<Splash {...props({ onExit })} />);
    await settleThenExit();

    expect(onExit).toHaveBeenCalledWith("/modes");
  });

  it("exits once, not once per render", async () => {
    const onExit = jest.fn();
    const { rerender } = render(<Splash {...props({ onExit })} />);
    await settleThenExit();
    rerender(<Splash {...props({ onExit })} />);
    await settleThenExit();

    expect(onExit).toHaveBeenCalledTimes(1);
  });
});

describe("AC8 · airplane mode at launch errors in under a second", () => {
  it("shows the error card without advancing the 8000 ms timeout at all", async () => {
    render(<Splash {...props({ deps: { ...failing(), isConnected: () => Promise.resolve(false) } })} />);
    await settle();

    // Not one timer tick: §4 says "error state immediately, no 8000ms wait".
    expect(screen.getByTestId("alert-card")).toBeTruthy();
  });

  it("never calls the server when there is no radio", async () => {
    const health = jest.fn(() => Promise.resolve(true));
    render(<Splash {...props({ deps: { ...props().deps, isConnected: () => Promise.resolve(false), health } })} />);
    await settle();

    expect(health).not.toHaveBeenCalled();
  });
});

describe("AC9 · 130% font scale", () => {
  it("keeps the wordmark on one line and lets it shrink rather than wrap", () => {
    Dimensions.set({ window: { width: 360, height: 780, scale: 2, fontScale: 1.3 } });
    render(<Splash {...props()} />);

    const wordmark = screen.getByText(WORDMARK);
    // §7: "wordmark wraps is forbidden — allow it to shrink to 26dp via adjustsFontSizeToFit with
    // numberOfLines={1}".
    expect(wordmark.props.numberOfLines).toBe(1);
    expect(wordmark.props.adjustsFontSizeToFit).toBe(true);
    expect(wordmark.props.minimumFontScale).toBeCloseTo(26 / 30, 3);
  });

  it("holds both buttons at 44 dp when the scale grows", async () => {
    Dimensions.set({ window: { width: 360, height: 780, scale: 2, fontScale: 1.3 } });
    render(<Splash {...props({ deps: failing() })} />);
    await settle();

    for (const testID of ["splash-retry", "splash-play-offline"]) {
      expect(flat(screen.getByTestId(testID)).minHeight).toBeGreaterThanOrEqual(44);
    }
  });

  it("lets the body copy wrap freely, which is what the bottom block grows upward for", async () => {
    render(<Splash {...props({ deps: failing() })} />);
    await settle();

    expect(screen.getByText(ERROR_BODY).props.numberOfLines).toBeUndefined();
  });
});

describe("AC10 · Android back exits the app from every state", () => {
  // The route owns the BackHandler registration (useDocumentedBack); navigation.test.tsx asserts it
  // for /splash. What this screen must not do is render an exit of its own.
  it("renders no back control in any state", async () => {
    render(<Splash {...props({ deps: failing() })} />);
    await settle();

    expect(screen.queryByTestId("screen-header-back")).toBeNull();
    expect(screen.queryByLabelText("Back")).toBeNull();
  });
});

describe("§2 · the layout the three states share", () => {
  it("wraps the wordmark and tagline under the tile with the spec's copy", () => {
    render(<Splash {...props()} />);

    expect(screen.getByText(WORDMARK)).toBeTruthy();
    expect(screen.getByText(TAGLINE)).toBeTruthy();
  });

  it("marks the frame as a polite live region, so later state changes are read out (§8)", () => {
    render(<Splash {...props()} />);

    // The mount announcement itself is asserted separately: a live region only speaks on a change,
    // so the string is spoken through announceForAccessibility rather than carried as a label here.
    expect(screen.getByTestId("splash").props.accessibilityLiveRegion).toBe("polite");
  });

  it("sits the two blocks side by side in landscape (§7)", () => {
    setWindow(780, 360);
    render(<Splash {...props()} />);

    expect(flat(screen.getByTestId("splash"))).toMatchObject({ flexDirection: "row" });
  });

  it("stacks them in portrait", () => {
    render(<Splash {...props()} />);
    expect(flat(screen.getByTestId("splash"))).toMatchObject({ flexDirection: "column" });
  });

  it("opens no socket — there is nothing here that could (§6)", () => {
    // The screen takes no socket or match dependency at all; this asserts the shape of its props,
    // which is the only way it could reach one.
    expect(Object.keys(props())).toEqual(["onExit", "onPlayOffline", "deps"]);
  });
});

describe("the wordmark's size, which two derived docs disagree about", () => {
  it("draws 3a §3 #5's 800/30, not docs/02's 800/35 display token", () => {
    render(<Splash {...props()} />);

    expect(flat(screen.getByText(WORDMARK))).toMatchObject({
      fontFamily: fontFamilyForWeight(800),
      fontSize: 30,
      color: text.primary,
    });
  });
});

// ── helpers ───────────────────────────────────────────────────────────────────────

function failing(): SplashScreenProps["deps"] {
  return { ...props().deps, health: () => Promise.resolve(false) };
}

/** Never resolves: the state the 400 ms and 8000 ms rules are about. */
function pending(): SplashScreenProps["deps"] {
  return { ...props().deps, health: () => new Promise<boolean>(() => {}) };
}

/** The centre block's geometry, as the rendered tree reports it. */
function centreBlockShape(): unknown {
  return StyleSheet.flatten(screen.getByTestId("splash-centre").props.style as never);
}

describe("§2 and §3's measurements, which the design check caught taken from the nearest token", () => {
  it("gaps the frame at 13, not the 11 of stackGap.default", () => {
    render(<Splash {...props()} />);
    expect(flat(screen.getByTestId("splash")).gap).toBe(13);
  });

  it("keeps that 13 in landscape, where §7 changes only the direction and the split", () => {
    setWindow(780, 360);
    render(<Splash {...props()} />);

    expect(flat(screen.getByTestId("splash"))).toMatchObject({ flexDirection: "row", gap: 13 });
  });

  it("clips the frame, which §2 states as overflow: hidden", () => {
    render(<Splash {...props()} />);
    expect(flat(screen.getByTestId("splash")).overflow).toBe("hidden");
  });

  it("pads both error buttons by 13, so they grow with the label at 130% (§3 #15–#16)", async () => {
    render(<Splash {...props({ deps: failing() })} />);
    await settle();

    for (const testID of ["splash-retry", "splash-play-offline"]) {
      expect(flat(screen.getByTestId(testID)).paddingVertical).toBe(13);
    }
  });

  it("draws the inset highlight both the tile and Retry state, as a 1 dp top border", async () => {
    render(<Splash {...props({ deps: failing() })} />);
    await settle();

    // RN cannot draw an inset shadow; §3 #3's and #15's highlights are the top edge.
    expect(flat(screen.getByTestId("splash-logo", { includeHiddenElements: true }))).toMatchObject({
      borderTopWidth: 1,
      borderTopColor: surface.insetHighlight,
    });
    expect(flat(screen.getByTestId("splash-retry"))).toMatchObject({
      borderTopWidth: 1,
      borderTopColor: surface.insetHighlightStrong,
    });
  });
});

describe("§9's timings, beyond the two that were already asserted", () => {
  it("does not animate the bottom block on first paint (AC1 wants it visible immediately)", () => {
    render(<Splash {...props()} />);

    // The default block is at full opacity before any frame has run.
    const version = screen.getByText(VERSION);
    expect(flat(version).opacity).toBeUndefined();
  });

  it("holds the bar for 300 ms once it has appeared, so a fast answer cannot flash it", async () => {
    const onExit = jest.fn();
    // Health resolves only after the bar is already up.
    let resolveHealth: (ok: boolean) => void = () => {};
    render(
      <Splash
        {...props({
          onExit,
          deps: { ...props().deps, health: () => new Promise<boolean>((resolve) => (resolveHealth = resolve)) },
        })}
      />,
    );

    // Let the restore and the radio check settle first, so health() has actually been called and
    // resolveHealth points at its promise.
    await settle();
    act(() => jest.advanceTimersByTime(400));
    expect(screen.getByText(CONNECTING)).toBeTruthy();

    await act(async () => resolveHealth(true));
    // The sequence is done, but §9 keeps the bar up: no exit yet.
    await act(async () => {
      jest.advanceTimersByTime(299);
    });
    expect(onExit).not.toHaveBeenCalled();


    await act(async () => {
      jest.advanceTimersByTime(1 + EXIT_FADE_MS);
    });
    expect(onExit).toHaveBeenCalledWith("/modes");
  });

  it("fades the screen out over 200 ms before the route changes", async () => {
    const onExit = jest.fn();
    render(<Splash {...props({ onExit })} />);
    await settle();

    // The sequence has resolved; the fade is what the exit is waiting on.
    expect(onExit).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(199);
    });
    expect(onExit).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it("keeps the stated blue fill at 100%, never the shared bar's green", async () => {
    render(<Splash {...props({ deps: pending() })} />);
    act(() => jest.advanceTimersByTime(400));

    // There is no complete-state element at all when a screen states its own fill.
    expect(screen.queryByTestId("progress-fill-complete")).toBeNull();
    expect(screen.getByTestId("progress-fill-gradient").props.colors).toEqual(
      accent.blueProgress.stops.map((stop) => processColor(stop.color)),
    );
  });
});

describe("§8's mount announcement, which a live region alone never speaks", () => {
  it("announces 'Royal Navy, loading' once, on mount", () => {
    const announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
    render(<Splash {...props()} />);

    expect(announce).toHaveBeenCalledWith("Royal Navy, loading");
    announce.mockRestore();
  });
});

describe("the 8000 ms timeout, once it has given up", () => {
  it("does not navigate away when a late answer arrives after the error card is up", async () => {
    const onExit = jest.fn();
    let resolveHealth: (ok: boolean) => void = () => {};
    render(
      <Splash
        {...props({
          onExit,
          deps: { ...props().deps, health: () => new Promise<boolean>((resolve) => (resolveHealth = resolve)) },
        })}
      />,
    );

    act(() => jest.advanceTimersByTime(8000));
    expect(screen.getByTestId("alert-card")).toBeTruthy();

    // The server finally answers. The card must not vanish under the player's finger.
    await act(async () => resolveHealth(true));
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(onExit).not.toHaveBeenCalled();
    expect(screen.getByTestId("alert-card")).toBeTruthy();
  });
});

describe("the sequence runs once per cold start, whatever re-renders", () => {
  it("calls health and refresh exactly once, even though useReducedMotion resolves after mount", async () => {
    const health = jest.fn(() => Promise.resolve(true));
    const refresh = jest.fn(() => Promise.resolve("restored" as const));
    render(<Splash {...props({ deps: { ...props().deps, health, refresh } })} />);
    await settleThenExit();

    // Before this was guarded, useReducedMotion's state landing after mount changed the effect's
    // identity and re-ran everything: two health checks, and two refreshes. The second refresh
    // presents a rotated-away token (docs/07), so the server refuses it and signs the player out on
    // launch.
    expect(health).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("does not re-run when the props object changes identity", async () => {
    const health = jest.fn(() => Promise.resolve(true));
    const deps = { ...props().deps, health };
    const { rerender } = render(<Splash {...props({ deps })} />);
    await settle();

    // A new deps object, as a parent re-render would produce without a useMemo.
    rerender(<Splash {...props({ deps: { ...deps } })} />);
    await settleThenExit();

    expect(health).toHaveBeenCalledTimes(1);
  });
});

describe("§9's 300 ms hold applies to whichever block replaces the bar", () => {
  it("does not flash the bar when the failure arrives just after it appears", async () => {
    let failHealth: (ok: boolean) => void = () => {};
    render(
      <Splash
        {...props({
          deps: { ...props().deps, health: () => new Promise<boolean>((resolve) => (failHealth = resolve)) },
        })}
      />,
    );

    await settle();
    act(() => jest.advanceTimersByTime(400));
    expect(screen.getByText(CONNECTING)).toBeTruthy();

    // The server refuses 10 ms later. Without the hold the bar would be on screen for 10 ms.
    act(() => jest.advanceTimersByTime(10));
    await act(async () => failHealth(false));

    expect(screen.getByText(CONNECTING)).toBeTruthy();
    expect(screen.queryByTestId("alert-card")).toBeNull();

    await act(async () => {
      jest.advanceTimersByTime(FILL_MIN_VISIBLE_MS);
    });
    expect(screen.getByTestId("alert-card")).toBeTruthy();
  });

  it("shows the error card at once when the bar never appeared", async () => {
    render(<Splash {...props({ deps: failing() })} />);
    await settle();

    // Nothing is owed for a bar nobody saw, so no timer stands between the failure and the card.
    expect(screen.getByTestId("alert-card")).toBeTruthy();
  });
});
