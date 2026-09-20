import { accent, control, danger, gold, green, surface, text, type, warn, withAlpha } from "@royal-navy/shared";
import { StyleSheet, Text, View } from "react-native";

import { textStyle } from "../typography";

export type PillTone = "neutral" | "accent" | "gold" | "green" | "amber" | "danger";

export interface PillProps {
  label: string;
  /** neutral · accent · gold (published) · green (completed) · amber (pending) · danger. */
  tone?: PillTone;
  /** Overrides the tone's colour when a screen spec names a different one (see design-concerns). */
  color?: string;
  size?: number;
  testID?: string;
}

const DEFAULT_PILL_SIZE = 11;
// The tinted-tag pattern from the screen specs: role colour at 18% fill and 45% border.
const FILL_ALPHA = 0.18;
const BORDER_ALPHA = 0.45;

const toneColour: Record<Exclude<PillTone, "neutral">, string> = {
  accent: accent.blue,
  gold: gold.flat,
  green: green.flat,
  amber: warn.text,
  danger: danger.text,
};

/** Badge: 3×8 padding, radius 999, `type.chip`. */
export function Pill({ label, tone = "neutral", color, size = DEFAULT_PILL_SIZE, testID }: PillProps) {
  const roleColour = color ?? (tone === "neutral" ? undefined : toneColour[tone]);
  const frame = roleColour
    ? { backgroundColor: withAlpha(roleColour, FILL_ALPHA), borderColor: withAlpha(roleColour, BORDER_ALPHA) }
    : { backgroundColor: surface.inset, borderColor: surface.divider.color };

  return (
    <View testID={testID ?? `pill-${tone}`} style={[styles.pill, frame]}>
      <Text style={[textStyle(type.chip, size), { color: roleColour ?? text.secondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    paddingVertical: control.pillBadge.paddingVertical,
    paddingHorizontal: control.pillBadge.paddingHorizontal,
    borderRadius: control.pillBadge.radius,
    borderWidth: 1,
  },
});
