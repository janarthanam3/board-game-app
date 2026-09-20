import { accent, surface, text } from "@royal-navy/shared";
import { type DimensionValue, StyleSheet, Text, View } from "react-native";

import { GradientView } from "../GradientView";
import { Icon } from "../Icon";
import { fontFamilyForWeight } from "../../ui/fonts";

export interface ImageSlotProps {
  width?: DimensionValue;
  height?: DimensionValue;
  /** Fills its parent (`flex: 1`) when set; the hero slot on 1a. */
  fill?: boolean;
  radius: number;
  /** Caption lines, exactly as the screen doc quotes them, e.g. ["board / hero art", "placeholder"]. */
  caption: string[];
  /** Caption size in dp — the screen docs use 10–16. */
  captionSize?: number;
  /** Caption colour: `faint` (.75 — 1n, 1o, 2a, 3n) or `muted` (.8 — the 1a hero). */
  captionTone?: "faint" | "muted";
  /** Dashed border: `strong` (.45 — most slots) or `regular` (.4 — the 1a hero). */
  border?: "strong" | "regular";
  /** Inner padding; the 1a hero uses 14. */
  padding?: number;
  /** Optional `accent.blue` glyph above the caption (3b). 3n's bare glyph is not an ImageSlot. */
  glyph?: string;
  glyphSize?: 24 | 36 | 44 | 60;
  /** Hero slots carry the wash gradient and inset highlight (1a §3 #2); small slots are transparent. */
  wash?: boolean;
  testID?: string;
}

/**
 * Every illustration in v1 is a dashed placeholder with its caption (handoff: "No artwork").
 * Each screen spec gives its own size, radius, border alpha, caption size and colour; the props
 * cover every combination the specs use so no screen needs a bespoke slot.
 */
export function ImageSlot({
  width,
  height,
  fill = false,
  radius,
  caption,
  captionSize = 11,
  captionTone = "faint",
  border = "strong",
  padding = 6,
  glyph,
  glyphSize = 60,
  wash = false,
  testID,
}: ImageSlotProps) {
  const stroke = border === "strong" ? surface.dashedStrong : surface.dashed;
  const frame = [
    styles.slot,
    { borderRadius: radius, borderColor: stroke.color, borderWidth: stroke.width, padding },
    fill ? styles.fill : { width, height },
  ];
  const captionColor = captionTone === "muted" ? text.muted : text.faint;
  const content = (
    <>
      {glyph ? <Icon name={glyph} size={glyphSize} color={accent.blue} /> : null}
      {caption.map((line) => (
        <Text
          key={line}
          style={[
            styles.caption,
            { fontSize: captionSize, lineHeight: Math.round(captionSize * 1.25), color: captionColor },
          ]}
        >
          {line}
        </Text>
      ))}
    </>
  );

  if (wash) {
    return (
      <GradientView gradient={surface.imageSlotWash} style={frame} testID={testID ?? "image-slot"}>
        <View style={styles.highlight} pointerEvents="none" />
        {content}
      </GradientView>
    );
  }
  return (
    <View style={frame} testID={testID ?? "image-slot"}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    overflow: "hidden",
  },
  fill: { flex: 1, alignSelf: "stretch" },
  // The 1a hero's "inset highlight rgba(255,255,255,.05)": a 1 dp line along the top edge.
  highlight: { position: "absolute", top: 0, left: 0, right: 0, height: 1, backgroundColor: surface.imageSlotHighlight },
  caption: { fontFamily: fontFamilyForWeight(600), textAlign: "center" },
});
