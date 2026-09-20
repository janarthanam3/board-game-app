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

// 03 "Button": icon 19 dp with a 7 dp gap before the label; inline buttons hug with frame padding.
const ICON_GAP = 7;
const INLINE_PADDING = 17;

export const styles = StyleSheet.create({
  base: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  block: { alignSelf: "stretch" },
  inline: { alignSelf: "flex-start" },
  fill: { ...StyleSheet.absoluteFillObject },
  content: { flexDirection: "row", alignItems: "center", gap: ICON_GAP, paddingHorizontal: INLINE_PADDING },
  contentHidden: { opacity: 0 },
  spinner: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  dialogSize: { minHeight: control.dialogButton.height, borderRadius: control.dialogButton.radius },
  disabled: { opacity: 0.45 },
});

interface VariantStyle {
  frame: ViewStyle;
  label: TextStyle;
  labelColor: string;
}

// One entry per row of the "Button" table in docs/03-design-system.md. Heights are minimums
// (docs/02 "Heights are never fixed on a text-bearing box"; buttons grow to 56 at 130% scale).
export const variantStyles: Record<
  "primary" | "secondary" | "confirm" | "ghost" | "destructive" | "text",
  VariantStyle
> = {
  primary: {
    frame: { minHeight: control.primaryButton.height, borderRadius: control.primaryButton.radius },
    label: textStyle(type.button),
    labelColor: text.onGold,
  },
  secondary: {
    frame: {
      minHeight: control.secondaryButton.height,
      borderRadius: control.primaryButton.radius,
      borderWidth: control.secondaryButton.border.width,
      borderColor: stroke.blue,
    },
    label: textStyle(type.button),
    labelColor: text.primary,
  },
  confirm: {
    frame: { minHeight: control.primaryButton.height, borderRadius: control.primaryButton.radius },
    label: textStyle(type.button),
    // The design gives the confirm label as #0E2E66 — the screen background's bottom stop.
    labelColor: screenBackground.stops[2].color,
  },
  ghost: {
    frame: {
      minHeight: control.dialogButton.height,
      borderRadius: control.dialogButton.radius,
      borderWidth: surface.divider.width,
      borderColor: surface.divider.color,
    },
    label: textStyle(type.buttonXs),
    labelColor: text.secondary,
  },
  destructive: {
    frame: {
      minHeight: control.destructiveButton.height,
      borderRadius: control.destructiveButton.radius,
      borderWidth: surface.divider.width,
      borderColor: danger.border,
    },
    label: textStyle(type.buttonXs),
    labelColor: danger.soft,
  },
  text: {
    frame: { minHeight: control.minTapTarget },
    label: textStyle(type.body),
    labelColor: accent.blue,
  },
};
