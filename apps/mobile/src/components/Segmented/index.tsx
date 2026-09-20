import { control, gold, motion, text, type } from "@royal-navy/shared";
import { useEffect, useRef, useState } from "react";
import { Animated, type LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";

import { GradientView } from "../GradientView";
import { easingFor, effectiveDuration, useReducedMotion } from "../motion";
import { textStyle } from "../typography";

export interface SegmentedOption<Key extends string> {
  key: Key;
  label: string;
}

export interface SegmentedProps<Key extends string> {
  /** 2–4 options. Five or more must be a ChipRow instead. */
  options: readonly SegmentedOption<Key>[];
  selectedKey: Key;
  onSelect: (key: Key) => void;
  /** Accessibility label for the whole control. */
  label: string;
  testID?: string;
}

/**
 * Row of equal-flex segments, height 40, radius 14, 1 dp border. The selected segment is a gold
 * gradient that slides between positions over 140 ms (`motion.fast`).
 */
export function Segmented<Key extends string>({ options, selectedKey, onSelect, label, testID }: SegmentedProps<Key>) {
  if (options.length < 2 || options.length > 4) {
    throw new Error("Segmented: 2–4 options only; use a ChipRow for more");
  }
  const reducedMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.key === selectedKey));
  const position = useRef(new Animated.Value(selectedIndex)).current;

  useEffect(() => {
    Animated.timing(position, {
      toValue: selectedIndex,
      duration: effectiveDuration(motion.fast.durationMs, reducedMotion),
      easing: easingFor(motion.fast.easing),
      useNativeDriver: true,
    }).start();
  }, [selectedIndex, reducedMotion, position]);

  const segmentWidth = width / options.length;

  function onLayout(event: LayoutChangeEvent) {
    // Subtract the border so the sliding fill sits inside it.
    setWidth(event.nativeEvent.layout.width - control.segmented.border.width * 2);
  }

  return (
    <View
      testID={testID ?? "segmented"}
      accessibilityRole="tablist"
      accessibilityLabel={label}
      style={styles.track}
      onLayout={onLayout}
    >
      {width > 0 ? (
        <Animated.View
          testID="segmented-thumb"
          pointerEvents="none"
          style={[
            styles.thumb,
            { width: segmentWidth, transform: [{ translateX: Animated.multiply(position, segmentWidth) }] },
          ]}
        >
          <GradientView gradient={gold.gradient} style={StyleSheet.absoluteFill} />
        </Animated.View>
      ) : null}
      {options.map((option) => {
        const selected = option.key === selectedKey;
        return (
          <Pressable
            key={option.key}
            testID={`segment-${option.key}`}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onSelect(option.key)}
            // The track is 40 dp tall by design; 2 dp of slop each side keeps the tap target at 44.
            hitSlop={styles.segmentSlop}
            style={styles.segment}
          >
            <Text style={[styles.label, { color: selected ? text.onGold : text.secondary }]} numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    // A minimum, not a fixed height: the label grows at 130% font scale (docs/02 "Responsive").
    minHeight: control.segmented.height,
    borderRadius: control.segmented.radius,
    borderWidth: control.segmented.border.width,
    borderColor: control.segmented.border.color,
    overflow: "hidden",
  },
  thumb: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: control.segmented.radius - control.segmented.border.width,
    overflow: "hidden",
  },
  segment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: control.segmented.paddingVertical,
  },
  segmentSlop: {
    top: (control.minTapTarget - control.segmented.height) / 2,
    bottom: (control.minTapTarget - control.segmented.height) / 2,
  },
  label: textStyle(type.bodySm),
});
