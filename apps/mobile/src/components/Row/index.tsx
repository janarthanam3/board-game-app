import { green, surface, text } from "@royal-navy/shared";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { GradientView } from "../GradientView";
import { Icon } from "../Icon";
import { IconButton } from "../IconButton";
import { Toggle } from "../Toggle";
import { styles } from "./styles";

export type RowAccessory =
  | { kind: "caret" }
  | { kind: "value"; value: string }
  | { kind: "toggle"; value: boolean; onValueChange: (value: boolean) => void }
  | { kind: "radio"; selected: boolean }
  | { kind: "check" }
  | { kind: "menu"; onPress: () => void }
  | { kind: "none" };

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
  testID,
}: RowProps) {
  const interactive = onPress !== undefined && !disabled;

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
      ]}
    >
      {({ pressed }) => (
        <>
          <GradientView gradient={surface.card} style={StyleSheet.absoluteFill} />
          {pressed && interactive ? <View style={styles.pressOverlay} pointerEvents="none" testID="row-press-overlay" /> : null}
          <View style={styles.content}>
            {leading ? <View style={styles.leading}>{leading}</View> : null}
            <View style={styles.middle}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              {meta ? (
                <Text style={[styles.meta, error && styles.metaError]} numberOfLines={2}>
                  {meta}
                </Text>
              ) : null}
            </View>
            {locked ? <Icon name="ph-lock" size={15} color={text.muted} testID="row-lock" /> : null}
            <Accessory accessory={accessory} locked={locked} disabled={disabled} title={title} />
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
}

function Accessory({ accessory, locked, disabled, title }: AccessoryProps) {
  switch (accessory.kind) {
    case "caret":
      return <Icon name="ph-caret-right" size={19} color={text.muted} />;
    case "value":
      return <Text style={styles.value}>{accessory.value}</Text>;
    case "toggle":
      return (
        <Toggle
          value={accessory.value}
          onValueChange={accessory.onValueChange}
          label={title}
          disabled={disabled || locked}
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

