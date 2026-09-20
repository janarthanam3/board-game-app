import { radius, shadow, stackGap, surface, type } from "@royal-navy/shared";
import { StyleSheet } from "react-native";

import { shadowStyle } from "../shadows";
import { textStyle } from "../typography";

export const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: surface.cardBorder.width,
    flexDirection: "column",
    gap: stackGap.inner,
    overflow: "hidden",
    ...shadowStyle(shadow.card),
  },
  warnWash: {},
  warnOverlay: { ...StyleSheet.absoluteFillObject },
  kicker: textStyle(type.kicker),
});
