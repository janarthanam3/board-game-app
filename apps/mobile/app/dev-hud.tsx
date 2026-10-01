import { useLocalSearchParams, Redirect } from "expo-router";
import { useRef } from "react";

import { MatchHud } from "@/screens/match";
import { midgame } from "@/screens/match/testFixtures";
import { useMatchStore } from "@/stores/match";

/**
 * Dev-only preview of `1c` the play HUD and, through its Menu button, `3i` the pause sheet.
 *
 * Why it exists: both screens sit behind the `member` guard, which reads the match store, and
 * nothing fills that store yet — the lobby and the socket are **E3**, and the splash and auth
 * screens are still B4 placeholders. So neither screen can be reached by tapping through the app,
 * and the two facts E1a could not verify (whether the sheet's scroller has a height, and whether
 * the tablet dialog shape is right) need a device to see. This route is how you look at them.
 *
 * It is not in `docs/04-navigation-map.md`, like `/gallery`, and `routeTable.test.ts` lists both as
 * the two deliberate extras. `EXPO_PUBLIC_ENV` gates it, so it is unreachable in a release build.
 *
 * It renders the real `MatchHud` over the engine's committed `midgame-4p` fixture rather than going
 * through `/match/[matchId]`, which would also need a signed-in session. The HUD's own callbacks are
 * no-ops: E3 owns what a press actually does.
 *
 *   /dev-hud              an online match, 24s left on the clock — `Turn timer running · 24s left`
 *   /dev-hud?local=1      pass-and-play, so the clock is held — `Turn timer held · 24s left`
 *   /dev-hud?seconds=8    inside ten seconds, so the line turns danger
 *   /dev-hud?seconds=     no count at all, so no status line (E6 supplies it)
 */
export default function DevHudRoute() {
  const params = useLocalSearchParams<{ local?: string; seconds?: string }>();
  const setMatch = useMatchStore((state) => state.setMatch);
  const seeded = useRef(false);

  const state = midgame();
  const viewerId = state.seatOrder[0] ?? null;
  const local = params.local === "1";

  // The HUD reads the holdings view and sort from the store, so the store has to know the match.
  // Seeded once, synchronously, before the first render — the facts are the ones the guards want.
  if (!seeded.current) {
    seeded.current = true;
    setMatch({
      matchId: state.id,
      players: state.seatOrder,
      me: viewerId,
      turnPlayerId: state.turn.playerId,
      modalLock: false,
      auctionLive: false,
      owesMoreThanCash: false,
      eliminated: false,
      spectator: false,
      local,
    });
  }

  if (process.env["EXPO_PUBLIC_ENV"] !== "development") {
    return <Redirect href="/modes" />;
  }

  return (
    <MatchHud
      state={state}
      matchName="Friday Night"
      boardName={state.board.name}
      viewerId={viewerId}
      local={local}
      view="cards"
      sort="colour"
      secondsLeft={secondsFrom(params.seconds)}
      onViewChange={noop}
      onSortChange={noop}
      onPrimaryAction={noop}
      onOpenTile={noop}
      onOpenRules={noop}
      onOpenSettings={noop}
      onLeaveMatch={noop}
    />
  );
}

/** `?seconds=8` sets the clock; `?seconds=` (empty) means none, which hides the status line. */
function secondsFrom(raw: string | undefined): number | null {
  if (raw === undefined) {
    return 24;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function noop(): void {
  // E3 owns every action this screen can report; a preview only has to render.
}
