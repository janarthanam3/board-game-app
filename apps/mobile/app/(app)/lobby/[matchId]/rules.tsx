import { useLocalSearchParams } from "expo-router";

import { memberGuard } from "@/navigation/guards";
import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";
import { Guarded } from "@/navigation/useGuard";
import { useMatchStore } from "@/stores/match";

// docs/screens/3l-*.md · back → /lobby/[matchId] · guard: member
export default function LobbyMatchIdRulesRoute() {
  const params = useLocalSearchParams<{ matchId?: string }>();
  const match = useMatchStore((state) => state.current);
  return (
    <Guarded result={memberGuard(match, params.matchId ?? "")}>
      <PlaceholderScreen
        opt="3l"
        title="Rules"
        back={{ kind: "route", href: `/lobby/${params.matchId}` }}
      />
    </Guarded>
  );
}
