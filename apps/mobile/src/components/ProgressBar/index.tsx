import { control, type Gradient, gold, green, motion, text, type } from "@royal-navy/shared";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import { GradientView } from "../GradientView";
import { textStyle } from "../typography";

export interface ProgressBarProps {
  /** 0–1. */
  progress: number;
  /**
   * Replaces the gold fill, where a screen draws its own: `3a` §3 #9 fills the splash bar with a
   * blue gradient running across (90deg), not the gold one. The complete-state green is unaffected.
   */
  fill?: Gradient;
  /**
   * Animates width changes linearly instead of snapping, for a bar that tracks real work: `3a` §9
   * gives the splash's fill "follows the request … linear". Default false, so every other bar keeps
   * setting its width directly.
   */
  animated?: boolean;
  /** Renders `type.body.sm` above with the right-aligned count. */
  label?: string;
  count?: string;
  testID?: string;
}

/** Height 6, radius 999, `rgba(8,26,64,.5)` track; gold fill, green once complete. */
export function ProgressBar({ progress, label, count, fill, animated = false, testID }: ProgressBarProps) {
  const clamped = Math.min(1, Math.max(0, progress));
  const complete = clamped >= 1;
  // A screen that states its own fill keeps it all the way to 100%: the green completion colour is
  // the default bar's, and `3a` §3 #9 never asks for it.
  const gradient = fill ?? (complete ? green.gradient : gold.gradient);
  const width = useAnimatedWidth(clamped, animated);

  return (
    <View testID={testID ?? "progress-bar"} accessible accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}>
      {label || count ? (
        <View style={styles.labelRow}>
          {label ? <Text style={styles.label}>{label}</Text> : null}
          {count ? <Text style={styles.count}>{count}</Text> : null}
        </View>
      ) : null}
      <View style={styles.track} testID="progress-track">
        {/* The width is what expresses progress, so it carries the fill testID; the gradient inside
            carries the colour. */}
        <Animated.View
          style={[styles.fillWrap, { width }]}
          testID={complete && !fill ? "progress-fill-complete" : "progress-fill"}
        >
          <GradientView gradient={gradient} style={styles.fill} testID="progress-fill-gradient" />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  label: { ...textStyle(type.bodySm), color: text.muted },
  count: { ...textStyle(type.bodySm), color: text.muted, textAlign: "right" },
  track: {
    height: control.progressBar.height,
    borderRadius: control.progressBar.radius,
    backgroundColor: control.progressBar.track,
    overflow: "hidden",
  },
  fillWrap: { height: "100%", borderRadius: control.progressBar.radius, overflow: "hidden" },
  fill: { height: "100%", width: "100%", borderRadius: control.progressBar.radius },
});

/**
 * The fill's width as a percentage string, animated linearly when the caller asks for it.
 *
 * Animated.Value cannot interpolate to a percentage directly, so it animates 0 → 100 and the
 * interpolation turns that into the string React Native wants.
 */
function useAnimatedWidth(fraction: number, animated: boolean) {
  const value = useRef(new Animated.Value(fraction * 100)).current;

  useEffect(() => {
    if (!animated) {
      value.setValue(fraction * 100);
      return;
    }
    const animation = Animated.timing(value, {
      toValue: fraction * 100,
      duration: FILL_MS,
      easing: Easing.linear, // §9: "linear".
      useNativeDriver: false, // width is a layout property.
    });
    animation.start();
    return () => animation.stop();
  }, [animated, fraction, value]);

  if (animated) {
    return value.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] });
  }
  const percent: `${number}%` = `${fraction * 100}%`;
  return percent;
}

// motion.instant is the census's only linear duration (90 ms, "linear"), and §9 gives this fill
// "linear" with no duration of its own — so the shortest documented linear step is what it uses.
// Short on purpose: a longer tween would make the width lag the work it is reporting.
const FILL_MS = motion.instant.durationMs;
