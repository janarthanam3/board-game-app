import { accent, danger, gold, green, surface, text } from "@royal-navy/shared";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { GradientView } from "../GradientView";
import { Icon } from "../Icon";
import { styles, variantStyles } from "./styles";

export type ButtonVariant = "primary" | "secondary" | "confirm" | "ghost" | "destructive" | "text";

export interface ButtonProps {
  variant: ButtonVariant;
  label: string;
  /** Phosphor icon name, 19 dp, 7 dp before the label. */
  icon?: string;
  onPress: () => void;
  disabled?: boolean;
  /** Label replaced by a 19 dp spinner; width is held. */
  loading?: boolean;
  /** Full width. Default true. */
  block?: boolean;
  /** "dialog" = the 46 dp / radius 15 dialog button size, whatever the variant. */
  size?: "default" | "dialog";
  testID?: string;
}

// Gradient-filled variants swap to the deeper stop while pressed ("gradient stops swap to gold.deep").
const pressedGradient = {
  primary: { angle: 180, stops: [{ color: gold.deep, position: 0 }, { color: gold.deep, position: 100 }] },
  confirm: { angle: 180, stops: [{ color: green.gradient.stops[1].color, position: 0 }, { color: green.gradient.stops[1].color, position: 100 }] },
} as const;

/**
 * The six button variants from docs/03-design-system.md "Actions". Never two primaries in one
 * row: a row of two is ghost + primary, ghost first.
 */
export function Button({
  variant,
  label,
  icon,
  onPress,
  disabled = false,
  loading = false,
  block = true,
  size = "default",
  testID,
}: ButtonProps) {
  const v = variantStyles[variant];
  const inert = disabled || loading;

  return (
    <Pressable
      testID={testID ?? `button-${variant}`}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inert, busy: loading }}
      onPress={onPress}
      disabled={inert}
      style={({ pressed }) => [
        styles.base,
        v.frame,
        size === "dialog" && styles.dialogSize,
        block ? styles.block : styles.inline,
        pressed && !inert && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {({ pressed }) => (
        <>
          {fillFor(variant, pressed && !inert)}
          <View style={styles.content}>
            {loading ? (
              <ActivityIndicator testID="button-spinner" size={19} color={v.labelColor} />
            ) : (
              <>
                {icon ? <Icon name={icon} size={19} color={v.labelColor} /> : null}
                <Text style={[v.label, { color: v.labelColor }]} numberOfLines={1}>
                  {label}
                </Text>
              </>
            )}
          </View>
        </>
      )}
    </Pressable>
  );
}

function fillFor(variant: ButtonVariant, pressed: boolean) {
  switch (variant) {
    case "primary":
      return <GradientView gradient={pressed ? pressedGradient.primary : gold.gradient} style={styles.fill} testID="button-fill" />;
    case "confirm":
      return <GradientView gradient={pressed ? pressedGradient.confirm : green.gradient} style={styles.fill} testID="button-fill" />;
    case "secondary":
      return <GradientView gradient={surface.card} style={styles.fill} testID="button-fill" />;
    case "destructive":
      return <View style={[styles.fill, { backgroundColor: danger.fillSoft }]} testID="button-fill" />;
    case "ghost":
    case "text":
      return null;
  }
}

// Exported for tests: the colour each variant's label must use.
export const buttonLabelColour: Record<ButtonVariant, string> = {
  primary: text.onGold,
  secondary: text.primary,
  confirm: variantStyles.confirm.labelColor,
  ghost: text.secondary,
  destructive: danger.soft,
  text: accent.blue,
};
