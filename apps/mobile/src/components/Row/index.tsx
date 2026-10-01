import { green, surface, text, type TypeStyle } from "@royal-navy/shared";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { GradientView } from "../GradientView";
import { Icon, type IconSize } from "../Icon";
import { IconButton } from "../IconButton";
import { Toggle, type ToggleAppearance } from "../Toggle";
import { textStyle } from "../typography";
import { styles } from "./styles";

export type RowAccessory =
  | { kind: "caret" }
  | { kind: "value"; value: string }
  | { kind: "toggle"; value: boolean; onValueChange: (value: boolean) => void }
  | { kind: "radio"; selected: boolean }
  | { kind: "check" }
  | { kind: "menu"; onPress: () => void }
  | { kind: "none" };

/**
 * Values a screen spec states for its own rows, where they differ from `docs/03`'s component — `3i`
 * §3 #5–#6 gives a shorter row, a smaller radius and a lighter label than `control.listRow` and
 * `type.title`. Recorded in `docs/design-concerns.md`; the component's defaults are unchanged.
 */
export interface RowAppearance {
  /** `3i`: 48, where `control.listRow.minHeight` is 56. */
  minHeight?: number;
  /** `3i`: 16, where `control.listRow.radius` is 17. */
  radius?: number;
  /** `3i`: `600 14px`, where `type.title` is `700 15px`. */
  titleStyle?: TypeStyle;
  /** `3i`: `text.secondary`, where the component uses `text.primary`. */
  titleColour?: string;
  /** `3i` §3 #6: `ph-caret-right` at 16 dp, where the component draws 19. */
  caretSize?: IconSize;
  /** Passed through to a `toggle` accessory — `3i` §3 #5's switch is not the token switch. */
  toggleAppearance?: ToggleAppearance;
}

export interface RowProps {
  title: string;
  /** 1–2 lines in `type.body.sm` `text.muted`. */
  meta?: string;
  /** 39–64 dp leading art or icon tile. */
  leading?: ReactNode;
  accessory?: RowAccessory;
  onPress?: () => void;
  /** 1 dp `gold.flat` ring. */
  selected?: boolean;
  /** Opacity .45, no press. */
  disabled?: boolean;
  /** Padlock before the accessory; accessory disabled. */
  locked?: boolean;
  /** 1 dp `danger.border`; meta in `danger`. */
  error?: boolean;
  /** Per-instance overrides for a screen whose spec states its own values. */
  appearance?: RowAppearance;
  testID?: string;
}

/** Min-height 56 dp list row on the card surface, radius 17, padding 11–12, 11 dp gap. */
export function Row({
  title,
  meta,
  leading,
  accessory = { kind: "none" },
  onPress,
  selected = false,
  disabled = false,
  locked = false,
  error = false,
  appearance,
  testID,
}: RowProps) {
  const interactive = onPress !== undefined && !disabled;
  // A screen-stated size applies to the frame and to the content, which carries the same minimum.
  const sizing =
    appearance?.minHeight === undefined && appearance?.radius === undefined
      ? null
      : {
          ...(appearance.minHeight === undefined ? {} : { minHeight: appearance.minHeight }),
          ...(appearance.radius === undefined ? {} : { borderRadius: appearance.radius }),
        };

  return (
    <Pressable
      testID={testID ?? "row"}
      accessibilityRole={interactive ? "button" : undefined}
      accessibilityState={{ disabled, selected }}
      onPress={onPress}
      disabled={!interactive}
      style={({ pressed }) => [
        styles.frame,
        selected && styles.selected,
        error && styles.error,
        disabled && styles.disabled,
        pressed && interactive && styles.pressedFrame,
        sizing,
      ]}
    >
      {({ pressed }) => (
        <>
          <GradientView gradient={surface.card} style={StyleSheet.absoluteFill} />
          {pressed && interactive ? <View style={styles.pressOverlay} pointerEvents="none" testID="row-press-overlay" /> : null}
          <View
            style={[
              styles.content,
              appearance?.minHeight === undefined ? null : { minHeight: appearance.minHeight },
            ]}
          >
            {leading ? <View style={styles.leading}>{leading}</View> : null}
            <View style={styles.middle}>
              <Text
                style={[
                  styles.title,
                  appearance?.titleStyle === undefined ? null : textStyle(appearance.titleStyle),
                  appearance?.titleColour === undefined ? null : { color: appearance.titleColour },
                ]}
                numberOfLines={1}
              >
                {title}
              </Text>
              {meta ? (
                <Text style={[styles.meta, error && styles.metaError]} numberOfLines={2}>
                  {meta}
                </Text>
              ) : null}
            </View>
            {locked ? <Icon name="ph-lock" size={15} color={text.muted} testID="row-lock" /> : null}
            <Accessory
              accessory={accessory}
              locked={locked}
              disabled={disabled}
              title={title}
              {...(meta === undefined ? {} : { meta })}
              {...(appearance === undefined ? {} : { appearance })}
            />
          </View>
        </>
      )}
    </Pressable>
  );
}

interface AccessoryProps {
  accessory: RowAccessory;
  locked: boolean;
  disabled: boolean;
  title: string;
  meta?: string;
  appearance?: RowAppearance;
}

function Accessory({ accessory, locked, disabled, title, meta, appearance }: AccessoryProps) {
  switch (accessory.kind) {
    case "caret":
      return <Icon name="ph-caret-right" size={appearance?.caretSize ?? 19} color={text.muted} />;
    case "value":
      return <Text style={styles.value}>{accessory.value}</Text>;
    case "toggle":
      return (
        <Toggle
          value={accessory.value}
          onValueChange={accessory.onValueChange}
          label={title}
          // The row's hint belongs to the switch, not only to the text beside it (3i §9).
          {...(meta === undefined ? {} : { accessibilityHint: meta })}
          disabled={disabled || locked}
          {...(appearance?.toggleAppearance === undefined ? {} : { appearance: appearance.toggleAppearance })}
        />
      );
    case "radio":
      return (
        <View testID="row-radio" style={[styles.radio, accessory.selected && styles.radioSelected]}>
          {accessory.selected ? <View style={styles.radioDot} testID="row-radio-dot" /> : null}
        </View>
      );
    case "check":
      return <Icon name="ph-check" size={19} color={green.flat} />;
    case "menu":
      return <IconButton icon="ph-dots-three" label={`${title} menu`} onPress={accessory.onPress} disabled={disabled || locked} />;
    case "none":
      return null;
  }
}

