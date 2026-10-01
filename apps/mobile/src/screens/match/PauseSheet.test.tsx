// 3i · the pause sheet. One test per acceptance criterion in §11, plus §3's twelve values, §4's and
// §5's status lines and §9's focus (docs/screens/3i-pause-sheet.md).

import { control, danger, frame, gold, green, motion, radius, shadow, surface, text, withAlpha } from "@royal-navy/shared";
import { act, fireEvent, render, screen, within } from "@testing-library/react-native";

import { Dimensions, Modal } from "react-native";

import { easingFor } from "../../components/motion";
import { useSettingsStore } from "../../stores/settings";
import { focusOn } from "../../ui/accessibilityFocus";
import {
  LEAVE_DIALOG_LOCAL,
  LEAVE_DIALOG_ONLINE,
  LEAVE_DIALOG_TITLE,
  NO_TURN_TIMER,
  PAUSE_MOTION,
  PauseSheet,
  type PauseSheetProps,
  PAUSE_TITLE,
  SHEET_APPEARANCE,
  statusLine,
  TOGGLE_APPEARANCE,
} from "./PauseSheet";

jest.mock("../../ui/accessibilityFocus", () => ({ focusOn: jest.fn() }));

const focusOnMock = focusOn as jest.MockedFunction<typeof focusOn>;

function renderSheet(props: Partial<PauseSheetProps> = {}) {
  const defaults: PauseSheetProps = {
    visible: true,
    boardName: "Chennai Edition",
    local: false,
    turnTimerSeconds: 30,
    secondsLeft: 32,
    held: false,
    actorName: null,
    onDismiss: jest.fn(),
    onOpenRules: jest.fn(),
    onOpenSettings: jest.fn(),
    onLeaveMatch: jest.fn(),
    leaveDialogOpen: false,
    onLeavePress: jest.fn(),
    onLeaveDismiss: jest.fn(),
  };
  const merged = { ...defaults, ...props };
  const view = render(<PauseSheet {...merged} />);
  return { ...view, props: merged };
}

/** A rendered element's style, flattened. */
function styleOf(element: { props: { style?: unknown } }): Record<string, unknown> {
  const style = element.props.style;
  return Object.assign({}, ...(Array.isArray(style) ? style.flat(4) : [style]).filter(Boolean)) as Record<string, unknown>;
}

/** The design's own frame unless a test says otherwise (`3i` §2's phone sheet). */
function setWindow(width: number, height: number): void {
  const size = { width, height, scale: 2, fontScale: 1 };
  Dimensions.set({ window: size, screen: size });
}

beforeEach(() => {
  focusOnMock.mockClear();
  setWindow(360, 780);
  useSettingsStore.setState({ sfx: true, music: true, haptics: true });
});

