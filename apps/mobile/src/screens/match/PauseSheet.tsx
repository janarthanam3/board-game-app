// 3i · the pause sheet (docs/screens/3i-pause-sheet.md), an overlay above the HUD — docs/04
// "Overlays" lists it as "fired by: HUD menu button", and `1c` §6 adds Android back.
//
// `3i` §3 states sheet, row, switch, caret and button values that the `docs/03` components it is built
// from do not have. Rather than change five shared components for one screen, each value is passed per
// instance through their `appearance` props, the way `ScreenHeader.titleSize` and `Button.minHeight`
// already work. The divergence itself is a contradiction between two derived docs and is recorded in
// `docs/design-concerns.md`, not resolved here.
//
// The clock is **E6**'s: this screen renders §4's and §5's four status lines from the seconds it is
// given and from whether the clock is held, and never counts down itself.

import {
  danger,
  gold,
  green,
  shadow,
  type Motion,
  stackGap,
  surface,
  text,
  type,
  withAlpha,
} from "@royal-navy/shared";
import { useEffect, useRef } from "react";
import { StyleSheet, Text as RNText, View } from "react-native";

import { Button } from "../../components/Button";
import { Dialog } from "../../components/Dialog";
import { Row, type RowAppearance } from "../../components/Row";
import { ScrollRegion } from "../../components/ScrollRegion";
import { Sheet, type SheetAppearance } from "../../components/Sheet";
import type { ToggleAppearance } from "../../components/Toggle";
import { textStyle } from "../../components/typography";
import { focusOn } from "../../ui/accessibilityFocus";
import { useSettingsStore } from "../../stores/settings";

/** Required copy, verbatim (§3, §4, §6). */
export const PAUSE_TITLE = "Paused";
export const NO_TURN_TIMER = "No turn timer on this board.";
export const RESUME_LABEL = "Resume match";
export const SETTINGS_LABEL = "Settings";
export const LEAVE_LABEL = "Leave match";
export const SOUND_ROW = { label: "Sound", meta: "Dice, cash and card cues" } as const;
export const HAPTICS_ROW = { label: "Haptics", meta: "Buzz on your turn" } as const;
export const RULES_ROW = "Rules";
/** §6: the online dialog is the one from `3j`; the local one says the match is saved. */
export const LEAVE_DIALOG_TITLE = "Leave this match?";
export const LEAVE_DIALOG_ONLINE =
  "You'll be marked bankrupt and your properties return to the bank. This can't be undone.";
export const LEAVE_DIALOG_LOCAL = "The match is saved. You can resume it from Game modes.";

/** §5: the status line turns danger inside this many seconds while the clock is running. */
export const RUNNING_OUT_SECONDS = 10;

/**
 * §9: the timer line announces "at 30s, 10s and 5s". §10 changes its digits once a second, so a live
 * region left on would interrupt a reader every second the sheet is open; it is switched on only at
 * the three counts the design names, and for a line that carries no count at all (the no-timer
 * sentence), which changes rarely and should be heard when it does.
 */
export const ANNOUNCE_AT_SECONDS = [30, 10, 5] as const;

function liveRegionFor(secondsLeft: number | null): "polite" | "none" {
  if (secondsLeft === null) {
    return "polite";
  }
  return (ANNOUNCE_AT_SECONDS as readonly number[]).includes(secondsLeft) ? "polite" : "none";
}

// ─── The values §3 states and docs/03's components do not have ───────────────────

/** §10: "Sheet present … 240ms `cubic-bezier(0.2,0.8,0.2,1)`" and "Dismiss 200ms `ease-in`". */
export const PAUSE_MOTION = {
  present: { durationMs: 240, easing: "cubic-bezier(.2,.8,.2,1)" },
  dismiss: { durationMs: 200, easing: "ease-in" },
} as const satisfies { present: Motion; dismiss: Motion };

/** §3 #1–#2 and §10. */
export const SHEET_APPEARANCE: SheetAppearance = {
  topRadius: 20,
  gap: stackGap.default,
  scrim: withAlpha(surface.scrim, 0.64),
  topBorder: { width: 1, color: withAlpha(surface.divider.color, 0.45), style: "solid" },
  shadow: { x: 0, y: -12, blur: 34, color: withAlpha(shadow.sheet.color, 0.5), inset: false },
  grabber: { width: 36, colour: withAlpha(surface.divider.color, 0.35) },
  // §8: "Tablet: centred dialog capped at 420dp" and "Landscape: sheet caps at 70% height and
  // scrolls internally".
  maxWidth: 420,
  maxHeightFraction: 0.7,
  present: PAUSE_MOTION.present,
  dismiss: PAUSE_MOTION.dismiss,
};

