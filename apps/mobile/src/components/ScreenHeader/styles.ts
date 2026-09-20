import { stackGap, text, type } from "@royal-navy/shared";
import { StyleSheet } from "react-native";

import { textStyle } from "../typography";

export const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: stackGap.default, flexGrow: 0 },
  dimmed: { opacity: 0.45 },
  // The caret is 19 dp; the pressable around it is the 44 dp hit area.
  back: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  titleColumn: { flex: 1, minWidth: 0 },
  title: { ...textStyle(type.h3), color: text.primary },
  subtitle: { ...textStyle(type.bodySm), color: text.muted },
});
