import { accent, danger, text } from "@royal-navy/shared";
import { forwardRef } from "react";
import { Pressable, type View } from "react-native";

import { Icon } from "../Icon";
import { styles } from "./styles";

export type IconButtonTone = "default" | "accent" | "danger";

export interface IconButtonProps {
  icon: string;
  /** Accessibility label; icon buttons have no visible text. */
  label: string;
  onPress: () => void;
  tone?: IconButtonTone;
  disabled?: boolean;
  testID?: string;
}

const iconColour: Record<IconButtonTone, string> = {
  default: text.secondary,
  accent: accent.blue,
  danger: danger.text,
};

/**
 * 39×39 dp, radius 14, `surface.inset` with a `divider` border; hit area padded to 44 dp.
 *
 * Takes a ref so a screen can move reader focus back to it — `3i` §9 returns focus to the HUD's Menu
 * button when the pause sheet dismisses.
 */
export const IconButton = forwardRef<View, IconButtonProps>(function IconButton(
  { icon, label, onPress, tone = "default", disabled = false, testID },
  ref,
) {
  return (
    <Pressable
      ref={ref}
      testID={testID ?? `icon-button-${icon}`}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      hitSlop={styles.hitSlop}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Icon name={icon} size={19} color={iconColour[tone]} />
    </Pressable>
  );
});
