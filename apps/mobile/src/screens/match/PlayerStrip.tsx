// The player strip (docs/screens/1c-play-hud.md §3 #10–#11, §5, §6, §8, §9, §10).
//
// A `Players` header with the turn line beside it, then one chip per seat in a horizontal scroller.
// The chip is the screen's own component: docs/03's `PlayerChip` is a 25 dp token with body-sized
// text, which is not what 1c §3 #11 draws (a 72×56 card with a 10 dp swatch) — recorded in
// docs/design-concerns.md.

import { gold, player as seatTokens, radius, shadow, surface, text, withAlpha } from "@royal-navy/shared";
import { useEffect, useRef } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text as RNText, useWindowDimensions, View } from "react-native";

import { GradientView } from "../../components/GradientView";
import { easingFor, effectiveDuration, useReducedMotion } from "../../components/motion";
import { shadowStyle } from "../../components/shadows";
import { textStyle } from "../../components/typography";
import { seatFill } from "../../ui/seat";
import type { PlayerChipModel } from "./hudModel";

/** §3 #11: "min 72×56, radius 13"; the seat swatch is 10 dp. */
const CHIP_MIN_WIDTH = 72;
export const CHIP_MIN_HEIGHT = 56;
const CHIP_RADIUS = 13;
const SWATCH = 10;
/** §8: at 130% font scale "player chips grow to 64dp tall and the strip scrolls horizontally". */
export const CHIP_MIN_HEIGHT_LARGE_TEXT = 64;
export const LARGE_TEXT_SCALE = 1.3;
/** §2: the strip is a horizontal row with an 8 dp gap. */
const CHIP_GAP = 8;

export interface PlayerStripProps {
  players: PlayerChipModel[];
  /** `<name>'s turn` (§3 #10). */
  turnLine: string;
  onPlayerPress: (playerId: string) => void;
  /** Long-press opens `3q` (§6); G3 owns that sheet, so the HUD only forwards the press. */
  onPlayerLongPress?: (playerId: string) => void;
  /** §8: landscape turns the strip into a vertical column. */
  vertical?: boolean;
}

export function PlayerStrip({ players, turnLine, onPlayerPress, onPlayerLongPress, vertical = false }: PlayerStripProps) {
  return (
    <View testID="player-strip" style={styles.region}>
      <View style={styles.header}>
        <RNText style={styles.playersLabel}>Players</RNText>
        {/* §9: turn changes are announced politely. */}
        <RNText testID="turn-line" accessibilityLiveRegion="polite" style={styles.turnLine}>
          {turnLine}
        </RNText>
      </View>
      <ScrollView
        testID="player-chips"
        horizontal={!vertical}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.chips, vertical && styles.chipsVertical]}>
          {players.map((player) => (
            <PlayerChip
              key={player.playerId}
              player={player}
              onPress={() => onPlayerPress(player.playerId)}
              {...(onPlayerLongPress ? { onLongPress: () => onPlayerLongPress(player.playerId) } : {})}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

interface PlayerChipProps {
  player: PlayerChipModel;
  onPress: () => void;
  onLongPress?: () => void;
}

/**
 * One seat: swatch, name, cash. The active player's chip gains a gold border and a gold wash; that
 * highlight crosses over 200 ms on handover (§10 "Turn handover (active chip highlight)").
 */
function PlayerChip({ player, onPress, onLongPress }: PlayerChipProps) {
  const { fontScale } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  // The wash stays mounted at zero opacity so a handover fades out of the old chip as it fades into
  // the new one — §10 animates the change, not only the arrival.
  const highlight = useRef(new Animated.Value(player.active ? 1 : 0)).current;

  useEffect(() => {
    const animation = Animated.timing(highlight, {
      toValue: player.active ? 1 : 0,
      duration: effectiveDuration(HANDOVER_MS, reducedMotion),
      easing: easingFor("ease-out"),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [player.active, highlight, reducedMotion]);

  const fill = seatFill(player.colour);

  return (
    <Pressable
      testID={`player-chip-${player.playerId}`}
      accessibilityRole="button"
      // §9: "Player chips are one focus stop each: `Player 2, 731 rupees`" — the cash in words,
      // as docs/12 requires of every announced amount.
      accessibilityLabel={`${player.name}, ${player.spokenCash}`}
      accessibilityState={{ selected: player.active }}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[
        styles.chip,
        { minHeight: fontScale >= LARGE_TEXT_SCALE ? CHIP_MIN_HEIGHT_LARGE_TEXT : CHIP_MIN_HEIGHT },
      ]}
    >
      <GradientView gradient={surface.card} style={StyleSheet.absoluteFill} />
      {/* §3 #11's gold border and fill are one marker, so they live on one animated layer and the
          whole highlight crosses over 200 ms rather than the border snapping (§10). */}
      <Animated.View
        {...(player.active ? { testID: `player-chip-${player.playerId}-active` } : {})}
        style={[StyleSheet.absoluteFill, styles.chipHighlight, { opacity: highlight }]}
      />
      <View style={styles.chipBody}>
        {/* docs/02 "Colour — player tokens": every seat "has a 1.5 dp white ring". */}
        {typeof fill === "string" ? (
          <View testID={`seat-swatch-${player.playerId}`} style={[styles.swatch, { backgroundColor: fill }]} />
        ) : (
          <GradientView testID={`seat-swatch-${player.playerId}`} gradient={fill} style={styles.swatch} />
        )}
        <RNText style={styles.name} numberOfLines={1}>
          {player.name}
        </RNText>
        <RNText style={styles.cash} numberOfLines={1}>
          {player.cash}
        </RNText>
      </View>
    </Pressable>
  );
}

/** §10: "Turn handover (active chip highlight) | 200ms | ease-out". */
const HANDOVER_MS = 200;

const styles = StyleSheet.create({
  region: { gap: 8 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  playersLabel: { ...textStyle({ weight: 600, size: 14 }), color: text.secondary },
  turnLine: { ...textStyle({ weight: 700, size: 13 }), color: gold.flat },
  chips: { flexDirection: "row", gap: CHIP_GAP },
  chipsVertical: { flexDirection: "column" },
  chip: {
    minWidth: CHIP_MIN_WIDTH,
    borderRadius: CHIP_RADIUS,
    overflow: "hidden",
    borderWidth: surface.cardBorder.width,
    borderColor: surface.cardBorder.color,
    ...shadowStyle(shadow.card),
  },
  // §3 #11: 1 dp rgba(255,200,74,.45) border and a rgba(255,200,74,.09) fill, over the chip's own
  // border so the gold replaces it for as long as the player is the actor.
  chipHighlight: {
    backgroundColor: withAlpha(gold.flat, 0.09),
    borderWidth: surface.cardBorder.width,
    borderColor: withAlpha(gold.flat, 0.45),
    borderRadius: CHIP_RADIUS,
  },
  chipBody: { paddingVertical: 8, paddingHorizontal: 10, gap: 4, flex: 1, justifyContent: "center" },
  swatch: {
    width: SWATCH,
    height: SWATCH,
    borderRadius: radius.pill,
    borderWidth: seatTokens.ring.width,
    borderColor: seatTokens.ring.color,
    overflow: "hidden",
  },
  name: { ...textStyle({ weight: 600, size: 11 }), color: text.secondary },
  cash: { ...textStyle({ weight: 800, size: 13 }), color: text.primary },
});
