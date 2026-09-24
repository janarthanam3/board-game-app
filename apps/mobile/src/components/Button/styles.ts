import {
  radius,
  accent,
  control,
  danger,
  stroke,
  surface,
  text,
  type,
} from "@royal-navy/shared";
import { withAlpha } from "@royal-navy/shared";
import { StyleSheet, type TextStyle, type ViewStyle } from "react-native";

import { textStyle } from "../typography";

// 03 "Button": icon 19 dp with a 7 dp gap before the label; inline buttons hug with frame padding.
const ICON_GAP = 7;
const INLINE_PADDING = 17;

export const styles = StyleSheet.create({
  base: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  block: { alignSelf: "stretch" },
  inline: { alignSelf: "flex-start" },
  // Inline buttons hug their label; block buttons centre it across the full width.
  inlinePadding: { paddingHorizontal: INLINE_PADDING },
  fill: { ...StyleSheet.absoluteFillObject },
  content: { flexDirection: "row", alignItems: "center", gap: ICON_GAP },
  contentHidden: { opacity: 0 },
  spinner: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  dialogSize: { minHeight: control.dialogButton.height, borderRadius: control.dialogButton.radius },
  // Button.small — 36 dp tall, brought to the 44 dp tap minimum by hit slop in the component
  // (1y §3 #1, 1z §3 #1, 2a §3.1 #1 and #7).
  smallSize: {
    minHeight: 36,
    borderRadius: radius.control,
    paddingHorizontal: 12,
    backgroundColor: withAlpha(accent.blue, 0.18),
    borderWidth: 1,
    borderColor: withAlpha(accent.blue, 0.45),
  },
  // 2a §3.1 #1: the small chip button's label is 700 13px accent.blue, whatever the variant.
  smallLabel: textStyle({ weight: 700, size: 13 }),
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
    labelColor: text.onGreen,
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
