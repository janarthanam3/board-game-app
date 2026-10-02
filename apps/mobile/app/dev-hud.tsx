import { useLocalSearchParams, Redirect } from "expo-router";
import { useRef, useState } from "react";

import { createLocalAuthority, playLocally } from "@/match/localMatch";
import { actionsForIntent, startLoop, visibleState } from "@/match/turn";
import { MatchHud } from "@/screens/match";
import type { PrimaryActionModel } from "@/screens/match";
import { midgame } from "@/screens/match/testFixtures";
import { useMatchStore } from "@/stores/match";

/**
 * Dev-only preview of `1c` the play HUD, `3i` the pause sheet, and — since E3 — a **playable** local
 * match: the real turn loop over a local authority, so the primary action really rolls, really buys and
 * really ends the turn.
 *
 * Why it exists: both screens sit behind the `member` guard, which reads the match store, and nothing
 * fills that store yet — the lobby and the socket are **E3**'s remainder, and the splash and auth
 * screens are still B4 placeholders. So neither screen can be reached by tapping through the app, and
 * the facts no test can reach — the sheet's scroller, the tablet dialog shape, the board's pinch and
 * pan, a token animating between tiles — need a device to see.
 *
 * It is not in `docs/04-navigation-map.md`, like `/gallery`, and `routeTable.test.ts` lists both as the
 * two deliberate extras. `EXPO_PUBLIC_ENV` gates it, so it is unreachable in a release build.
 *
 *   /dev-hud              an online-style match, 24s left on the clock
 *   /dev-hud?local=1      pass-and-play, so the pause sheet's clock reads held
 *   /dev-hud?seconds=8    inside ten seconds, so the status line turns danger
 *   /dev-hud?seconds=     no count at all, so no status line (E6 supplies it)
 */
export default function DevHudRoute() {
  const params = useLocalSearchParams<{ local?: string; seconds?: string }>();
  const setMatch = useMatchStore((state) => state.setMatch);
  const seeded = useRef(false);

  // The authority is this device: the same engine the server runs, with no socket (E3's local driver).
  const authority = useRef(createLocalAuthority(midgame())).current;
  const [loop, setLoop] = useState(() => startLoop(authority.snapshot().state, authority.snapshot().seq));
  const state = visibleState(loop);
  const viewerId = state.seatOrder[0] ?? null;
  const local = params.local === "1";

  // The HUD reads the holdings view and sort from the store, so the store has to know the match.
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

  // The turn loop, driven for real: intents become actions, the authority answers, the loop re-derives.
  function onPrimaryAction(action: PrimaryActionModel): void {
    const actions = actionsForIntent(action.intent, visibleState(loop), viewerId, Date.now());
    setLoop((current) => playLocally(current, authority, actions));
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
      moving={loop.awaitingRandom}
      onViewChange={noop}
      onSortChange={noop}
      onPrimaryAction={onPrimaryAction}
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
  // The screens these would open are E4's and E5's; the preview only drives the turn.
}