/** §3 #5's switch: a bigger track, a flat on-tint and a green knob. §10 gives it 160 ms. */
export const TOGGLE_APPEARANCE: ToggleAppearance = {
  trackWidth: 44,
  trackHeight: 26,
  onTrack: withAlpha(green.flat, 0.45),
  knobColour: green.flat,
  motion: { durationMs: 160, easing: "cubic-bezier(.2,.8,.2,1)" },
};

/** §3 #5–#6's rows: shorter, tighter-cornered, lighter label, smaller caret. */
export const ROW_APPEARANCE: RowAppearance = {
  minHeight: 48,
  radius: 16,
  titleStyle: { weight: 600, size: 14 },
  titleColour: text.secondary,
  caretSize: 16,
  toggleAppearance: TOGGLE_APPEARANCE,
};

/** §3 #8: `Settings` is a ghost button at radius 16 with a `700 15px` label. */
// §3 #8's `700 15px` is `type.title` exactly.
const SETTINGS_BUTTON = { radius: 16, minHeight: 44, labelStyle: type.title };

/** §3 #9: `Leave match` keeps the destructive shape but states its own radius, fill, border and label. */
const LEAVE_BUTTON = {
  radius: 16,
  minHeight: 44,
  labelStyle: type.title,
  labelColour: danger.text,
  fill: withAlpha(danger.strong, 0.14),
  borderColour: withAlpha(danger.strong, 0.6),
};

export interface PauseSheetProps {
  visible: boolean;
  /** Board name, for the Rules row's meta: `<board name> · read-only` (§3 #6). */
  boardName: string;
  /** Pass-and-play and solo take the local leave copy (§6). */
  local: boolean;
  /**
   * The board's turn-timer setting: null when it sets none (§4's alternate line), undefined while the
   * first snapshot has not arrived, so nothing is claimed about a board not yet known.
   */
  turnTimerSeconds: number | null | undefined;
  /**
   * Seconds left on the turn clock, or null while E6 has none to give. The sheet never counts: E6
   * owns the countdown and whether it runs at all.
   */
  secondsLeft?: number | null;
  /** True when the clock is genuinely held — pass-and-play and solo (§4). Online is never held. */
  held?: boolean;
  /** The actor's name when it is not your turn (§5), else null. */
  actorName?: string | null;
  onDismiss: () => void;
  onOpenRules: () => void;
  onOpenSettings: () => void;
  onLeaveMatch: () => void;
  /** §5 "spectating": only Rules, Settings and Leave — no timer line, no `Resume match`. */
  spectating?: boolean;
  /** Drives the leave dialog; the HUD holds it so the sheet stays a presentation component. */
  leaveDialogOpen: boolean;
  onLeavePress: () => void;
  onLeaveDismiss: () => void;
}

