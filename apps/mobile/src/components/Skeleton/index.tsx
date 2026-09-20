import { motion, radius, surface } from "@royal-navy/shared";
import { useEffect, useRef } from "react";
import { Animated, type DimensionValue, StyleSheet } from "react-native";

import { easingFor, useReducedMotion } from "../motion";

export interface SkeletonProps {
  width: DimensionValue;
  height: number;
  /** Default `radius.field` (12); pass `radius.card` for card-shaped placeholders. */
  borderRadius?: number;
  testID?: string;
}

/**
 * Loading placeholder: a strong-inset bar that pulses on `motion.pulse` (1200 ms loop). Screens
 * swap it for content over 200 ms ease-out. Static when reduce-motion is on.
 */
export function Skeleton({ width, height, borderRadius = radius.field, testID }: SkeletonProps) {
  const reducedMotion = useReducedMotion();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reducedMotion) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.55,
          duration: motion.pulse.durationMs / 2,
          easing: easingFor(motion.pulse.easing),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: motion.pulse.durationMs / 2,
          easing: easingFor(motion.pulse.easing),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reducedMotion, pulse]);

  return (
    <Animated.View
      testID={testID ?? "skeleton"}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.bar, { width, height, borderRadius, opacity: pulse }]}
    />
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: surface.insetStrong },
});
