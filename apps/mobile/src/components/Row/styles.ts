import { danger, gold, radius, shadow, stackGap, surface, text, type } from "@royal-navy/shared";
import { StyleSheet } from "react-native";

import { shadowStyle } from "../shadows";
import { textStyle } from "../typography";

export const styles = StyleSheet.create({
  frame: {
    minHeight: 56,
    borderRadius: radius.card,
    borderWidth: surface.cardBorder.width,
    borderColor: surface.cardBorder.color,
    overflow: "hidden",
    ...shadowStyle(shadow.card),
  },
  selected: { borderColor: gold.flat },
  error: { borderColor: danger.border },
  disabled: { opacity: 0.45 },
  pressedFrame: {},
  pressOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: surface.pressOverlay },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: stackGap.default,
    paddingVertical: 11,
    paddingHorizontal: 12,
    minHeight: 56,
  },
  leading: { alignItems: "center", justifyContent: "center" },
  middle: { flex: 1, minWidth: 0, gap: 2 },
  title: { ...textStyle(type.title), color: text.primary },
  meta: { ...textStyle(type.bodySm), color: text.muted },
  metaError: { color: danger.text },
  value: { ...textStyle(type.value), color: text.primary },
  radio: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: surface.divider.color,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: { borderColor: gold.flat },
  radioDot: { width: 7, height: 7, borderRadius: radius.pill, backgroundColor: gold.flat },
});
