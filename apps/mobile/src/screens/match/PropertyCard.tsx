// The HUD's deed card (docs/screens/1c-play-hud.md §3 #15 and "Card grid keys").
//
// Art slot, name, set line, build line, then the ten-cell key/value grid in the documented order.
// `1j`'s card is a different component — it adds the set-progress pips and drops seven of these
// keys — so this one stays with the screen that draws it.

import { green, radius, stackGap, text } from "@royal-navy/shared";
import { gold } from "@royal-navy/shared";
import { StyleSheet, Text as RNText, View } from "react-native";

import { Card } from "../../components/Card";
import { ImageSlot } from "../../components/ImageSlot";
import { textStyle } from "../../components/typography";
import { resolveGroupColour } from "../../ui/groupColour";
import type { HoldingModel } from "./hudModel";

/** §3 #15: "art 44×44". */
const ART = 44;
/** The `rent now` cell is the one value the design sizes up (§3 #15). */
const RENT_NOW_KEY = "rent now";

export interface PropertyCardProps {
  holding: HoldingModel;
  testID?: string;
}

export function PropertyCard({ holding, testID }: PropertyCardProps) {
  return (
    <Card testID={testID ?? `property-card-${holding.tileIndex}`} padding={12}>
      <View style={styles.header}>
        {/* Every illustration in v1 is a dashed placeholder (docs/03 `ImageSlot`); at 44 dp the
            design gives it no caption. */}
        <ImageSlot width={ART} height={ART} radius={radius.field} caption={[]} padding={0} />
        <View style={styles.titleColumn}>
          <RNText style={styles.name} numberOfLines={2}>
            {holding.name}
          </RNText>
          {holding.setLine ? (
            // The set line is the group's colour when the platform can render it; a colour it
            // cannot parse keeps the line legible in the meta colour rather than invisible (OQ-51).
            <RNText
              testID={`property-card-${holding.tileIndex}-set`}
              style={[styles.setLine, { color: resolveGroupColour(holding.setColour) ?? text.muted }]}
            >
              {holding.setLine}
            </RNText>
          ) : null}
          {holding.buildLine ? (
            <RNText testID={`property-card-${holding.tileIndex}-built`} style={styles.buildLine}>
              {holding.buildLine}
            </RNText>
          ) : null}
        </View>
      </View>

      <View style={styles.grid}>
        {holding.cells.map((cell) => (
          <View key={cell.key} accessible accessibilityLabel={cell.spoken} style={styles.cell}>
            <RNText style={styles.cellKey}>{cell.key}</RNText>
            {/* docs/12: "Money values — never truncated, never ellipsised — the row grows", so the
                value carries no line limit and the cell wraps at 130% font scale. */}
            <RNText style={cell.key === RENT_NOW_KEY ? styles.cellValueLarge : styles.cellValue}>{cell.value}</RNText>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", gap: stackGap.default, alignItems: "flex-start" },
  titleColumn: { flex: 1, minWidth: 0, gap: 2 },
  name: { ...textStyle({ weight: 800, size: 17 }), color: text.primary },
  // The set line takes the set's own colour, which is board data, so it is applied inline.
  setLine: textStyle({ weight: 600, size: 12 }),
  buildLine: { ...textStyle({ weight: 600, size: 12 }), color: green.flat },
  // "ten-cell key/value grid": two columns of pairs, as §2 draws them.
  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: 6, columnGap: stackGap.default },
  // 44% rather than 50% so two cells and the column gap fit at any width. The cell wraps its own
  // lines instead of clipping, because money is never ellipsised (docs/12).
  cell: { width: "44%", flexGrow: 1, flexDirection: "row", alignItems: "baseline", gap: 6, flexWrap: "wrap" },
  cellKey: { ...textStyle({ weight: 600, size: 11 }), color: text.muted },
  cellValue: { ...textStyle({ weight: 800, size: 13 }), color: gold.flat },
  cellValueLarge: { ...textStyle({ weight: 800, size: 15 }), color: gold.flat },
});
