// The holdings region (docs/screens/1c-play-hud.md §3 #14–#17, §5 "empty holdings", §6, §8, §10).
//
// A header (`My properties · <n>`, the Cards/List switch, the sort chip) over the one scrolling area
// on the screen (§11 AC8: "The holdings region is the only scroller"). Cards view shows a deed per
// property; list view shows name and cost per row and expands the tapped row into the same card.

import { motion, surface, text } from "@royal-navy/shared";
import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text as RNText, View } from "react-native";

import { Chip } from "../../components/Chip";
import { easingFor, effectiveDuration, useReducedMotion } from "../../components/motion";
import { ScrollRegion } from "../../components/ScrollRegion";
import { Segmented } from "../../components/Segmented";
import { textStyle } from "../../components/typography";
import type { HoldingModel, HoldingsSort } from "./hudModel";
import { PropertyCard } from "./PropertyCard";

/** Required copy, verbatim (§3 #17 and §5's empty state). */
export const LIST_NOTE = "row tap → expand details · same data as card view";
export const NO_PROPERTIES = "No properties yet.";

/** §3 #16: "min-height 48; colour bar 4dp". */
const ROW_MIN_HEIGHT = 48;
const ROW_BAR = 4;
/** §10: "Card ↔ list view swap | 180ms cross-fade" and "Property card expand from a list row | 220ms". */
const VIEW_SWAP_MS = 180;
const ROW_EXPAND_MS = 220;

export type HoldingsView = "cards" | "list";

export interface HoldingsProps {
  holdings: HoldingModel[];
  view: HoldingsView;
  sort: HoldingsSort;
  /** The tile whose list row is expanded into its card (§6 "List row tap"). */
  expandedTileIndex: number | null;
  /**
   * True until the first snapshot. §5 makes the board and the strip skeletons and says nothing about
   * this region, but `No properties yet.` states a fact that is not known yet, so it is withheld
   * rather than replaced with copy the design does not have.
   */
  loading?: boolean;
  onViewChange: (view: HoldingsView) => void;
  onSortPress: () => void;
  onRowPress: (tileIndex: number) => void;
}

export function Holdings({
  holdings,
  view,
  sort,
  expandedTileIndex,
  loading = false,
  onViewChange,
  onSortPress,
  onRowPress,
}: HoldingsProps) {
  return (
    <View testID="holdings" style={styles.region}>
      <View style={styles.header}>
        <RNText style={styles.title}>{`My properties · ${holdings.length}`}</RNText>
        <View style={styles.controls}>
          <View style={styles.segmented}>
            <Segmented
              label="Holdings view"
              options={[
                { key: "cards", label: "Cards" },
                { key: "list", label: "List" },
              ]}
              selectedKey={view}
              onSelect={onViewChange}
            />
          </View>
          {/* §6: the chip cycles colour → cost → rent now, and shows the sort in force. */}
          <Chip testID="holdings-sort" label={sort} selected={false} onPress={onSortPress} />
        </View>
      </View>

      <CrossFade viewKey={view}>
        <ScrollRegion>
          {loading ? null : holdings.length === 0 ? (
            <RNText testID="holdings-empty" style={styles.empty}>
              {NO_PROPERTIES}
            </RNText>
          ) : view === "cards" ? (
            holdings.map((holding) => <PropertyCard key={holding.tileIndex} holding={holding} />)
          ) : (
            <>
              {holdings.map((holding) => (
                <ListEntry
                  key={holding.tileIndex}
                  holding={holding}
                  expanded={expandedTileIndex === holding.tileIndex}
                  onPress={() => onRowPress(holding.tileIndex)}
                />
              ))}
              <RNText style={styles.note}>{LIST_NOTE}</RNText>
            </>
          )}
        </ScrollRegion>
      </CrossFade>
    </View>
  );
}

/** One list row, and the card it expands into (§6, §10). */
function ListEntry({ holding, expanded, onPress }: { holding: HoldingModel; expanded: boolean; onPress: () => void }) {
  const reducedMotion = useReducedMotion();
  const grow = useRef(new Animated.Value(expanded ? 1 : 0)).current;

  useEffect(() => {
    const animation = Animated.timing(grow, {
      toValue: expanded ? 1 : 0,
      duration: effectiveDuration(ROW_EXPAND_MS, reducedMotion),
      easing: easingFor(motion.base.easing),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [expanded, grow, reducedMotion]);

  return (
    <View>
      <Pressable
        testID={`property-row-${holding.tileIndex}`}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${holding.name}, ${holding.spokenCostLine}`}
        onPress={onPress}
        style={styles.row}
      >
        <View style={[styles.rowBar, holding.setColour ? { backgroundColor: holding.setColour } : styles.rowBarPlain]} />
        <View style={styles.rowText}>
          <RNText style={styles.rowName} numberOfLines={1}>
            {holding.name}
          </RNText>
          <RNText style={styles.rowCost}>{holding.costLine}</RNText>
        </View>
      </Pressable>
      {expanded ? (
        <Animated.View testID={`property-row-${holding.tileIndex}-expanded`} style={{ opacity: grow }}>
          <PropertyCard holding={holding} />
        </Animated.View>
      ) : null}
    </View>
  );
}

/** §10: the two views cross-fade over 180 ms, ease-out. */
function CrossFade({ viewKey, children }: { viewKey: string; children: React.ReactNode }) {
  const reducedMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    opacity.setValue(0);
    const animation = Animated.timing(opacity, {
      toValue: 1,
      duration: effectiveDuration(VIEW_SWAP_MS, reducedMotion),
      easing: easingFor("ease-out"),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [viewKey, opacity, reducedMotion]);

  return <Animated.View style={[styles.fade, { opacity }]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  // flex + minHeight 0 is what makes this region, and not the screen, the scroller.
  region: { flex: 1, minHeight: 0, gap: 8 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" },
  title: { ...textStyle({ weight: 600, size: 14 }), color: text.secondary },
  controls: { flexDirection: "row", alignItems: "center", gap: 7 },
  // The switch sizes itself off its two labels; a minimum keeps the segments even, and it grows
  // rather than clipping when the labels do at 130% font scale.
  segmented: { minWidth: 132 },
  fade: { flex: 1, minHeight: 0 },
  empty: { ...textStyle({ weight: 600, size: 13 }), color: text.muted },
  note: { ...textStyle({ weight: 600, size: 11 }), color: text.faint },
  // §3 #16 gives the row a height, a colour bar, a name and a cost — and no surface, so it carries
  // none; §2 draws the rows as bare lines under the header.
  row: { minHeight: ROW_MIN_HEIGHT, flexDirection: "row", alignItems: "center", gap: 11 },
  rowBar: { width: ROW_BAR, alignSelf: "stretch" },
  rowBarPlain: { backgroundColor: surface.divider.color },
  rowText: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 8, flexWrap: "wrap" },
  rowName: { ...textStyle({ weight: 700, size: 15 }), color: text.primary },
  rowCost: { ...textStyle({ weight: 600, size: 12 }), color: text.muted },
});
