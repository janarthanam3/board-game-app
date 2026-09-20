import { danger, radius, surface, text, type } from "@royal-navy/shared";
import { StyleSheet, Text, TextInput, type TextInputProps, View } from "react-native";

import { fontFamilyForWeight } from "../../ui/fonts";
import { textStyle } from "../typography";

export interface InputProps
  extends Pick<
    TextInputProps,
    | "value"
    | "onChangeText"
    | "placeholder"
    | "secureTextEntry"
    | "keyboardType"
    | "autoCapitalize"
    | "autoComplete"
    | "maxLength"
    | "editable"
    | "onSubmitEditing"
    | "returnKeyType"
  > {
  /** Label above the field in `text.secondary`, e.g. "Game name". */
  label?: string;
  /** Label size: 15 on the auth fields (1a §3 #10), 14 on the game name (1b §3 #2). */
  labelSize?: 14 | 15;
  /** Inline danger line under the field. */
  error?: string;
  /** 600 for auth fields (1a), 700 for the game name (1b). */
  weight?: 600 | 700;
  testID?: string;
}

// 1a §3 #10: 7 dp between label and field; 1a §4: 6 dp between field and error line.
const LABEL_GAP = 7;
const ERROR_GAP = 6;
const FIELD_TEXT_SIZE = 15;

/**
 * Min-height 50, radius 17, 1 dp `surface.inputBorder`, no fill, 15 dp white text (1a, 1b). Height
 * is a minimum so the field grows at 130% font scale (1a §7: "Inputs grow to 58dp").
 */
export function Input({ label, labelSize = 14, error, weight = 600, testID, editable = true, ...inputProps }: InputProps) {
  return (
    <View testID={testID ?? "input"}>
      {label ? (
        <Text style={[styles.label, textStyle({ weight: 600, size: labelSize }), { marginBottom: LABEL_GAP }]}>
          {label}
        </Text>
      ) : null}
      <TextInput
        {...inputProps}
        editable={editable}
        accessibilityLabel={label ?? inputProps.placeholder}
        placeholderTextColor={text.dim}
        style={[
          styles.field,
          { fontFamily: fontFamilyForWeight(weight) },
          error ? styles.fieldError : null,
          !editable && styles.disabled,
        ]}
        testID="input-field"
      />
      {error ? (
        <Text testID="input-error" style={[styles.error, { marginTop: ERROR_GAP }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: text.secondary },
  field: {
    minHeight: 50,
    borderRadius: radius.input,
    borderWidth: surface.inputBorder.width,
    borderColor: surface.inputBorder.color,
    paddingHorizontal: 14,
    paddingVertical: 0,
    ...textStyle({ weight: 600, size: FIELD_TEXT_SIZE }),
    color: text.primary,
    backgroundColor: "transparent",
  },
  fieldError: { borderColor: danger.strong },
  disabled: { opacity: 0.45 },
  error: { ...textStyle(type.bodySm), color: danger.text },
});