export function PauseSheet({
  visible,
  boardName,
  local,
  turnTimerSeconds,
  secondsLeft = null,
  held = false,
  actorName = null,
  onDismiss,
  onOpenRules,
  onOpenSettings,
  onLeaveMatch,
  spectating = false,
  leaveDialogOpen,
  onLeavePress,
  onLeaveDismiss,
}: PauseSheetProps) {
  const sfx = useSettingsStore((state) => state.sfx);
  const haptics = useSettingsStore((state) => state.haptics);
  const setSfx = useSettingsStore((state) => state.setSfx);
  const setHaptics = useSettingsStore((state) => state.setHaptics);

  // §9: "focus starts on `Paused`". The sheet enters over 240 ms, so focus is moved once it has
  // arrived — moving it mid-animation lands the reader on a view that is still off-screen.
  const titleRef = useRef<RNText>(null);
  useEffect(() => {
    if (!visible) {
      return;
    }
    const timer = setTimeout(() => focusOn(titleRef), SHEET_APPEARANCE.present?.durationMs ?? 0);
    return () => clearTimeout(timer);
  }, [visible]);

  const status = statusLine({ turnTimerSeconds, secondsLeft, held, actorName });

  return (
    <>
      <Sheet
        visible={visible}
        onDismiss={onDismiss}
        accessibilityLabel={PAUSE_TITLE}
        appearance={SHEET_APPEARANCE}
        testID="pause-sheet"
      >
        {/* §8: the status and the rows scroll inside the capped sheet; "the three action buttons stay
            pinned", so they sit outside the scroller. At 130% font scale the same split is what lets
            the sheet scroll "rather than compressing the buttons". */}
        {/* §8: the status and the rows scroll inside the capped panel while "the three action buttons
            stay pinned" below them. The region drops `flex: 1` for `flexShrink: 1`: inside a panel
            that sizes to its content there is nothing to grow into, so a flex-basis-0 scroller would
            measure zero — it has to take its content's height and give way only when the panel hits
            its cap. */}
        <ScrollRegion style={styles.scroller} contentStyle={styles.scrollBody}>
          <RNText ref={titleRef} accessible accessibilityRole="header" style={styles.title}>
            {PAUSE_TITLE}
          </RNText>
          {/* §9: announced at the three counts the design calls out, not on every tick. */}
          {spectating || status === null ? null : (
            <RNText
              testID="pause-status"
              accessibilityLiveRegion={liveRegionFor(turnTimerSeconds === null ? null : secondsLeft)}
              style={[styles.status, { color: status.colour }]}
            >
              {status.text}
            </RNText>
          )}

          {/* §5 spectating: "the sheet offers only `Rules`, `Settings` and `Leave`". */}
          {spectating ? null : (
            <>
              <Row
                testID="pause-sound"
                title={SOUND_ROW.label}
                meta={SOUND_ROW.meta}
                accessory={{ kind: "toggle", value: sfx, onValueChange: setSfx }}
                appearance={ROW_APPEARANCE}
              />
              <Row
                testID="pause-haptics"
                title={HAPTICS_ROW.label}
                meta={HAPTICS_ROW.meta}
                accessory={{ kind: "toggle", value: haptics, onValueChange: setHaptics }}
                appearance={ROW_APPEARANCE}
              />
            </>
          )}
          <Row
            testID="pause-rules"
            title={RULES_ROW}
            meta={`${boardName} · read-only`}
            accessory={{ kind: "caret" }}
            onPress={onOpenRules}
            appearance={ROW_APPEARANCE}
          />
        </ScrollRegion>

        <View testID="pause-actions" style={styles.actions}>
          {spectating ? null : (
            <Button testID="pause-resume" variant="primary" label={RESUME_LABEL} onPress={onDismiss} />
          )}
          <Button testID="pause-settings" variant="ghost" label={SETTINGS_LABEL} onPress={onOpenSettings} {...SETTINGS_BUTTON} />
          <Button testID="pause-leave" variant="destructive" label={LEAVE_LABEL} onPress={onLeavePress} {...LEAVE_BUTTON} />
        </View>
      </Sheet>

      {/* 3j §5: `Stay` (ghost) · `Leave` (danger), the destructive action on the right. */}
      <Dialog
        visible={leaveDialogOpen}
        title={LEAVE_DIALOG_TITLE}
        body={local ? LEAVE_DIALOG_LOCAL : LEAVE_DIALOG_ONLINE}
        cancel={{ label: "Stay", onPress: onLeaveDismiss }}
        confirm={{ label: "Leave", onPress: onLeaveMatch }}
        destructive
        onRequestClose={onLeaveDismiss}
        testID="leave-match-dialog"
      />
    </>
  );
}

interface StatusInput {
  turnTimerSeconds: number | null | undefined;
  secondsLeft: number | null;
  held: boolean;
  actorName: string | null;
}

/**
 * §3 #4, §4 and §5's four lines, in the order the states resolve.
 *
 * `Turn timer held` is §3 #4's drawn copy and is used where it is true — pass-and-play and solo, where
 * §4 says the engine really is held. Online it is not: §4 states "the match does not pause" and the
 * status line "counts the real remaining turn time", so the running copy §5 gives for the last ten
 * seconds is used for the whole of an online turn, and only its colour changes at ten. Rendering
 * "held" to an online player would state the opposite of §4 — recorded in docs/design-concerns.md.
 */
export function statusLine({ turnTimerSeconds, secondsLeft, held, actorName }: StatusInput):
  | { text: string; colour: string }
  | null {
  if (turnTimerSeconds === undefined) {
    // No snapshot yet: the board's rules are unknown, so nothing is said about them.
    return null;
  }
  if (turnTimerSeconds === null) {
    return { text: NO_TURN_TIMER, colour: text.muted };
  }
  if (secondsLeft === null) {
    // The board sets a timer but nothing has said how much is left. Every line §3, §4 and §5 draw
    // carries `· <n>s left`; one without it is a sentence the design does not have, so the line is
    // withheld until E6 supplies a count rather than invented (Rule 2).
    return null;
  }
  const left = ` · ${secondsLeft}s left`;
  if (actorName !== null) {
    return { text: `${actorName}'s turn${left}`, colour: gold.flat };
  }
  if (held) {
    return { text: `Turn timer held${left}`, colour: gold.flat };
  }
  return { text: `Turn timer running${left}`, colour: secondsLeft <= RUNNING_OUT_SECONDS ? danger.text : gold.flat };
}

const styles = StyleSheet.create({
  // flexBasis auto, so the scroller is as tall as its content until the panel's cap squeezes it.
  scroller: { flex: 0, flexGrow: 0, flexShrink: 1, flexBasis: "auto", minHeight: 0 },
  // §2's 11 dp gap, inside the scroller and again between the pinned buttons.
  scrollBody: { gap: stackGap.default },
  actions: { gap: stackGap.default },
  title: { ...textStyle({ weight: 800, size: 19 }), color: text.primary },
  // §3 #4: `600 12px`, which is `type.bodySm` exactly.
  status: textStyle(type.bodySm),
});
