import { control, surface } from "@royal-navy/shared";
import { StyleSheet } from "react-native";

// 39 dp visual, 44 dp tappable: the difference is split across the four sides as hit slop.
const slop = (control.minTapTarget - control.iconButton.width) / 2;

export const styles = StyleSheet.create({
  button: {
    width: control.iconButton.width,
    height: control.iconButton.height,
    borderRadius: control.iconButton.radius,
    backgroundColor: surface.inset,
    borderWidth: surface.divider.width,
    borderColor: surface.divider.color,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.45 },
  hitSlop: { top: slop, bottom: slop, left: slop, right: slop },
});
