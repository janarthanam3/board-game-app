import { stackGap, text, type } from "@royal-navy/shared";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "../Icon";
import { textStyle } from "../typography";

export interface ValueRowProps {
  label: string;
  value: string;
  /** Optional line under the label. */
  meta?: string;
  /** Renders a caret and makes the row pressable. */
  onPress?: () => void;
  testID?: string;
}

/**
 * Read-only label/value pair, 44 dp min. The read-only rendering of any control: host setup's
 * starting cash, the lobby rules card, read-only Rule lab.
 */
export function ValueRow({ label, value, meta, onPress, testID }: ValueRowProps) {
  const content = (
    <>
      <View style={styles.labelColumn}>
        <Text style={styles.label}>{label}</Text>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      </View>
      <Text style={styles.value}>{value}</Text>
      {onPress ? <Icon name="ph-caret-right" size={19} color={text.muted} /> : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable testID={testID ?? "value-row"} accessibilityRole="button" onPress={onPress} style={styles.row}>
        {content}
      </Pressable>
    );
  }
  return (
    <View testID={testID ?? "value-row"} style={styles.row}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: stackGap.default },
  labelColumn: { flex: 1, minWidth: 0 },
  label: { ...textStyle(type.body), color: text.muted },
  meta: { ...textStyle(type.bodySm), color: text.faint },
  value: { ...textStyle(type.value), color: text.primary },
});
