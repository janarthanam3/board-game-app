import { control, frame, radius, shadow, surface, zIndex } from "@royal-navy/shared";
import { StyleSheet } from "react-native";

import { shadowStyle } from "../shadows";

export const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end", zIndex: zIndex.sheet },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: surface.scrim },
  backdropPressable: { flex: 1 },
  panelWrap: { ...shadowStyle(shadow.sheet) },
  panel: {
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    padding: frame.padding,
    // The grabber sits inside the padding; content follows with the same inner gap as a card.
    gap: 8,
  },
  grabber: {
    alignSelf: "center",
    width: control.sheetGrabber.width,
    height: control.sheetGrabber.height,
    borderRadius: control.sheetGrabber.radius,
    backgroundColor: control.sheetGrabber.color,
  },
});