describe("3i acceptance criteria", () => {
  it("AC1: the sheet opens over a still-rendered HUD", () => {
    // The HUD half is asserted in MatchHud.test.tsx (AC9 there); here: the sheet is a modal over the
    // screen, with the scrim §3 #1 gives it, and it renders nothing when it is not visible.
    renderSheet({ visible: false });
    expect(screen.queryByText(PAUSE_TITLE)).toBeNull();

    renderSheet();
    expect(screen.getByText(PAUSE_TITLE)).toBeTruthy();
    expect(screen.getByTestId("sheet-panel").props.accessibilityViewIsModal).toBe(true);
  });

  it("AC2: the rows appear in §2's fixed order", () => {
    renderSheet({ turnTimerSeconds: null });
    const order = [
      PAUSE_TITLE,
      NO_TURN_TIMER,
      "Sound",
      "Haptics",
      "Rules",
      "Resume match",
      "Settings",
      "Leave match",
    ];
    const tree = JSON.stringify(screen.toJSON());
    const positions = order.map((label) => tree.indexOf(label));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(positions.every((at) => at >= 0)).toBe(true);
  });

  it("AC3: the row labels and hints are §3's verbatim", () => {
    renderSheet();
    expect(screen.getByText("Sound")).toBeTruthy();
    expect(screen.getByText("Dice, cash and card cues")).toBeTruthy();
    expect(screen.getByText("Haptics")).toBeTruthy();
    expect(screen.getByText("Buzz on your turn")).toBeTruthy();
    expect(screen.getByText("Rules")).toBeTruthy();
    expect(screen.getByText("Chennai Edition · read-only")).toBeTruthy();
  });

  it("AC4: in an online match the timer keeps running while the sheet is open", () => {
    // §4: "an online player cannot buy time by opening the menu". The clock is E6's; what this screen
    // must not do is claim the timer is held when it is not.
    renderSheet({ local: false, held: false, secondsLeft: 24 });
    expect(screen.getByTestId("pause-status")).toHaveTextContent("Turn timer running · 24s left");
    expect(screen.queryByText(/held/)).toBeNull();
  });

  it("AC5: in pass-and-play and solo the timer is genuinely held", () => {
    renderSheet({ local: true, held: true, secondsLeft: 32 });
    expect(screen.getByTestId("pause-status")).toHaveTextContent("Turn timer held · 32s left");
    expect(styleOf(screen.getByTestId("pause-status")).color).toBe(gold.flat);
  });

  it("AC6: a board with no turn timer shows the alternate status line", () => {
    renderSheet({ turnTimerSeconds: null });
    expect(screen.getByTestId("pause-status")).toHaveTextContent(NO_TURN_TIMER);
    expect(NO_TURN_TIMER).toBe("No turn timer on this board.");
    expect(styleOf(screen.getByTestId("pause-status")).color).toBe(text.muted);
  });

  it("AC7: Rules opens a read-only view", () => {
    const { props } = renderSheet();
    fireEvent.press(screen.getByTestId("pause-rules"));
    expect(props.onOpenRules).toHaveBeenCalled();
    // The row states it, so a reader knows before opening.
    expect(screen.getByText("Chennai Edition · read-only")).toBeTruthy();
  });

  it("AC8: Settings opens the settings screen", () => {
    const { props } = renderSheet();
    fireEvent.press(screen.getByTestId("pause-settings"));
    expect(props.onOpenSettings).toHaveBeenCalled();
  });

  it("AC9: Leave match shows the online warning, or the local save message", () => {
    const online = renderSheet({ leaveDialogOpen: true, local: false });
    expect(screen.getByText(LEAVE_DIALOG_TITLE)).toBeTruthy();
    expect(screen.getByText(LEAVE_DIALOG_ONLINE)).toBeTruthy();
    expect(LEAVE_DIALOG_ONLINE).toBe(
      "You'll be marked bankrupt and your properties return to the bank. This can't be undone.",
    );
    online.unmount();

    renderSheet({ leaveDialogOpen: true, local: true });
    expect(screen.getByText(LEAVE_DIALOG_LOCAL)).toBeTruthy();
    expect(LEAVE_DIALOG_LOCAL).toBe("The match is saved. You can resume it from Game modes.");
  });

  it("AC10: scrim tap, Android back and Resume match all dismiss identically", () => {
    const { props } = renderSheet();
    fireEvent.press(screen.getByTestId("pause-resume"));
    expect(props.onDismiss).toHaveBeenCalledTimes(1);

    // The scrim animates on the native driver, so its JS-side opacity stays 0 under Jest and RNTL
    // would otherwise treat the backdrop inside it as hidden.
    fireEvent.press(screen.getByTestId("sheet-backdrop", { includeHiddenElements: true }));
    expect(props.onDismiss).toHaveBeenCalledTimes(2);

    // Android back, which the Modal routes to the same handler.
    fireEvent(screen.UNSAFE_getByType(Modal), "requestClose");
    expect(props.onDismiss).toHaveBeenCalledTimes(3);
  });
});

