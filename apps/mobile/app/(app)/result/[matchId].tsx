import { useLocalSearchParams } from "expo-router";

import { memberGuard } from "@/navigation/guards";
import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";
import { Guarded } from "@/navigation/useGuard";
import { useMatchStore } from "@/stores/match";

// docs/screens/2b-*.md · back → /modes · guard: member
export default function ResultMatchIdRoute() {
  const params = useLocalSearchParams<{ matchId?: string; playerId?: string }>();
  const match = useMatchStore((state) => state.current);
  return (
    <Guarded result={memberGuard(match, params.matchId ?? "")}>
      <PlaceholderScreen
        opt="2b"
        title="Result"
        back={{ kind: "route", href: "/modes" }}
      />
    </Guarded>
  );
}
