// The board map (docs/03 "Game components" → `BoardMap`, docs/screens/1c §3 #5–#9, §5, §6, §8,
// §10, docs/screens/2a §2.1, §3.1 #4–#9, §4, §5, §9, docs/12 accessibility and responsive).
//
// A square viewport: the ring is laid out by layout.ts, the centre holds the board art, a zoom bar
// sits bottom-left and the pan hint bottom-right. Pinch zooms, drag pans, and the board is
// translated so every slot is reachable past Fit.
//
// Tap behaviour differs by mode, because the two screens that use this component differ:
//   play  — 1c §8: "labels drop out below 44dp rendered size (the tile stays tappable)".
//   build — 2a §4: at Fit on 40 slots "map slots are display-only — taps are ignored, and the
//           first tap surfaces the warning as a toast".

import { board, formatRupees, gold, motion, player, radius, surface, text, type } from "@royal-navy/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type AccessibilityActionEvent,
  type AccessibilityRole,
  Animated,
  Pressable,
  StyleSheet,
  Text as RNText,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import { Button } from "../../components/Button";
import { Icon } from "../../components/Icon";
import { ImageSlot } from "../../components/ImageSlot";
import { easingFor, effectiveDuration, useReducedMotion } from "../../components/motion";
import { textStyle } from "../../components/typography";
import {
  type BoardMode,
  boardLayout,
  clampPan,
  clampZoom,
  edgeOf,
  FIT_ZOOM,
  type PanOffset,
  panToTile,
  stepZoom,
  tileIsTappable,
} from "./layout";
import { TileFace } from "./TileFace";

/** Required copy, verbatim (1c §3 #9, 2a §3.1 #8). */
export const PAN_HINT = "Pinch to zoom · drag to pan";

/** Required copy, verbatim (2a §2.1; docs/03 calls it "required copy, not commentary"). */
export const FIT_WARNING =
  "At Fit a tile is about 27dp — names clip, prices drop out, and tap targets fall under 44dp. Zoom in to select or place.";

/** The centre art's three caption lines, verbatim (2a §2.1, §3.1 #6). */
export const CENTRE_CAPTIONS = ["center art", "tap a slot to assign", "hold to move"] as const;

/** The warning belongs to the 40-slot ring its copy describes (2a §3.1 #9: "Fit on 40 slots only"). */
const WARNING_RING_SIZE = 40;

export type BoardTileKind = "property" | "utility" | "card" | "corner";

export interface BoardTileShape {
  kind: BoardTileKind;
  name: string;
  cost?: number | undefined;
  groupColour?: string | undefined;
  /** `GO`, `CHEST`, `JAIL`, `GO TO` (1c §3 #7). */
  corner?: string | undefined;
  /** Card spaces show a rule count where a property shows its price (docs/03 TileFace). */
  ruleCount?: number | undefined;
  ownerColour?: string | undefined;
  ownerName?: string | undefined;
  houses?: number | undefined;
  hotel?: boolean | undefined;
}

export interface BoardShape {
  rows: number;
  cols: number;
  /** One entry per ring slot in board order; `null` is an unassigned slot (build mode). */
  tiles: (BoardTileShape | null)[];
}

export interface PlayerTokenShape {
  playerId: string;
  name: string;
  colour: string;
  tileIndex: number;
  /** The viewer's own token on their turn: a 2 dp gold ring (1c §5). */
  active?: boolean | undefined;
}

export interface BoardMapProps {
  board: BoardShape;
  /** Inner width of the viewport in dp. */
  viewport: number;
  /** A zoom stop; see layout.ts ZOOM_STOPS. Defaults to Fit. */
  zoom?: number;
  mode?: BoardMode;
  highlight?: number[];
  tokens?: PlayerTokenShape[];
  /** Blocks every interaction while a move animates (1c §5 "Board interaction locked"). */
  locked?: boolean;
  /** The slot currently held for a move (2a §5). */
  pickedUpIndex?: number | null;
  onTilePress?: (index: number) => void;
  onTileLongPress?: (index: number) => void;
  /** A held slot was dropped on another one — the two swap (2a §5). */
  onTileMove?: (from: number, to: number) => void;
  onTileRemove?: (index: number) => void;
  onZoomChange?: (zoom: number) => void;
  /** 2a §4: the first tap on a display-only slot surfaces the warning as a toast. */
  onDisplayOnlyTap?: (message: string) => void;
  testID?: string;
}

