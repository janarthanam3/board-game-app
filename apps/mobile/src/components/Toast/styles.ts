import { frame, radius, shadow, stackGap, surface, text, type, zIndex } from "@royal-navy/shared";
import { StyleSheet } from "react-native";

import { shadowStyle } from "../shadows";
import { textStyle } from "../typography";

export const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: frame.padding,
    left: frame.padding,
    right: frame.padding,
    zIndex: zIndex.toast,
    ...shadowStyle(shadow.raised),
  },
  card: {
    borderRadius: radius.toast,
    borderWidth: surface.cardBorder.width,
    borderColor: surface.cardBorder.color,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: stackGap.inner,
  },
  message: { ...textStyle(type.body), color: text.primary, flex: 1 },
});
