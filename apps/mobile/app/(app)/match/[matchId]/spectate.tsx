import { useLocalSearchParams } from "expo-router";

import { spectatorGuard } from "@/navigation/guards";
import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";
import { Guarded } from "@/navigation/useGuard";
import { useMatchStore } from "@/stores/match";

// docs/screens/1h-*.md · back → /modes · guard: spectator
// docs/04 says /profile/friends or /modes; /profile/friends is not a route — see OQ-13
export default function MatchMatchIdSpectateRoute() {
  const params = useLocalSearchParams<{ matchId?: string }>();
  const match = useMatchStore((state) => state.current);
  return (
    <Guarded result={spectatorGuard(match, params.matchId ?? "")}>
      <PlaceholderScreen
        opt="1h"
        title="Spectating"
        back={{ kind: "route", href: "/modes" }}
      />
    </Guarded>
  );
}
