import { Redirect, useLocalSearchParams, useRouter } from "expo-router";

import { memberGuard } from "@/navigation/guards";
import { Guarded } from "@/navigation/useGuard";
import { MatchHud } from "@/screens/match";
import type { HoldingsSort } from "@/screens/match";
import type { HoldingsView } from "@/screens/match";
import { useMatchStore } from "@/stores/match";

// docs/screens/1c-play-hud.md · back is screen-defined (the pause sheet) · guard: member
// (bankrupt players go to /out). The HUD renders; the turn loop that sends its actions is E3.
export default function MatchMatchIdRoute() {
  const params = useLocalSearchParams<{ matchId?: string }>();
  const router = useRouter();
  const match = useMatchStore((state) => state.current);
  const snapshot = useMatchStore((state) => state.snapshot);
  const holdingsView = useMatchStore((state) => state.holdingsView);
  const holdingsSort = useMatchStore((state) => state.holdingsSort);
  const setHoldingsView = useMatchStore((state) => state.setHoldingsView);
  const setHoldingsSort = useMatchStore((state) => state.setHoldingsSort);

  const matchId = params.matchId ?? "";
  const result = memberGuard(match, matchId);
  // 1g: an eliminated player is sent to /out automatically (docs/04 "bankrupt" guard).
  if (result.allow && match?.eliminated) {
    return <Redirect href={`/match/${matchId}/out`} />;
  }

  const view: HoldingsView = holdingsView[matchId] ?? "cards";
  const sort: HoldingsSort = holdingsSort[matchId] ?? "colour";

  return (
    <Guarded result={result}>
      <MatchHud
        state={snapshot?.state ?? null}
        matchName={snapshot?.name ?? ""}
        boardName={snapshot?.state.board.name ?? ""}
        viewerId={match?.me ?? null}
        local={match?.local ?? false}
        view={view}
        sort={sort}
        onViewChange={(next) => setHoldingsView(matchId, next)}
        onSortChange={(next) => setHoldingsSort(matchId, next)}
        // E3 owns the turn loop: it turns the intent into a match:action, applies it optimistically
        // and rolls back on a rejection (1c §6, docs/flows/turn.md).
        onPrimaryAction={() => undefined}
        onOpenTile={(tileIndex) => router.push(`/match/${matchId}/property/${tileIndex}`)}
        onOpenRules={() => router.push(`/lobby/${matchId}/rules`)}
        onOpenSettings={() => router.push("/settings")}
        // 3i §7: a confirmed leave emits match:leave, which is socket work (E3/H1).
        onLeaveMatch={() => undefined}
      />
    </Guarded>
  );
}
