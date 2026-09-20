import { useLocalSearchParams } from "expo-router";

import { memberGuard } from "@/navigation/guards";
import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";
import { Guarded } from "@/navigation/useGuard";
import { useMatchStore } from "@/stores/match";

// docs/screens/1j-*.md · back → /match/[matchId] · guard: member
export default function MatchMatchIdPropertyTileIndexRoute() {
  const params = useLocalSearchParams<{ matchId?: string; tileIndex?: string }>();
  const match = useMatchStore((state) => state.current);
  return (
    <Guarded result={memberGuard(match, params.matchId ?? "")}>
      <PlaceholderScreen
        opt="1j"
        title="Property"
        back={{ kind: "route", href: `/match/${params.matchId}` }}
      />
    </Guarded>
  );
}
