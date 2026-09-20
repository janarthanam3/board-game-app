import { control, motion, surface } from "@royal-navy/shared";
import { useEffect, useRef, useState } from "react";
import { Animated, type DimensionValue, type LayoutChangeEvent, StyleSheet, View } from "react-native";

import { useReducedMotion } from "../motion";

export interface SkeletonProps {
  width: DimensionValue;
  height: number;
  /** Default 8 (3c, 3d, 3e skeleton bars); pass `radius.card` for card-shaped placeholders. */
  borderRadius?: number;
  testID?: string;
}

// The sweep band is 40% of the bar wide; its colour is undesigned — see OQ-14.
const BAND_FRACTION = 0.4;

/**
 * Loading placeholder: a `surface.skeleton` bar with a shimmer sweep — 1200 ms loop, linear
 * (3c §9). Screens swap it for content over 200 ms ease-out. Static when reduce-motion is on.
 */
export function Skeleton({ width, height, borderRadius = control.skeletonRadius, testID }: SkeletonProps) {
  const reducedMotion = useReducedMotion();
  const [barWidth, setBarWidth] = useState(0);
  const sweep = useRef(new Animated.Value(0)).current;
  // The running loop, so unmount (and any re-run of the effect) can stop it. Under Jest the
  // animation runs on JS timers; a loop left running after unmount would keep scheduling frames
  // into a torn-down test environment.
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (reducedMotion || barWidth === 0) {
      sweep.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(sweep, {
        toValue: 1,
        duration: motion.pulse.durationMs,
        easing: (t) => t, // linear, per 3c §9
        useNativeDriver: true,
      }),
    );
    loopRef.current = loop;
    loop.start();

    return () => {
      loopRef.current?.stop();
      loopRef.current = null;
      // Also settle the value itself so no frame stays pending on it.
      sweep.stopAnimation();
      sweep.setValue(0);
    };
  }, [reducedMotion, barWidth, sweep]);

  function onLayout(event: LayoutChangeEvent) {
    setBarWidth(event.nativeEvent.layout.width);
  }

  const bandWidth = barWidth * BAND_FRACTION;

  return (
    <View
      testID={testID ?? "skeleton"}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={onLayout}
      style={[styles.bar, { width, height, borderRadius }]}
    >
      {barWidth > 0 && !reducedMotion ? (
        <Animated.View
          testID="skeleton-sweep"
          style={[
            styles.band,
            {
              width: bandWidth,
              transform: [
                { translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [-bandWidth, barWidth] }) },
              ],
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: surface.skeleton, overflow: "hidden" },
  band: { ...StyleSheet.absoluteFillObject, right: undefined, backgroundColor: surface.imageSlotHighlight },
});
