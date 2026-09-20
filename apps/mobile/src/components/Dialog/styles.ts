import { frame, radius, shadow, stackGap, surface, text, type, zIndex } from "@royal-navy/shared";
import { StyleSheet } from "react-native";

import { shadowStyle } from "../shadows";
import { textStyle } from "../typography";

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: frame.padding,
    zIndex: zIndex.dialog,
  },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: surface.scrim },
  panelWrap: { width: "100%", maxWidth: 320, ...shadowStyle(shadow.raised) },
  panel: {
    borderRadius: radius.dialog,
    borderWidth: surface.cardBorder.width,
    borderColor: surface.cardBorder.color,
    padding: frame.padding,
    gap: stackGap.default,
  },
  header: { flexDirection: "row", alignItems: "center", gap: stackGap.default },
  dangerTile: {
    width: 39,
    height: 39,
    borderRadius: radius.control,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { ...textStyle(type.h1), color: text.primary, flex: 1 },
  body: { ...textStyle(type.body), color: text.secondary },
  actions: { flexDirection: "row", gap: stackGap.tight },
  action: { flex: 1 },
});
