import { control, green, motion, type Motion, radius, surface, text } from "@royal-navy/shared";
import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";

import { GradientView } from "../GradientView";
import { easingFor, effectiveDuration, useReducedMotion } from "../motion";

/**
 * Values a screen spec states for its own switch, where they differ from `docs/03`'s component. `3i`
 * §3 #5 draws a larger track, a flat on-track tint instead of the green gradient, and a green knob
 * instead of a white one; §10 gives it its own duration. Recorded in `docs/design-concerns.md`.
 */
export interface ToggleAppearance {
  /** `3i`: 44, where `control.toggle.trackWidth` is 40. */
  trackWidth?: number;
  /** `3i`: 26, where `control.toggle.trackHeight` is 24. */
  trackHeight?: number;
  /** Knob diameter; defaults to `control.toggle.knob`. */
  knob?: number;
  /** `3i`: `rgba(122,219,37,.45)` — a flat tint, not the component's green gradient. */
  onTrack?: string;
  /** `3i`: `#7ADB25`, where the component's knob is `text.primary`. */
  knobColour?: string;
  /** `3i` §10: 160 ms `cubic-bezier(.2,.8,.2,1)`, where the component uses `motion.fast`. */
  motion?: Motion;
}

export interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  /** Accessibility label; the visible label lives on the Row that hosts the toggle. */
  label: string;
  /** The row's hint, attached to the switch itself — `3i` §9: "switches with their hints attached". */
  accessibilityHint?: string;
  disabled?: boolean;
  /** Per-instance overrides for a screen whose spec states its own values. */
  appearance?: ToggleAppearance;
  testID?: string;
}

const TRACK_WIDTH = control.toggle.trackWidth;
const TRACK_HEIGHT = control.toggle.trackHeight;
const KNOB = control.toggle.knob;
const KNOB_INSET = (TRACK_HEIGHT - KNOB) / 2;

/** 40×24 track, radius 999, 20 dp knob. Off: `surface.inset.strong`. On: green gradient. 140 ms. */
export function Toggle({
  value,
  onValueChange,
  label,
  accessibilityHint,
  disabled = false,
  appearance,
  testID,
}: ToggleProps) {
  const reducedMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(value ? 1 : 0)).current;
  const swing = appearance?.motion ?? motion.fast;

  // A screen-stated track changes the knob's travel, so the geometry is derived rather than fixed.
  const trackWidth = appearance?.trackWidth ?? TRACK_WIDTH;
  const trackHeight = appearance?.trackHeight ?? TRACK_HEIGHT;
  const knob = appearance?.knob ?? KNOB;
  const knobInset = (trackHeight - knob) / 2;
  const knobTravel = trackWidth - knob - knobInset * 2;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: value ? 1 : 0,
      duration: effectiveDuration(swing.durationMs, reducedMotion),
      easing: easingFor(swing.easing),
      useNativeDriver: true,
    }).start();
  }, [value, reducedMotion, progress, swing]);

  return (
    <Pressable
      testID={testID ?? "toggle"}
      accessibilityRole="switch"
      accessibilityLabel={label}
      {...(accessibilityHint === undefined ? {} : { accessibilityHint })}
      accessibilityState={{ checked: value, disabled }}
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      // Derived from the size actually rendered, so a screen-stated track keeps the 44 dp minimum.
      hitSlop={{
        top: Math.max(0, (control.minTapTarget - trackHeight) / 2),
        bottom: Math.max(0, (control.minTapTarget - trackHeight) / 2),
        left: Math.max(0, (control.minTapTarget - trackWidth) / 2),
        right: Math.max(0, (control.minTapTarget - trackWidth) / 2),
      }}
      style={[styles.track, { width: trackWidth, height: trackHeight }, disabled && styles.disabled]}
    >
      {value ? (
        appearance?.onTrack === undefined ? (
          <GradientView gradient={green.gradient} style={StyleSheet.absoluteFill} testID="toggle-on-fill" />
        ) : (
          // A flat tint where the screen states one (3i §3 #5), in place of the gradient.
          <View style={[StyleSheet.absoluteFill, { backgroundColor: appearance.onTrack }]} testID="toggle-on-fill" />
        )
      ) : null}
      <Animated.View
        testID="toggle-knob"
        style={[
          styles.knob,
          { width: knob, height: knob, marginLeft: knobInset },
          appearance?.knobColour === undefined ? null : { backgroundColor: appearance.knobColour },
          { transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, knobTravel] }) }] },
        ]}
      />
    </Pressable>
  );
}


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
});
