import { useLocalSearchParams } from "expo-router";

import { memberGuard } from "@/navigation/guards";
import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";
import { Guarded } from "@/navigation/useGuard";
import { useMatchStore } from "@/stores/match";

// docs/screens/3m-*.md · back → /match/[matchId] · guard: member
// 3m: back goes to the pause sheet; the match screen reopens it
export default function MatchMatchIdHowToPlayRoute() {
  const params = useLocalSearchParams<{ matchId?: string }>();
  const match = useMatchStore((state) => state.current);
  return (
    <Guarded result={memberGuard(match, params.matchId ?? "")}>
      <PlaceholderScreen
        opt="3m"
        title="How to play"
        back={{ kind: "route", href: `/match/${params.matchId}` }}
      />
    </Guarded>
  );
}
