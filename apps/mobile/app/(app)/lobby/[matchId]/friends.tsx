import { useLocalSearchParams } from "expo-router";

import { memberGuard } from "@/navigation/guards";
import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";
import { Guarded } from "@/navigation/useGuard";
import { useMatchStore } from "@/stores/match";

// docs/screens/3g-*.md · back → /lobby/[matchId] · guard: member
export default function LobbyMatchIdFriendsRoute() {
  const params = useLocalSearchParams<{ matchId?: string }>();
  const match = useMatchStore((state) => state.current);
  return (
    <Guarded result={memberGuard(match, params.matchId ?? "")}>
      <PlaceholderScreen
        opt="3g"
        title="Friends"
        back={{ kind: "route", href: `/lobby/${params.matchId}` }}
      />
    </Guarded>
  );
}
