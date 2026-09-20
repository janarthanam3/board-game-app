import {
  accent,
  control,
  danger,
  screenBackground,
  stroke,
  surface,
  text,
  type,
} from "@royal-navy/shared";
import { StyleSheet, type TextStyle, type ViewStyle } from "react-native";

import { textStyle } from "../typography";

export const styles = StyleSheet.create({
  base: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  block: { alignSelf: "stretch" },
  inline: { alignSelf: "flex-start", paddingHorizontal: 17 },
  fill: { ...StyleSheet.absoluteFillObject },
  content: { flexDirection: "row", alignItems: "center", gap: 7 },
  pressed: { transform: [{ scale: 0.98 }] },
  dialogSize: { height: control.dialogButton.height, borderRadius: control.dialogButton.radius },
  disabled: { opacity: 0.45 },
});

interface VariantStyle {
  frame: ViewStyle;
  label: TextStyle;
  labelColor: string;
}

// One entry per row of the "Button" table in docs/03-design-system.md.
export const variantStyles: Record<
  "primary" | "secondary" | "confirm" | "ghost" | "destructive" | "text",
  VariantStyle
> = {
  primary: {
    frame: { height: control.primaryButton.height, borderRadius: control.primaryButton.radius },
    label: textStyle(type.button),
    labelColor: text.onGold,
  },
  secondary: {
    frame: {
      height: control.secondaryButton.height,
      borderRadius: control.primaryButton.radius,
      borderWidth: control.secondaryButton.border.width,
      borderColor: stroke.blue,
    },
    label: textStyle(type.button),
    labelColor: text.primary,
  },
  confirm: {
    frame: { height: control.primaryButton.height, borderRadius: control.primaryButton.radius },
    label: textStyle(type.button),
    // The design gives the confirm label as #0E2E66 — the screen background's bottom stop.
    labelColor: screenBackground.stops[2].color,
  },
  ghost: {
    frame: {
      height: control.dialogButton.height,
      borderRadius: control.dialogButton.radius,
      borderWidth: surface.divider.width,
      borderColor: surface.divider.color,
    },
    label: textStyle(type.buttonXs),
    labelColor: text.secondary,
  },
  destructive: {
    frame: {
      height: control.destructiveButton.height,
      borderRadius: control.destructiveButton.radius,
      borderWidth: 1,
      borderColor: danger.border,
    },
    label: textStyle(type.buttonXs),
    labelColor: danger.soft,
  },
  text: {
    frame: { minHeight: 44 },
    label: textStyle(type.body),
    labelColor: accent.blue,
  },
};
