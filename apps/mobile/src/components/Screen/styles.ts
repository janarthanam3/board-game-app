import { frame, stackGap } from "@royal-navy/shared";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  background: { flex: 1 },
  safeArea: { flex: 1 },
  body: { flex: 1, flexDirection: "column", gap: stackGap.default },
  padded: { padding: frame.padding },
  unpadded: { padding: 0 },
});
