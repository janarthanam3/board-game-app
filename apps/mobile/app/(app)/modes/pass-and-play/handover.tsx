import { useLocalSearchParams } from "expo-router";

import { localMatchGuard } from "@/navigation/guards";
import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";
import { Guarded } from "@/navigation/useGuard";
import { useMatchStore } from "@/stores/match";

// docs/screens/3c3-*.md · back is blocked · guard: localMatch
export default function ModesPassAndPlayHandoverRoute() {
  const params = useLocalSearchParams<{ matchId?: string; playerId?: string }>();
  const match = useMatchStore((state) => state.current);
  return (
    <Guarded result={localMatchGuard(match, params.matchId ?? "")}>
      <PlaceholderScreen
        opt="3c3"
        title="Handover"
        back={{ kind: "blocked" }}
      />
    </Guarded>
  );
}
