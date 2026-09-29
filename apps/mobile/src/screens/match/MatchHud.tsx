// 1c · Play — the match HUD (docs/screens/1c-play-hud.md).
//
// Region order is the whole point of this screen: header, board, player strip, cash row, holdings
// (§2, §11 AC1 — "board first, always"). The holdings region is the only scroller (AC8), so the
// board can never scroll off the top.
//
// This component renders and reports; it commits nothing. The primary action, a tile tap and a leave
// all call back out, and the turn loop (E3) is what talks to the server.

import type { MatchState, PlayerId } from "@royal-navy/game-engine";
import { netWorth } from "@royal-navy/game-engine";
import { formatRupees, radius, responsive } from "@royal-navy/shared";
import { useCallback, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";

import { Screen } from "../../components/Screen";
import { ScreenHeader } from "../../components/ScreenHeader";
import { Skeleton } from "../../components/Skeleton";
import { useDocumentedBack } from "../../navigation/backBehaviour";
import { BoardMap, FIT_ZOOM } from "../../ui/board";
import { boardShape, boardViewport, playerTokens } from "./boardShape";
import { CashRow } from "./CashRow";
import { Holdings, type HoldingsView } from "./Holdings";
import {
  hudHeader,
  type HoldingsSort,
  holdings as holdingsOf,
  nextSort,
  playerChips,
  primaryAction,
  type PrimaryActionModel,
  turnLine,
} from "./hudModel";
import { PauseSheet } from "./PauseSheet";
import { CHIP_MIN_HEIGHT, CHIP_MIN_HEIGHT_LARGE_TEXT, LARGE_TEXT_SCALE, PlayerStrip } from "./PlayerStrip";

/** §2: "Frame 360 × 780, padding 17, flex-column, gap 13." Screen supplies the padding. */
const REGION_GAP = 13;
/** §3 #4: the Menu button, `ph-list`, labelled `Menu`. */
const MENU_ICON = "ph-list";
export const MENU_LABEL = "Menu";
/** §5, animating a move: the primary action shows `OK` disabled. */
const MOVING_ACTION: PrimaryActionModel = { label: "OK", enabled: false, intent: "none" };

export interface MatchHudProps {
  /** Null until the first snapshot arrives — §5's loading state. */
  state: MatchState | null;
  matchName: string;
  boardName: string;
  viewerId: PlayerId | null;
  /** Pass-and-play or solo: the leave dialog says the match is saved (3i §6). */
  local: boolean;
  /** The Cards/List choice and the sort, held per match by the caller (§6). */
  view: HoldingsView;
  sort: HoldingsSort;
  /** True while a token animation runs: the board locks and the action goes to `OK` (§5). */
  moving?: boolean;
  onViewChange: (view: HoldingsView) => void;
  onSortChange: (sort: HoldingsSort) => void;
  onPrimaryAction: (action: PrimaryActionModel) => void;
  /** §6: a board tile or a holdings card opens the property card (`1j`). */
  onOpenTile: (tileIndex: number) => void;
  /** §6: a player chip opens that player's public summary — undrawn, OQ-49 item 4. */
  onOpenPlayer?: (playerId: string) => void;
  /** §6: a long press opens `3q`, which G3 owns. */
  onLongPressPlayer?: (playerId: string) => void;
  onOpenRules: () => void;
  onOpenSettings: () => void;
  onLeaveMatch: () => void;
}

export function MatchHud({
  state,
  matchName,
  boardName,
  viewerId,
  local,
  view,
  sort,
  moving = false,
  onViewChange,
  onSortChange,
  onPrimaryAction,
  onOpenTile,
  onOpenPlayer,
  onLongPressPlayer,
  onOpenRules,
  onOpenSettings,
  onLeaveMatch,
}: MatchHudProps) {
  const { width, height, fontScale } = useWindowDimensions();
  const [pauseOpen, setPauseOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [expandedTileIndex, setExpandedTileIndex] = useState<number | null>(null);
  const [zoom, setZoom] = useState(FIT_ZOOM);

  // §8: tablet and landscape both split board left / strip and holdings right.
  const split = width >= responsive.tabletMinWidth || width > height;
  const viewport = boardViewport(width, split);

  // §6 and AC9: Android back opens the pause sheet and never leaves the match. With an overlay up it
  // dismisses the topmost one instead (docs/04 "Overlays": "Android back dismisses the topmost").
  const handleBack = useCallback(() => {
    if (leaveOpen) {
      setLeaveOpen(false);
      return true;
    }
    if (pauseOpen) {
      setPauseOpen(false);
      return true;
    }
    setPauseOpen(true);
    return true;
  }, [leaveOpen, pauseOpen]);
  useDocumentedBack({ kind: "custom", handle: handleBack });

  const header = state ? hudHeader(state, matchName) : { title: matchName, meta: "" };
  const action = state ? (moving ? MOVING_ACTION : primaryAction(state, viewerId)) : MOVING_ACTION;
  const holdings = state ? holdingsOf(state, viewerId, sort) : [];

  return (
    <Screen>
      <View testID="hud" style={styles.column}>
        <ScreenHeader
          title={header.title}
          subtitle={header.meta}
          titleSize={19}
          actions={[{ icon: MENU_ICON, label: MENU_LABEL, onPress: () => setPauseOpen(true) }]}
        />

        <View style={split ? styles.split : styles.stack}>
          {/* Board first, always (AC1). */}
          <View style={split ? styles.boardColumn : undefined}>
            {state ? (
              <BoardMap
                board={boardShape(state)}
                tokens={playerTokens(state, viewerId)}
                viewport={viewport}
                zoom={zoom}
                mode="play"
                locked={moving}
                onZoomChange={setZoom}
                onTilePress={onOpenTile}
              />
            ) : (
              <Skeleton testID="board-skeleton" width={viewport} height={viewport} borderRadius={radius.card} />
            )}
          </View>

          <View style={split ? styles.sideColumn : styles.stack}>
            {state ? (
              <PlayerStrip
                players={playerChips(state, viewerId)}
                turnLine={turnLine(state)}
                onPlayerPress={(playerId) => onOpenPlayer?.(playerId)}
                {...(onLongPressPlayer ? { onPlayerLongPress: onLongPressPlayer } : {})}
                vertical={split}
              />
            ) : (
              <Skeleton testID="player-strip-skeleton" width="100%" height={stripSkeletonHeight(fontScale)} borderRadius={radius.field} />
            )}

            <CashRow
              cash={formatRupees(viewerId && state ? (state.players[viewerId]?.cash ?? 0) : 0)}
              netWorth={formatRupees(viewerId && state ? netWorth(state, viewerId) : 0)}
              action={action}
              onPress={() => onPrimaryAction(action)}
            />

            <Holdings
              holdings={holdings}
              view={view}
              sort={sort}
              loading={state === null}
              expandedTileIndex={expandedTileIndex}
              onViewChange={onViewChange}
              onSortPress={() => onSortChange(nextSort(sort))}
              onRowPress={(tileIndex) =>
                setExpandedTileIndex((current) => (current === tileIndex ? null : tileIndex))
              }
            />
          </View>
        </View>
      </View>

      <PauseSheet
        visible={pauseOpen}
        boardName={boardName}
        local={local}
        turnTimerSeconds={state === null ? undefined : state.rules.rounds.turnTimerSeconds}
        onDismiss={() => setPauseOpen(false)}
        onOpenRules={onOpenRules}
        onOpenSettings={onOpenSettings}
        onLeaveMatch={onLeaveMatch}
        leaveDialogOpen={leaveOpen}
        onLeavePress={() => setLeaveOpen(true)}
        onLeaveDismiss={() => setLeaveOpen(false)}
      />
    </Screen>
  );
}

/** The strip's skeleton stands in for one row of chips, at the height they will be (§8). */
function stripSkeletonHeight(fontScale: number): number {
  return fontScale >= LARGE_TEXT_SCALE ? CHIP_MIN_HEIGHT_LARGE_TEXT : CHIP_MIN_HEIGHT;
}

const styles = StyleSheet.create({
  column: { flex: 1, minHeight: 0, gap: REGION_GAP },
  stack: { flex: 1, minHeight: 0, gap: REGION_GAP },
  split: { flex: 1, minHeight: 0, flexDirection: "row", gap: REGION_GAP },
  boardColumn: { flexGrow: 0 },
  sideColumn: { flex: 1, minHeight: 0, gap: REGION_GAP },
});

