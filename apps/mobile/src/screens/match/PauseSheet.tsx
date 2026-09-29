// The pause sheet (docs/screens/3i-pause-sheet.md), an overlay above the HUD — docs/04 "Overlays"
// lists it as "fired by: HUD menu button", and `1c` §6 adds Android back.
//
// What is here: the sheet, its title, the two toggle rows, the Rules row and the three buttons, in
// §2's fixed order. What is not, and why:
//   · the timer status line (§3 #4, §4, §5) belongs to **E6**, whose acceptance names "the
//     pause-sheet distinction between online and local"; the one line that needs no clock —
//     `No turn timer on this board.` — is rendered here. E6 is blocked by OQ-1.
//   · `Leave match` opens §6's dialog with its documented copy; the leave itself emits `match:leave`
//     (§7), which is socket work — E3/H1 — so the caller supplies the handler.

import { stackGap, text } from "@royal-navy/shared";
import { StyleSheet, Text as RNText, View } from "react-native";

import { Button } from "../../components/Button";
import { Dialog } from "../../components/Dialog";
import { Row } from "../../components/Row";
import { Sheet } from "../../components/Sheet";
import { textStyle } from "../../components/typography";
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

export interface PauseSheetProps {
  visible: boolean;
  /** Board name, for the Rules row's meta: `<board name> · read-only` (§3 #6). */
  boardName: string;
  /** Pass-and-play and solo take the local leave copy (§6). */
  local: boolean;
  /**
   * Null when the board sets no turn timer — §4's alternate status line. Undefined while the first
   * snapshot has not arrived: the board's rules are not known yet, so nothing is claimed about them.
   */
  turnTimerSeconds: number | null | undefined;
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

  return (
    <>
      <Sheet visible={visible} onDismiss={onDismiss} accessibilityLabel={PAUSE_TITLE} testID="pause-sheet">
        <View style={styles.body}>
          <RNText style={styles.title}>{PAUSE_TITLE}</RNText>
          {/* §4: a board with no turn timer replaces the status line. The running/held line is E6's. */}
          {!spectating && turnTimerSeconds === null ? (
            <RNText testID="pause-no-timer" style={styles.noTimer}>
              {NO_TURN_TIMER}
            </RNText>
          ) : null}

          {/* §5 spectating: "the sheet offers only `Rules`, `Settings` and `Leave`". */}
          {spectating ? null : (
            <>
              <Row
                testID="pause-sound"
                title={SOUND_ROW.label}
                meta={SOUND_ROW.meta}
                accessory={{ kind: "toggle", value: sfx, onValueChange: setSfx }}
              />
              <Row
                testID="pause-haptics"
                title={HAPTICS_ROW.label}
                meta={HAPTICS_ROW.meta}
                accessory={{ kind: "toggle", value: haptics, onValueChange: setHaptics }}
              />
            </>
          )}
          <Row
            testID="pause-rules"
            title={RULES_ROW}
            meta={`${boardName} · read-only`}
            accessory={{ kind: "caret" }}
            onPress={onOpenRules}
          />

          {spectating ? null : (
            <Button testID="pause-resume" variant="primary" label={RESUME_LABEL} onPress={onDismiss} />
          )}
          <Button testID="pause-settings" variant="ghost" label={SETTINGS_LABEL} onPress={onOpenSettings} />
          <Button testID="pause-leave" variant="destructive" label={LEAVE_LABEL} onPress={onLeavePress} />
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

const styles = StyleSheet.create({
  body: { gap: stackGap.default },
  title: { ...textStyle({ weight: 800, size: 19 }), color: text.primary },
  noTimer: { ...textStyle({ weight: 600, size: 12 }), color: text.muted },
});
