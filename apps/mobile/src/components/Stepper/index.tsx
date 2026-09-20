import { control, danger, radius, stackGap, surface, text, type } from "@royal-navy/shared";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "../Icon";
import { textStyle } from "../typography";

export interface StepperProps {
  value: number;
  min: number;
  max: number;
  step: number;
  /** Rendered after the value, e.g. "rows". */
  suffix?: string;
  onChange: (value: number) => void;
  /** Inline danger line under the row, e.g. "At least 12 tiles needed." */
  error?: string;
  /** Accessibility label for the value. */
  label: string;
  testID?: string;
}

/** Row: 36 dp minus, value (`type.value`, min-width 64, centred), 36 dp plus. Bounds disable. */
export function Stepper({ value, min, max, step, suffix, onChange, error, label, testID }: StepperProps) {
  const atMin = value <= min;
  const atMax = value >= max;

  return (
    <View testID={testID ?? "stepper"}>
      <View style={styles.row}>
        <StepButton icon="ph-minus" label={`Decrease ${label}`} disabled={atMin} onPress={() => onChange(Math.max(min, value - step))} />
        <Text
          testID="stepper-value"
          accessibilityLabel={`${label} ${value}${suffix ? ` ${suffix}` : ""}`}
          style={styles.value}
        >
          {suffix ? `${value} ${suffix}` : String(value)}
        </Text>
        <StepButton icon="ph-plus" label={`Increase ${label}`} disabled={atMax} onPress={() => onChange(Math.min(max, value + step))} />
      </View>
      {error ? (
        <Text testID="stepper-error" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

interface StepButtonProps {
  icon: string;
  label: string;
  disabled: boolean;
  onPress: () => void;
}

function StepButton({ icon, label, disabled, onPress }: StepButtonProps) {
  return (
    <Pressable
      testID={`stepper-${icon}`}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={styles.hitSlop}
      style={[styles.button, disabled && styles.disabled]}
    >
      <Icon name={icon} size={19} color={text.secondary} />
    </Pressable>
  );
}

// 36 dp buttons; 4 dp of slop each side makes the tap target 44.
const slop = (control.minTapTarget - control.stepperButton.width) / 2;

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: stackGap.inner },
  button: {
    width: control.stepperButton.width,
    height: control.stepperButton.height,
    // The doc gives only the 36×36 size; the buttons take the icon-button surface and radius.
    borderRadius: radius.control,
    backgroundColor: surface.inset,
    borderWidth: surface.divider.width,
    borderColor: surface.divider.color,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.45 },
  value: { ...textStyle(type.value), color: text.primary, minWidth: 64, textAlign: "center" },
  error: { ...textStyle(type.bodySm), color: danger.text, marginTop: 4 },
  hitSlop: { top: slop, bottom: slop, left: slop, right: slop },
});
