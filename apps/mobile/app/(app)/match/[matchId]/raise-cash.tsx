import { useLocalSearchParams } from "expo-router";

import { owesGuard } from "@/navigation/guards";
import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";
import { Guarded } from "@/navigation/useGuard";
import { useMatchStore } from "@/stores/match";

// docs/screens/1d-*.md · back is blocked · guard: owes
export default function MatchMatchIdRaiseCashRoute() {
  const params = useLocalSearchParams<{ matchId?: string; route?: string; debtId?: string }>();
  const match = useMatchStore((state) => state.current);
  return (
    <Guarded result={owesGuard(match, params.matchId ?? "")}>
      <PlaceholderScreen
        opt="1d"
        title="Raise cash"
        back={{ kind: "blocked" }}
      />
    </Guarded>
  );
}
