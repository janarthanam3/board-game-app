import { stackGap, surface, text, type } from "@royal-navy/shared";
import { StyleSheet, Text, View } from "react-native";

import { textStyle } from "../typography";

export interface SectionLabelProps {
  label: string;
  /** Right-hand meta in `type.body.sm`. */
  meta?: string;
}

/** Row: uppercase `type.label` in `text.muted`, a 1 dp divider filling the width, optional meta. */
export function SectionLabel({ label, meta }: SectionLabelProps) {
  return (
    <View style={styles.row} testID="section-label">
      <Text style={styles.label}>{label}</Text>
      <View style={styles.rule} testID="section-label-rule" />
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: stackGap.inner },
  label: { ...textStyle(type.label), color: text.muted },
  rule: { flex: 1, height: surface.divider.width, backgroundColor: surface.divider.color },
  meta: { ...textStyle(type.bodySm), color: text.muted },
});
