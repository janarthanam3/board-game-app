import { useLocalSearchParams } from "expo-router";

import { memberGuard } from "@/navigation/guards";
import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";
import { Guarded } from "@/navigation/useGuard";
import { useMatchStore } from "@/stores/match";

// docs/screens/1u-*.md · back → /match/[matchId]/actions · guard: member
export default function MatchMatchIdBuildRoute() {
  const params = useLocalSearchParams<{ matchId?: string }>();
  const match = useMatchStore((state) => state.current);
  return (
    <Guarded result={memberGuard(match, params.matchId ?? "")}>
      <PlaceholderScreen
        opt="1u"
        title="Build"
        back={{ kind: "route", href: `/match/${params.matchId}/actions` }}
      />
    </Guarded>
  );
}