describe("3i §3: the values the docs/03 components do not have", () => {
  it("gives the sheet its own radius, gap, top border, shadow and scrim", () => {
    renderSheet();
    // The scrim fades in over 140 ms and is opacity 0 — so, to RNTL, hidden — until it has.
    act(() => {
      jest.advanceTimersByTime(400);
    });
    const surfaceStyle = styleOf(screen.getByTestId("sheet-surface"));
    expect(surfaceStyle.borderTopLeftRadius).toBe(20);
    expect(surfaceStyle.borderTopRightRadius).toBe(20);
    expect(surfaceStyle.gap).toBe(11);
    expect(surfaceStyle.borderTopWidth).toBe(1);
    expect(surfaceStyle.borderTopColor).toBe(withAlpha(surface.divider.color, 0.45));
    // Not the component's own values.
    expect(surfaceStyle.borderTopLeftRadius).not.toBe(radius.sheet);

    // The scrim animates its opacity from 0, which RNTL treats as hidden.
    expect(styleOf(screen.getByTestId("sheet-scrim", { includeHiddenElements: true })).backgroundColor).toBe(
      withAlpha(surface.scrim, 0.64),
    );
    const panel = styleOf(screen.getByTestId("sheet-panel"));
    expect(panel.shadowOffset).toEqual({ width: 0, height: -12 });
    // §3 #2's blur is 34; `shadowStyle` halves a CSS blur for RN's radius, as it does for every
    // other shadow in the app, so the panel carries 17 rather than 34.
    expect(panel.shadowRadius).toBe(34 / 2);
    expect(panel.shadowColor).toBe(withAlpha(shadow.sheet.color, 0.5));
    // Not the component's own sheet shadow, which is offset -10 at .55.
    expect(panel.shadowOffset).not.toEqual({ width: shadow.sheet.x, height: shadow.sheet.y });
  });

  it("gives the grabber 36 × 4 dp in its own colour", () => {
    renderSheet();
    const grabber = styleOf(screen.getByTestId("sheet-grabber"));
    expect(grabber.width).toBe(36);
    expect(grabber.height).toBe(control.sheetGrabber.height);
    expect(grabber.backgroundColor).toBe(withAlpha(surface.divider.color, 0.35));
    expect(grabber.width).not.toBe(control.sheetGrabber.width);
  });

  it("gives every row min-height 48, radius 16 and a 600 14 label", () => {
    renderSheet();
    for (const testID of ["pause-sound", "pause-haptics", "pause-rules"]) {
      const frame = styleOf(screen.getByTestId(testID));
      expect(frame.minHeight).toBe(48);
      expect(frame.borderRadius).toBe(16);
      expect(frame.minHeight).not.toBe(control.listRow.minHeight);
    }
    const label = styleOf(screen.getByText("Sound"));
    expect(label.fontSize).toBe(14);
    expect(label.color).toBe(text.secondary);
    // The hint already matches docs/03's meta: 600 12 in text.muted.
    expect(styleOf(screen.getByText("Buzz on your turn")).fontSize).toBe(12);
  });

  it("gives the Rules caret 16 dp", () => {
    renderSheet();
    // Phosphor renders an SVG sized in props, not a `size` prop on the host node.
    const caret = screen.getByTestId("icon-caret-right");
    expect([caret.props.width, caret.props.height]).toEqual([16, 16]);
  });

  it("gives the switch 44 × 26 with its own on-track and knob colours", () => {
    renderSheet();
    const track = styleOf(screen.getByLabelText("Sound"));
    expect(track.width).toBe(44);
    expect(track.height).toBe(26);
    // Both toggles are on, so both fills are in the tree; the Sound row's is the first.
    expect(styleOf(screen.getAllByTestId("toggle-on-fill")[0]!).backgroundColor).toBe(withAlpha(green.flat, 0.45));
    expect(styleOf(screen.getAllByTestId("toggle-knob")[0]!).backgroundColor).toBe(green.flat);
  });

  it("gives Settings and Leave match radius 16, min-height 44 and a 700 15 label", () => {
    renderSheet();
    const settings = styleOf(screen.getByTestId("pause-settings"));
    expect(settings.borderRadius).toBe(16);
    expect(settings.minHeight).toBe(44);
    expect(styleOf(screen.getByText("Settings")).fontSize).toBe(15);
    expect(styleOf(screen.getByText("Settings")).color).toBe(text.secondary);

    const leave = styleOf(screen.getByTestId("pause-leave"));
    expect(leave.borderRadius).toBe(16);
    expect(leave.minHeight).toBe(44);
    expect(leave.borderColor).toBe(withAlpha(danger.strong, 0.6));
    expect(styleOf(within(screen.getByTestId("pause-leave")).getByTestId("button-fill")).backgroundColor).toBe(
      withAlpha(danger.strong, 0.14),
    );
    expect(styleOf(screen.getByText("Leave match")).fontSize).toBe(15);
    expect(styleOf(screen.getByText("Leave match")).color).toBe(danger.text);
  });

  it("leaves Resume match on the primary button's own values, which §3 #7 matches", () => {
    renderSheet();
    const resume = styleOf(screen.getByTestId("pause-resume"));
    expect(resume.minHeight).toBe(control.primaryButton.height);
    expect(resume.borderRadius).toBe(control.primaryButton.radius);
    expect(styleOf(screen.getByText("Resume match")).color).toBe(text.onGold);
  });
});

