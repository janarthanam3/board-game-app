import { control, gold, surface, text, type } from "@royal-navy/shared";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { GradientView } from "../GradientView";
import { textStyle } from "../typography";

export interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** `type.chip` is 10.5–11.5 dp in the design; screens pass the size their spec states. */
  size?: number;
  testID?: string;
}

// Midpoint of the documented 10.5–11.5 range, for callers whose spec does not state a size.
const DEFAULT_CHIP_SIZE = 11;

/** Filter chip: 7×12 padding, radius 14. Unselected inset + divider; selected gold gradient. */
export function Chip({ label, selected, onPress, size = DEFAULT_CHIP_SIZE, testID }: ChipProps) {
  return (
    <Pressable
      testID={testID ?? `chip-${label}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={styles.hitSlop}
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.selected : styles.unselected,
        pressed && styles.pressed,
      ]}
    >
      {selected ? <GradientView gradient={gold.gradient} style={StyleSheet.absoluteFill} testID="chip-fill" /> : null}
      <Text style={[textStyle(type.chip, size), { color: selected ? text.onGold : text.secondary }]}>{label}</Text>
    </Pressable>
  );
}

export interface ChipRowProps {
  options: readonly { key: string; label: string }[];
  selectedKey: string;
  onSelect: (key: string) => void;
  size?: number;
}

/** A horizontally scrolling row of chips with a 7 dp gap — the filter pattern (All / Property / …). */
export function ChipRow({ options, selectedKey, onSelect, size }: ChipRowProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} testID="chip-row">
      <View style={styles.row}>
        {options.map((option) => (
          <Chip
            key={option.key}
            label={option.label}
            selected={option.key === selectedKey}
            onPress={() => onSelect(option.key)}
            {...(size !== undefined ? { size } : {})}
          />
        ))}
      </View>
    </ScrollView>
  );
}

// Chips are shorter than 44 dp; the hit slop tops the tappable height up to 44.
const chipHeight = control.chip.paddingVertical * 2 + Math.round(DEFAULT_CHIP_SIZE * 1.25);
const verticalSlop = Math.max(0, (44 - chipHeight) / 2);

const styles = StyleSheet.create({
  chip: {
    paddingVertical: control.chip.paddingVertical,
    paddingHorizontal: control.chip.paddingHorizontal,
    borderRadius: control.chip.radius,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  unselected: {
    backgroundColor: surface.inset,
    borderWidth: surface.divider.width,
    borderColor: surface.divider.color,
  },
  selected: { borderWidth: 0 },
  pressed: { transform: [{ scale: 0.98 }] },
  row: { flexDirection: "row", gap: 7 },
  hitSlop: { top: verticalSlop, bottom: verticalSlop, left: 0, right: 0 },
});
