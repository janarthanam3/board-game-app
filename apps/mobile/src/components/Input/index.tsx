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
  /** Label above the field (`600 14` `text.secondary`), e.g. "Game name". */
  label?: string;
  /** Inline danger line under the field. */
  error?: string;
  /** 600 for auth fields (1a), 700 for the game name (1b). */
  weight?: 600 | 700;
  testID?: string;
}

/** Height 50, radius 17, 1 dp `surface.inputBorder`, no fill, 15 dp white text (1a, 1b). */
export function Input({ label, error, weight = 600, testID, editable = true, ...inputProps }: InputProps) {
  return (
    <View testID={testID ?? "input"} style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        {...inputProps}
        editable={editable}
        accessibilityLabel={label ?? inputProps.placeholder}
        placeholderTextColor={text.dim}
        style={[styles.field, { fontFamily: fontFamilyForWeight(weight) }, error ? styles.fieldError : null, !editable && styles.disabled]}
        testID="input-field"
      />
      {error ? (
        <Text style={styles.error} testID="input-error">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { ...textStyle({ weight: 600, size: 14 }), color: text.secondary },
  field: {
    height: 50,
    borderRadius: radius.input,
    borderWidth: surface.inputBorder.width,
    borderColor: surface.inputBorder.color,
    paddingHorizontal: 14,
    fontSize: 15,
    lineHeight: Math.round(15 * 1.25),
    color: text.primary,
    backgroundColor: "transparent",
  },
  fieldError: { borderColor: danger.border },
  disabled: { opacity: 0.45 },
  error: { ...textStyle(type.bodySm), color: danger.text },
});