describe("3i §4 and §5: the status line", () => {
  it("reads `<name>'s turn · <n>s left` when it is not your turn", () => {
    renderSheet({ actorName: "Priya", secondsLeft: 18 });
    expect(screen.getByTestId("pause-status")).toHaveTextContent("Priya's turn · 18s left");
  });

  it("turns danger under ten seconds while the clock is running", () => {
    renderSheet({ held: false, secondsLeft: 9 });
    expect(screen.getByTestId("pause-status")).toHaveTextContent("Turn timer running · 9s left");
    expect(styleOf(screen.getByTestId("pause-status")).color).toBe(danger.text);
  });

  it("stays gold under ten seconds when the clock is genuinely held", () => {
    renderSheet({ local: true, held: true, secondsLeft: 9 });
    expect(styleOf(screen.getByTestId("pause-status")).color).toBe(gold.flat);
  });

  it.each([30, 10, 5])("announces at %is, which §9 names, and not on every other tick", (secondsLeft) => {
    renderSheet({ secondsLeft });
    expect(screen.getByTestId("pause-status").props.accessibilityLiveRegion).toBe("polite");
  });

  it.each([31, 29, 11, 9, 4, 1])("stays quiet at %is, so a reader is not interrupted every second", (secondsLeft) => {
    // §10 changes the digits once a second; §9 asks for three announcements, not sixty.
    renderSheet({ secondsLeft });
    expect(screen.getByTestId("pause-status").props.accessibilityLiveRegion).toBe("none");
  });

  it("announces the no-timer line, which changes rarely", () => {
    renderSheet({ turnTimerSeconds: null });
    expect(screen.getByTestId("pause-status").props.accessibilityLiveRegion).toBe("polite");
  });

  it("shows no status line at all while the clock is unknown", () => {
    // Every line §3, §4 and §5 draw carries `· <n>s left`. One without it is a sentence the design
    // does not have, so until E6 supplies a count the line is withheld rather than invented.
    renderSheet({ secondsLeft: null });
    expect(screen.queryByTestId("pause-status")).toBeNull();
    expect(statusLine({ turnTimerSeconds: 30, secondsLeft: null, held: false, actorName: null })).toBeNull();
  });
});

describe("3i §5: spectating", () => {
  it("offers only Rules, Settings and Leave — no timer line, no Resume match", () => {
    renderSheet({ spectating: true });
    expect(screen.getByTestId("pause-rules")).toBeTruthy();
    expect(screen.getByTestId("pause-settings")).toBeTruthy();
    expect(screen.getByTestId("pause-leave")).toBeTruthy();
    expect(screen.queryByTestId("pause-resume")).toBeNull();
    expect(screen.queryByTestId("pause-status")).toBeNull();
    expect(screen.queryByTestId("pause-sound")).toBeNull();
    expect(screen.queryByTestId("pause-haptics")).toBeNull();
  });
});

describe("3i §6: the two preferences", () => {
  it("writes Sound and Haptics to the same store 3f uses, at once", () => {
    renderSheet();
    fireEvent(screen.getByLabelText("Sound"), "valueChange", false);
    expect(useSettingsStore.getState().sfx).toBe(false);
    fireEvent(screen.getByLabelText("Haptics"), "valueChange", false);
    expect(useSettingsStore.getState().haptics).toBe(false);
  });

  it("Leave match asks before it leaves", () => {
    const { props } = renderSheet();
    fireEvent.press(screen.getByTestId("pause-leave"));
    expect(props.onLeavePress).toHaveBeenCalled();
    expect(props.onLeaveMatch).not.toHaveBeenCalled();
  });
});

describe("3i §9: focus", () => {
  it("puts focus on Paused when the sheet opens", () => {
    renderSheet();
    act(() => {
      jest.advanceTimersByTime(400);
    });
    expect(focusOnMock).toHaveBeenCalled();
  });

  it("marks the title as the heading a reader lands on", () => {
    renderSheet();
    expect(screen.getByText(PAUSE_TITLE).props.accessibilityRole).toBe("header");
  });

  it("does not reach for focus while the sheet is closed", () => {
    renderSheet({ visible: false });
    act(() => {
      jest.advanceTimersByTime(400);
    });
    expect(focusOnMock).not.toHaveBeenCalled();
  });
});

