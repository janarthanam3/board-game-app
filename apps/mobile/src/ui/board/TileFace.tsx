// One board tile (docs/03 `TileFace`, docs/screens/1c §3 #6–#7, docs/screens/2a §3.1 #5).
//
// docs/03: "Below ~40 dp rendered width, name and price are dropped in that order." The reader's
// label never changes with zoom (docs/12), so everything dropped visually stays in the
// accessibility label BoardMap builds.

import { accent, board as boardTokens, control, gold, green, motion, radius, shadow, surface, text, type } from "@royal-navy/shared";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text as RNText, View } from "react-native";

import { GradientView } from "../../components/GradientView";
import { Icon } from "../../components/Icon";
import { easingFor, effectiveDuration, useReducedMotion } from "../../components/motion";
import { shadowStyle } from "../../components/shadows";
import { textStyle } from "../../components/typography";

/**
 * Widths at which each line survives. 1c §8 and 2a §7 both give 44 dp — the tap minimum — as the
 * point where "board tile labels drop out"; docs/03 says name then price go "in that order" but
 * never gives the second threshold, so PRICE_MIN_WIDTH is provisional (OQ-24 item 1).
 */
export const NAME_MIN_WIDTH = control.minTapTarget;
export const PRICE_MIN_WIDTH = 30;

/**
 * 1c §3 #6: name `700 7px`–`600 9px` by zoom — the bigger the tile, the lighter and larger. The
 * width at which it switches is not stated; 56 dp is provisional (OQ-24 item 3).
 */
const NAME_LARGE_WIDTH = 56;

export interface TileFaceProps {
  index: number;
  size: number;
  name: string;
  /** The tile's colour bar; absent on corners and card spaces. */
  groupColour?: string | undefined;
  priceLabel?: string | undefined;
  cornerLabel?: string | undefined;
  ownerColour?: string | undefined;
  houses?: number | undefined;
  hotel?: boolean | undefined;
  highlighted?: boolean | undefined;
  empty?: boolean | undefined;
  /** Held for a move (2a §5): the slot lifts while it is being carried. */
  pickedUp?: boolean | undefined;
}

export function TileFace(props: TileFaceProps) {
  const { index, size, groupColour, ownerColour, houses = 0, hotel = false } = props;
  const showName = size >= NAME_MIN_WIDTH;
  const showPrice = size >= PRICE_MIN_WIDTH;
  const testID = `board-tile-${index}`;
  const lift = usePickUp(props.pickedUp === true);

  if (props.empty) {
    // Build mode: an unassigned slot is a dashed square with a ph-plus (2a §3.1 #5).
    return (
      <Animated.View
        testID={`${testID}-empty`}
        style={[styles.tile, styles.empty, { width: size, height: size }, lift]}
      >
        <Icon name="ph-plus" size={14} color={accent.blue} />
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[{ width: size, height: size }, lift, props.pickedUp ? styles.lifted : null]}>
      <GradientView gradient={surface.card} style={[styles.tile, styles.filled, { width: size, height: size }]}>
        {props.highlighted ? <View testID={`${testID}-highlight`} style={styles.highlightRing} /> : null}
        {groupColour ? <View testID={`${testID}-band`} style={[styles.band, { backgroundColor: groupColour }]} /> : null}

        <View style={styles.body}>
          {props.cornerLabel && showName ? (
            <RNText allowFontScaling={false} numberOfLines={1} style={[textStyle({ ...type.tile, weight: 800, tracking: 0.14 }, 9), styles.corner]}>
              {props.cornerLabel}
            </RNText>
          ) : null}
          {showName && !props.cornerLabel ? (
            <RNText
              allowFontScaling={false}
              numberOfLines={1}
              style={[
                size >= NAME_LARGE_WIDTH
                  ? textStyle({ ...type.tile, weight: 600 }, 9)
                  : textStyle({ ...type.tile, weight: 700 }, 7),
                styles.name,
              ]}
            >
              {props.name}
            </RNText>
          ) : null}
          {showPrice && props.priceLabel && !props.cornerLabel ? (
            <RNText allowFontScaling={false} numberOfLines={1} style={[textStyle({ ...type.tile, weight: 600 }, 8), styles.price]}>
              {props.priceLabel}
            </RNText>
          ) : null}
        </View>

        {ownerColour ? <View testID={`${testID}-owner`} style={[styles.ownerPip, { backgroundColor: ownerColour }]} /> : null}

        <View style={styles.buildings}>
          {hotel ? (
            <View testID={`${testID}-hotel`} style={styles.hotelPip} />
          ) : (
            Array.from({ length: houses }, (_, house) => (
              <View key={house} testID={`${testID}-house-${house}`} style={styles.housePip} />
            ))
          )}
        </View>
      </GradientView>
    </Animated.View>
  );
}

/** 2a §9: tile pick-up — scale 1.06 with a shadow lift, over 120 ms ease-out. */
function usePickUp(pickedUp: boolean) {
  const scale = useRef(new Animated.Value(1)).current;
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    const animation = Animated.timing(scale, {
      toValue: pickedUp ? 1.06 : 1,
      duration: effectiveDuration(motion.tilePickUp.durationMs, reducedMotion),
      easing: easingFor(motion.tilePickUp.easing),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [pickedUp, scale, reducedMotion]);
  return { transform: [{ scale }] };
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: radius.tileFace,
    overflow: "hidden",
  },
  // 2a §3.1 #5: a filled slot carries the card tokens.
  filled: {
    borderWidth: surface.cardBorder.width,
    borderColor: surface.cardBorder.color,
    ...shadowStyle(surface.cardShadow),
  },
  // 2a §9: the held slot lifts off the board while it is carried.
  lifted: { ...shadowStyle(shadow.raised) },
  empty: {
    borderWidth: surface.dashedStrong.width,
    borderStyle: "dashed",
    borderColor: surface.dashedStrong.color,
    alignItems: "center",
    justifyContent: "center",
  },
  // 1c §5 marks the equivalent selection with a 2 dp gold ring.
  highlightRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.tileFace,
    borderWidth: 2,
    borderColor: gold.flat,
    zIndex: 1,
  },
  // 6 dp colour bar in the set colour (1c §3 #6).
  band: { height: 6, width: "100%" },
  body: { flex: 1, paddingHorizontal: boardTokens.tileBodyPadding, justifyContent: "center" },
  name: { color: text.primary },
  price: { color: gold.flat },
  corner: { color: text.muted, textAlign: "center" },
  // 1c §3 #6 gives the pip sizes but no anchors or gaps; those live in tokens.board (OQ-24 #4).
  ownerPip: { position: "absolute", top: boardTokens.pipInset, right: boardTokens.pipInset, width: 8, height: 8, borderRadius: 4 },
  buildings: { position: "absolute", bottom: boardTokens.pipInset, left: boardTokens.pipInset, flexDirection: "row", gap: boardTokens.pipGap },
  housePip: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: green.flat },
  hotelPip: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: gold.flat },
});
