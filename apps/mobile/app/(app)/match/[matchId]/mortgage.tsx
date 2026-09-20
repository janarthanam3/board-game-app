import { useLocalSearchParams } from "expo-router";

import { memberGuard } from "@/navigation/guards";
import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";
import { Guarded } from "@/navigation/useGuard";
import { useMatchStore } from "@/stores/match";

// docs/screens/1q-*.md · back → /match/[matchId]/actions · guard: member
export default function MatchMatchIdMortgageRoute() {
  const params = useLocalSearchParams<{ matchId?: string }>();
  const match = useMatchStore((state) => state.current);
  return (
    <Guarded result={memberGuard(match, params.matchId ?? "")}>
      <PlaceholderScreen
        opt="1q"
        title="Mortgage"
        back={{ kind: "route", href: `/match/${params.matchId}/actions` }}
      />
    </Guarded>
  );
}