describe("3i §8: responsive", () => {
  it("caps the sheet at 420 dp and centres it (tablet), and at 70% of the window height (landscape)", () => {
    renderSheet();
    const panel = styleOf(screen.getByTestId("sheet-panel"));
    expect(panel.maxWidth).toBe(420);
    expect(panel.alignSelf).toBe("center");
    // 70% of the 780 dp frame this test runs in.
    expect(panel.maxHeight).toBe(780 * 0.7);
    expect(SHEET_APPEARANCE.maxHeightFraction).toBe(0.7);
  });

  it("keeps the frame's padding at the foot of the sheet, plus whatever inset the device has", () => {
    // The insets mock reports zeros, so the composition itself is asserted in Sheet.test.tsx, where
    // the hook can be given a real bottom inset.
    renderSheet();
    expect(styleOf(screen.getByTestId("sheet-surface")).paddingBottom).toBe(frame.padding);
  });

  it("gives the scroller a shrinking height, not a growing one", () => {
    // Inside a panel that sizes to its content a `flex: 1` scroller has nothing to grow into and
    // measures zero — the status line and all three rows would vanish. Jest does no layout, so this
    // pins the one property that decides it.
    renderSheet();
    const scroller = styleOf(within(screen.getByTestId("pause-sheet")).getByTestId("scroll-region"));
    expect(scroller.flexGrow).toBe(0);
    expect(scroller.flexShrink).toBe(1);
    expect(scroller.flexBasis).toBe("auto");
    // And the panel it sits in can give way, or the cap could never bite.
    expect(styleOf(screen.getByTestId("sheet-surface")).flexShrink).toBe(1);
  });

  it("becomes a centred dialog with all four corners at tablet width (§8)", () => {
    setWindow(900, 1200);
    renderSheet();
    expect(styleOf(screen.getByTestId("pause-sheet")).justifyContent).toBe("center");
    const surfaceStyle = styleOf(screen.getByTestId("sheet-surface"));
    expect(surfaceStyle.borderBottomLeftRadius).toBe(radius.sheet);
    expect(surfaceStyle.borderBottomRightRadius).toBe(radius.sheet);
  });

  it("stays a bottom sheet on a phone, with only its top corners rounded", () => {
    renderSheet();
    expect(styleOf(screen.getByTestId("pause-sheet")).justifyContent).toBe("flex-end");
    expect(styleOf(screen.getByTestId("sheet-surface")).borderBottomLeftRadius).toBeUndefined();
  });

  it("scrolls the rows and pins the three actions", () => {
    renderSheet();
    const scroller = within(screen.getByTestId("pause-sheet")).getByTestId("scroll-region");
    // The rows are inside the scroller; the buttons are not.
    expect(within(scroller).getByTestId("pause-rules")).toBeTruthy();
    expect(within(scroller).queryByTestId("pause-leave")).toBeNull();
    const actions = screen.getByTestId("pause-actions");
    expect(within(actions).getByTestId("pause-resume")).toBeTruthy();
    expect(within(actions).getByTestId("pause-settings")).toBeTruthy();
    expect(within(actions).getByTestId("pause-leave")).toBeTruthy();
  });
});

describe("3i §9: the switch carries its hint", () => {
  it("attaches each row's hint to the switch itself, not only to the text beside it", () => {
    renderSheet();
    expect(screen.getByLabelText("Sound").props.accessibilityHint).toBe("Dice, cash and card cues");
    expect(screen.getByLabelText("Haptics").props.accessibilityHint).toBe("Buzz on your turn");
  });

  it("keeps the 44 dp tap minimum from the size the screen states, not from the token default", () => {
    renderSheet();
    const slop = screen.getByLabelText("Sound").props.hitSlop as { top: number; left: number };
    // 26 tall and 44 wide: 9 dp top and bottom reach 44, and no horizontal slop is needed.
    expect(26 + slop.top * 2).toBeGreaterThanOrEqual(control.minTapTarget);
    expect(44 + slop.left * 2).toBeGreaterThanOrEqual(control.minTapTarget);
  });
});

describe("3i §10: motion", () => {
  it("presents over 240 ms and dismisses over 200 ms, on its own two curves", () => {
    // Animated.timing swallows its config, so the assertion is on what the screen hands the sheet —
    // which is the contract §10 states, and which differs from motion.base's 220 ms both ways.
    expect(PAUSE_MOTION.present).toEqual({ durationMs: 240, easing: "cubic-bezier(.2,.8,.2,1)" });
    expect(PAUSE_MOTION.dismiss).toEqual({ durationMs: 200, easing: "ease-in" });
    expect(SHEET_APPEARANCE.present).toBe(PAUSE_MOTION.present);
    expect(SHEET_APPEARANCE.dismiss).toBe(PAUSE_MOTION.dismiss);
    expect(PAUSE_MOTION.present.durationMs).not.toBe(motion.base.durationMs);
  });

  it("gives the switch its own 160 ms knob (§10), not the toggle's 140", () => {
    expect(TOGGLE_APPEARANCE.motion).toEqual({ durationMs: 160, easing: "cubic-bezier(.2,.8,.2,1)" });
    expect(TOGGLE_APPEARANCE.motion?.durationMs).not.toBe(motion.fast.durationMs);
  });

  it("maps both of §10's curves, so neither throws at runtime", () => {
    expect(() => easingFor(PAUSE_MOTION.present.easing)).not.toThrow();
    expect(() => easingFor(PAUSE_MOTION.dismiss.easing)).not.toThrow();
  });
});