export function BoardMap({
  board,
  viewport,
  zoom = FIT_ZOOM,
  mode = "play",
  highlight = [],
  tokens = [],
  locked = false,
  pickedUpIndex = null,
  onTilePress,
  onTileLongPress,
  onTileMove,
  onTileRemove,
  onZoomChange,
  onDisplayOnlyTap,
  testID,
}: BoardMapProps) {
  const level = clampZoom(zoom, mode);
  const layout = useMemo(
    () => boardLayout({ rows: board.rows, cols: board.cols, viewport, zoom: level }),
    [board.rows, board.cols, viewport, level],
  );

  const [pan, setPan] = useState<PanOffset>({ x: 0, y: 0 });
  const panStart = useRef<PanOffset>({ x: 0, y: 0 });
  const warned = useRef(false);
  const ringSlots = board.tiles.length;
  const tappable = tileIsTappable(layout.tileSize);
  // Only the builder goes display-only (2a §8); play and the selection maps keep their tiles live
  // below 44 dp — 1c §8: "the tile stays tappable through the property card".
  const displayOnly = locked || (mode === "build" && !tappable);
  // 2a §3.1 #9: the warning belongs to the builder, at Fit, on the 40-slot ring its copy describes.
  const atFitOn40 = mode === "build" && level === FIT_ZOOM && ringSlots === WARNING_RING_SIZE;

  // Keep the pan inside the board whenever the zoom (and so the board size) changes.
  useEffect(() => {
    setPan((current) => clampPan(current, layout.boardSize, viewport));
  }, [layout.boardSize, viewport]);

  // 1c §11 AC5: the active token is kept in view after each move.
  const activeIndex = tokens.find((token) => token.active)?.tileIndex;
  useEffect(() => {
    if (activeIndex === undefined) {
      return;
    }
    setPan(panToTile(layout, activeIndex, viewport));
  }, [activeIndex, layout, viewport]);

  const changeZoom = useCallback(
    (next: number) => {
      onZoomChange?.(clampZoom(next, mode));
    },
    [mode, onZoomChange],
  );

  // 2a §9: a zoom step settles over 200 ms, Fit over 280 ms. The grid eases into its new layout so
  // the change reads as a transition rather than a jump.
  const reducedMotion = useReducedMotion();
  const settle = useRef(new Animated.Value(1)).current;
  const previousZoom = useRef(level);
  useEffect(() => {
    if (previousZoom.current === level) {
      return;
    }
    const step = level === FIT_ZOOM ? motion.mapFit : motion.mapZoomStep;
    previousZoom.current = level;
    settle.setValue(0.98);
    const animation = Animated.timing(settle, {
      toValue: 1,
      duration: effectiveDuration(step.durationMs, reducedMotion),
      easing: easingFor(step.easing),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [level, reducedMotion, settle]);

  // Pinch to zoom, drag to pan (1c §6, 2a §5, docs/03 "Supports pinch zoom and drag pan").
  const pinch = useMemo(
    () =>
      Gesture.Pinch()
        .enabled(!locked)
        .onUpdate((event) => {
          changeZoom(level * event.scale);
        }),
    [changeZoom, level, locked],
  );

  const drag = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!locked)
        .onBegin(() => {
          panStart.current = pan;
        })
        .onUpdate((event) => {
          setPan(
            clampPan(
              { x: panStart.current.x + event.translationX, y: panStart.current.y + event.translationY },
              layout.boardSize,
              viewport,
            ),
          );
        }),
    [layout.boardSize, pan, viewport, locked],
  );

  const gestures = useMemo(() => Gesture.Simultaneous(pinch, drag), [pinch, drag]);

  const handlePress = useCallback(
    (index: number, eligible: boolean) => {
      if (!eligible) {
        return;
      }
      if (displayOnly) {
        // 2a §4: taps are ignored; the first one surfaces the warning as a toast. The copy quotes
        // "about 27dp", so it is only raised where that is true — a smaller ring that is also
        // display-only has no documented sentence yet (OQ-24 item 2).
        if (!warned.current && atFitOn40) {
          warned.current = true;
          onDisplayOnlyTap?.(FIT_WARNING);
        }
        return;
      }
      if (pickedUpIndex !== null && pickedUpIndex !== index) {
        onTileMove?.(pickedUpIndex, index);
        return;
      }
      onTilePress?.(index);
    },
    [atFitOn40, displayOnly, onDisplayOnlyTap, onTileMove, onTilePress, pickedUpIndex],
  );

  const handleAccessibilityAction = useCallback(
    (index: number) => (event: AccessibilityActionEvent) => {
      // 2a §8: drag-to-move is mirrored by these two actions.
      if (event.nativeEvent.actionName === "moveToSlot") {
        onTileLongPress?.(index);
      }
      if (event.nativeEvent.actionName === "removeFromBoard") {
        onTileRemove?.(index);
      }
    },
    [onTileLongPress, onTileRemove],
  );

  return (
    <View testID={testID ?? "board-map"}>
      <View style={[styles.viewport, { width: viewport, height: viewport }]}>
        <GestureDetector gesture={gestures}>
          {/* docs/12: "The board map is a single accessibilityRole='grid'". React Native's
              AccessibilityRole union omits the ARIA "grid" value, so it is cast; the standards-based
              `role` prop carries the same value to the platform. */}
          <Animated.View
            testID="board-grid"
            role="grid"
            accessibilityRole={"grid" as AccessibilityRole}
            style={{
              width: layout.boardSize,
              height: layout.boardSize,
              transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale: settle }],
            }}
          >
            <View
              testID="board-centre-art"
              style={[
                styles.centre,
                { left: layout.centre.left, top: layout.centre.top, width: layout.centre.size, height: layout.centre.size },
              ]}
            >
              {mode === "build" ? (
                // 2a §3.1 #6: one dashed panel around all three lines — head 12 dp, hints 10 dp.
                // The radius is not given by the spec; it reuses the tile radius (OQ-24 item 5).
                <ImageSlot fill radius={radius.tileFace} caption={[...CENTRE_CAPTIONS]} captionSize={[12, 10, 10]} captionTone="faint" />
              ) : null}
            </View>

            {layout.tiles.map((rect) => {
              const tile = board.tiles[rect.index] ?? null;
              const isEmpty = tile === null;
              const eligible = mode !== "select" || highlight.includes(rect.index);
              const pressable = !displayOnly && eligible;

              return (
                <Pressable
                  key={rect.index}
                  testID={`board-tile-${rect.index}`}
                  accessibilityRole="button"
                  accessibilityLabel={tileLabel(rect.index, tile, board)}
                  accessibilityState={{ disabled: !pressable }}
                  accessibilityActions={
                    mode === "build" && !isEmpty
                      ? [
                          { name: "moveToSlot", label: "Move to slot…" },
                          { name: "removeFromBoard", label: "Remove from board" },
                        ]
                      : undefined
                  }
                  onAccessibilityAction={handleAccessibilityAction(rect.index)}
                  onPress={() => handlePress(rect.index, eligible)}
                  onLongPress={pressable && !isEmpty ? () => onTileLongPress?.(rect.index) : undefined}
                  style={[styles.slot, { left: rect.left, top: rect.top, width: rect.size, height: rect.size }]}
                >
                  <TileFace
                    index={rect.index}
                    size={rect.size}
                    name={tile?.name ?? "Empty slot"}
                    groupColour={tile?.groupColour}
                    priceLabel={faceValue(tile)}
                    cornerLabel={tile?.corner}
                    ownerColour={tile?.ownerColour}
                    houses={tile?.houses}
                    hotel={tile?.hotel}
                    highlighted={highlight.includes(rect.index)}
                    empty={isEmpty && mode === "build"}
                    pickedUp={pickedUpIndex === rect.index}
                  />
                </Pressable>
              );
            })}

            {tokens.map((token) => (
              <BoardToken key={token.playerId} token={token} layout={layout} />
            ))}
          </Animated.View>
        </GestureDetector>

        <View style={styles.zoomBar}>
          <ZoomButton icon="ph-minus" label="Zoom out" onPress={() => changeZoom(stepZoom(level, "out", mode))} disabled={locked} />
          <ZoomButton icon="ph-plus" label="Zoom in" onPress={() => changeZoom(stepZoom(level, "in", mode))} disabled={locked} />
          <RNText style={[textStyle({ ...type.value, size: 12 }), styles.percent]}>{`${Math.round(level * 100)}%`}</RNText>
          <Button variant="secondary" size="small" block={false} label="Fit" onPress={() => changeZoom(FIT_ZOOM)} disabled={locked} />
        </View>

        <RNText style={[textStyle({ ...type.bodySm, size: 10 }), styles.panHint]}>{PAN_HINT}</RNText>
      </View>

      {atFitOn40 ? (
        <RNText style={[textStyle({ ...type.bodySm, size: 12 }), styles.warning]}>{FIT_WARNING}</RNText>
      ) : null}
    </View>
  );
}

