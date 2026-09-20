import { green, motion, radius, surface, text } from "@royal-navy/shared";
import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";

import { GradientView } from "../GradientView";
import { easingFor, effectiveDuration, useReducedMotion } from "../motion";

export interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  /** Accessibility label; the visible label lives on the Row that hosts the toggle. */
  label: string;
  disabled?: boolean;
  testID?: string;
}

const TRACK_WIDTH = 40;
const TRACK_HEIGHT = 24;
const KNOB = 20;
const KNOB_INSET = (TRACK_HEIGHT - KNOB) / 2;
const KNOB_TRAVEL = TRACK_WIDTH - KNOB - KNOB_INSET * 2;

/** 40×24 track, radius 999, 20 dp knob. Off: `surface.inset.strong`. On: green gradient. 140 ms. */
export function Toggle({ value, onValueChange, label, disabled = false, testID }: ToggleProps) {
  const reducedMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: value ? 1 : 0,
      duration: effectiveDuration(motion.fast.durationMs, reducedMotion),
      easing: easingFor(motion.fast.easing),
      useNativeDriver: true,
    }).start();
  }, [value, reducedMotion, progress]);

  return (
    <Pressable
      testID={testID ?? "toggle"}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      hitSlop={styles.hitSlop}
      style={[styles.track, disabled && styles.disabled]}
    >
      {value ? <GradientView gradient={green.gradient} style={StyleSheet.absoluteFill} testID="toggle-on-fill" /> : null}
      <Animated.View
        testID="toggle-knob"
        style={[
          styles.knob,
          { transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, KNOB_TRAVEL] }) }] },
        ]}
      />
    </Pressable>
  );
}

// 24 dp tall; hit slop brings the tappable area to 44 dp on every side.
const slopVertical = (44 - TRACK_HEIGHT) / 2;
const slopHorizontal = (44 - TRACK_WIDTH) / 2;

const styles = StyleSheet.create({
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: radius.pill,
    backgroundColor: surface.insetStrong,
    justifyContent: "center",
    overflow: "hidden",
  },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: radius.pill,
    backgroundColor: text.primary,
    marginLeft: KNOB_INSET,
  },
  disabled: { opacity: 0.45 },
  hitSlop: { top: slopVertical, bottom: slopVertical, left: slopHorizontal, right: slopHorizontal },
});
