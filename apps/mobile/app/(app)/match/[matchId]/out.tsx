import { useLocalSearchParams } from "expo-router";

import { bankruptGuard } from "@/navigation/guards";
import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";
import { Guarded } from "@/navigation/useGuard";
import { useMatchStore } from "@/stores/match";

// docs/screens/1g-*.md · back is blocked · guard: bankrupt
export default function MatchMatchIdOutRoute() {
  const params = useLocalSearchParams<{ matchId?: string }>();
  const match = useMatchStore((state) => state.current);
  return (
    <Guarded result={bankruptGuard(match, params.matchId ?? "")}>
      <PlaceholderScreen
        opt="1g"
        title="Out of the match"
        back={{ kind: "blocked" }}
      />
    </Guarded>
  );
}
