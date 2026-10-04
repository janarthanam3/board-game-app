import { accent, control, danger, gold, green, motion, surface, text, type TypeStyle } from "@royal-navy/shared";
import { useRef, useState } from "react";
import { ActivityIndicator, Animated, Pressable, Text, View } from "react-native";

import { GradientView } from "../GradientView";
import { Icon } from "../Icon";
import { easingFor, effectiveDuration, useReducedMotion } from "../motion";
import { textStyle } from "../typography";
import { styles, variantStyles } from "./styles";

export type ButtonVariant = "primary" | "secondary" | "confirm" | "ghost" | "destructive" | "text" | "primaryBlue";

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
  /**
   * "dialog" = the 46 dp / radius 15 dialog button size, whatever the variant.
   * "small" = Button.small: min-height 36 with hit slop to the 44 dp minimum — the chip button the
   * screens use for Save, "+ New rule", Fit and Reorder (1y §3 #1, 1z §3 #1, 2a §3.1 #1 and #7).
   */
  size?: "default" | "dialog" | "small";
  /**
   * A minimum height and width this one instance states for itself, where a screen spec gives the
   * button its own size: `1c` §3 #13 draws the HUD's primary action at "min 72 wide, height 44".
   * Never below `control.minTapTarget`.
   */
  minHeight?: number;
  minWidth?: number;
  /**
   * The rest of what a screen spec can state for one instance. `3i` §3 #8–#9 gives its two buttons
   * radius 16 and a `700 15px` label where the `ghost` and `destructive` variants are radius 15 and
   * `800 14px`, and its danger fill and border come off `danger.strong` rather than `danger.fillSoft`
   * and `danger.border`. Recorded in `docs/design-concerns.md`; the variants are unchanged.
   */
  radius?: number;
  /**
   * The padding this one instance states, where a screen gives its button one: `3a` §3 #15–#16
   * draw both splash buttons at "min-height 44, radius 16, padding 13". It matters beyond looks — a
   * padded button grows with the label at 130% font scale, where a bare minHeight pins it.
   */
  padding?: number;
  labelStyle?: TypeStyle;
  labelColour?: string;
  /** Replaces the variant's fill. */
  fill?: string;
  borderColour?: string;
  /** Spoken after the label — §9 of several screens: "when disabled, its reason". */
  accessibilityHint?: string;
  testID?: string;
}

// Gradient-filled variants swap to the deeper stop while pressed ("gradient stops swap to gold.deep").
const pressedGradient = {
  primary: { angle: 180, stops: [{ color: gold.deep, position: 0 }, { color: gold.deep, position: 100 }] },
  confirm: { angle: 180, stops: [{ color: green.gradient.stops[1].color, position: 0 }, { color: green.gradient.stops[1].color, position: 100 }] },
  primaryBlue: { angle: 180, stops: [{ color: accent.blueDeep, position: 0 }, { color: accent.blueDeep, position: 100 }] },
} as const;

const PRESSED_SCALE = 0.98;

// Button.small is 36 dp tall; the slop brings the touch area to the 44 dp minimum (docs/02
// control.minTapTarget; CLAUDE.md "every tap target ≥ 44dp").
const SMALL_HIT_SLOP = (control.minTapTarget - 36) / 2;

/**
 * The six button variants from docs/03-design-system.md "Actions". Never two primaries in one
 * row: a row of two is ghost + primary, ghost first. Heights are minimums so the label can grow
 * at 130% font scale (docs/02 "Heights are never fixed on a text-bearing box").
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
  minHeight,
  minWidth,
  radius: statedRadius,
  padding,
  labelStyle,
  labelColour,
  fill,
  borderColour,
  accessibilityHint,
  testID,
}: ButtonProps) {
  if (minHeight !== undefined && minHeight < control.minTapTarget) {
    throw new Error(`Button: minHeight ${minHeight} is below the ${control.minTapTarget} dp tap minimum`);
  }
  const v = variantStyles[variant];
  const inert = disabled || loading;
  const reducedMotion = useReducedMotion();
  const [pressed, setPressed] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;

  // Press state: scale .98 over 90 ms linear (03 "pressed", 02 motion.instant).
  function animatePress(toPressed: boolean) {
    setPressed(toPressed);
    Animated.timing(scale, {
      toValue: toPressed ? PRESSED_SCALE : 1,
      duration: effectiveDuration(motion.instant.durationMs, reducedMotion),
      easing: easingFor(motion.instant.easing),
      useNativeDriver: true,
    }).start();
  }

  return (
    <Animated.View testID={`${testID ?? `button-${variant}`}-frame`} style={[block ? styles.block : styles.inline, { transform: [{ scale }] }]}>
      <Pressable
        testID={testID ?? `button-${variant}`}
        accessibilityRole="button"
        accessibilityLabel={label}
        {...(accessibilityHint === undefined ? {} : { accessibilityHint })}
        accessibilityState={{ disabled: inert, busy: loading }}
        onPress={onPress}
        hitSlop={size === "small" ? SMALL_HIT_SLOP : undefined}
        onPressIn={() => !inert && animatePress(true)}
        onPressOut={() => animatePress(false)}
        disabled={inert}
        style={[
          styles.base,
          v.frame,
          size === "dialog" && styles.dialogSize,
          // inlinePadding comes before smallSize so the small chip's own 12 dp padding wins.
          !block && styles.inlinePadding,
          size === "small" && styles.smallSize,
          disabled && styles.disabled,
          // A screen-stated value wins over the variant's, which is why these come last.
          minHeight === undefined ? null : { minHeight },
          minWidth === undefined ? null : { minWidth },
          padding === undefined ? null : { paddingVertical: padding, paddingHorizontal: padding },
          statedRadius === undefined ? null : { borderRadius: statedRadius },
          borderColour === undefined ? null : { borderColor: borderColour },
        ]}
      >
        {/* Button.small paints its own blue chip fill, so the variant's fill is suppressed; a
            screen-stated fill replaces the variant's. */}
        {size === "small" ? null : fill === undefined ? (
          fillFor(variant, pressed && !inert)
        ) : (
          <View style={[styles.fill, { backgroundColor: fill }]} testID="button-fill" />
        )}
        {/* The label stays in the tree while loading (invisible) so the button keeps its width. */}
        <View testID="button-content" style={[styles.content, loading && styles.contentHidden]}>
          {icon ? <Icon name={icon} size={19} color={size === "small" ? accent.blue : v.labelColor} /> : null}
          <Text
            style={
              size === "small"
                ? [styles.smallLabel, { color: accent.blue }]
                : [
                    v.label,
                    { color: v.labelColor },
                    labelStyle === undefined ? null : textStyle(labelStyle),
                    labelColour === undefined ? null : { color: labelColour },
                  ]
            }
            numberOfLines={1}
          >
            {label}
          </Text>
        </View>
        {loading ? (
          <View style={styles.spinner}>
            <ActivityIndicator testID="button-spinner" size={19} color={v.labelColor} />
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
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
    case "primaryBlue":
      return <GradientView gradient={pressed ? pressedGradient.primaryBlue : accent.blueButton} style={styles.fill} testID="button-fill" />;
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
  primaryBlue: text.onBlue,
};
