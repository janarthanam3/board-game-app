import { accent, surface, text } from "@royal-navy/shared";
import { type DimensionValue, StyleSheet, Text, View } from "react-native";

import { GradientView } from "../GradientView";
import { Icon } from "../Icon";
import { fontFamilyForWeight } from "../../ui/fonts";

export interface ImageSlotProps {
  width?: DimensionValue;
  height?: DimensionValue;
  /** Fills its parent (`flex: 1`) when set; the hero slot on 1w2. */
  fill?: boolean;
  radius: number;
  /** Caption lines, exactly as the screen doc quotes them, e.g. ["board / hero art", "placeholder"]. */
  caption: string[];
  /** Caption size in dp — the screen docs use 10–16. */
  captionSize?: number;
  /** Optional 60 dp accent glyph above the caption (3n empty states). */
  glyph?: string;
  /** Hero slots carry the wash gradient; small slots are transparent. */
  wash?: boolean;
  testID?: string;
}

/**
 * Every illustration in v1 is a dashed placeholder with its caption (handoff: "No artwork").
 * Dashed 1 dp `surface.dashedStrong`; captions in `text.faint`.
 */
export function ImageSlot({
  width,
  height,
  fill = false,
  radius,
  caption,
  captionSize = 11,
  glyph,
  wash = false,
  testID,
}: ImageSlotProps) {
  const frame = [
    styles.slot,
    { borderRadius: radius },
    fill ? styles.fill : { width, height },
  ];
  const content = (
    <>
      {glyph ? <Icon name={glyph} size={60} color={accent.blue} /> : null}
      {caption.map((line) => (
        <Text
          key={line}
          style={[styles.caption, { fontSize: captionSize, lineHeight: Math.round(captionSize * 1.25) }]}
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
    borderWidth: surface.dashedStrong.width,
    borderColor: surface.dashedStrong.color,
    borderStyle: surface.dashedStrong.style,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    padding: 6,
    overflow: "hidden",
  },
  fill: { flex: 1, alignSelf: "stretch" },
  // The 1w2 hero's "inset highlight rgba(255,255,255,.05)": a 1 dp line along the top edge.
  highlight: { position: "absolute", top: 0, left: 0, right: 0, height: 1, backgroundColor: surface.imageSlotHighlight },
  caption: { fontFamily: fontFamilyForWeight(600), color: text.faint, textAlign: "center" },
});