const TOKEN_SIZE = 14; // 1c §3 #8

/** A token hops one tile at a time (1c §10: 180 ms `ease-in-out`, `motion.boardTokenHop`). */
function BoardToken({ token, layout }: { token: PlayerTokenShape; layout: ReturnType<typeof boardLayout> }) {
  const rect = layout.tiles[token.tileIndex];
  const left = rect ? rect.left + rect.size / 2 - TOKEN_SIZE / 2 : 0;
  const top = rect ? rect.top + rect.size / 2 - TOKEN_SIZE / 2 : 0;
  const position = useRef(new Animated.ValueXY({ x: left, y: top })).current;
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const animation = Animated.timing(position, {
      toValue: { x: left, y: top },
      duration: effectiveDuration(motion.boardTokenHop.durationMs, reducedMotion),
      easing: easingFor(motion.boardTokenHop.easing),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [left, top, position, reducedMotion]);

  if (!rect) {
    return null;
  }
  return (
    <Animated.View
      testID={`board-token-${token.playerId}`}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${token.name} on slot ${token.tileIndex + 1}`}
      style={[
        styles.token,
        token.active ? styles.tokenActive : null,
        { backgroundColor: token.colour, transform: position.getTranslateTransform() },
      ]}
    />
  );
}

/** 2a §3.1 #7: 32×32, radius 11, 1 dp `surface.cardBorder` — with hit slop to the 44 dp minimum. */
function ZoomButton({ icon, label, onPress, disabled }: { icon: string; label: string; onPress: () => void; disabled: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={styles.zoomButton}
    >
      <Icon name={icon} size={15} color={text.secondary} />
    </Pressable>
  );
}

/**
 * docs/12: `"Slot 4, Bay Road, property, ₹1,400, owned by Priya, 2 houses"`, and for an empty slot
 * `"Slot 4, empty, south edge"` (2a §8). The label is the same at every zoom — visual truncation
 * must not reach the reader.
 */
/** A property shows its price; a card space shows its rule count (docs/03 TileFace). */
function faceValue(tile: BoardTileShape | null): string | undefined {
  if (!tile) {
    return undefined;
  }
  if (tile.ruleCount !== undefined) {
    return tile.ruleCount === 1 ? "1 rule" : String(tile.ruleCount) + " rules";
  }
  return tile.cost === undefined ? undefined : formatRupees(tile.cost);
}

function tileLabel(index: number, tile: BoardTileShape | null, board: BoardShape): string {
  const slot = `Slot ${index + 1}`;
  if (!tile) {
    return `${slot}, empty, ${edgeOf(index, board.rows, board.cols)} edge`;
  }
  const parts = [slot, tile.name, tile.kind];
  const value = faceValue(tile);
  if (value !== undefined) {
    parts.push(value);
  }
  if (tile.ownerName) {
    parts.push(`owned by ${tile.ownerName}`);
  }
  if (tile.hotel) {
    parts.push("hotel");
  } else if (tile.houses) {
    parts.push(tile.houses === 1 ? "1 house" : `${tile.houses} houses`);
  }
  return parts.join(", ");
}

const styles = StyleSheet.create({
  // 1c §3 #5 / 2a §3.1 #4: radius 17, surface.inset fill, 1 dp divider border, overflow hidden.
  viewport: {
    borderRadius: radius.card,
    backgroundColor: surface.inset,
    borderWidth: surface.divider.width,
    borderColor: surface.divider.color,
    overflow: "hidden",
  },
  centre: { position: "absolute", alignItems: "center", justifyContent: "center" },
  slot: { position: "absolute" },
  token: {
    position: "absolute",
    width: TOKEN_SIZE,
    height: TOKEN_SIZE,
    borderRadius: TOKEN_SIZE / 2,
    zIndex: 2,
    // 1c §3 #8: `inset 0 -2px 0 rgba(5,15,40,.3)`. RN has no inset shadow, so the same dark edge is
    // drawn as a bottom border.
    borderBottomWidth: player.tokenEdge.width,
    borderBottomColor: player.tokenEdge.color,
  },
  // 1c §5: "a 2dp #FFC84A ring on your token".
  tokenActive: { borderWidth: 2, borderColor: gold.flat },
  // The specs place these bars "bottom-left" and "bottom-right"; the inset is tokens.board
  // (OQ-24 item 4, confirmed).
  zoomBar: { position: "absolute", left: board.barInset, bottom: board.barInset, flexDirection: "row", alignItems: "center", gap: 7 },
  zoomButton: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: surface.cardBorder.width,
    borderColor: surface.cardBorder.color,
  },
  percent: { color: text.primary },
  panHint: { position: "absolute", right: board.barInset, bottom: board.barInset, color: text.faint },
  warning: { marginTop: 8, color: gold.flat },
});
