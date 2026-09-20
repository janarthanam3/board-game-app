import { Redirect, useLocalSearchParams } from "expo-router";

import { memberGuard } from "@/navigation/guards";
import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";
import { Guarded } from "@/navigation/useGuard";
import { useMatchStore } from "@/stores/match";

// docs/screens/1c-*.md · back is screen-defined · guard: member (bankrupt players go to /out)
export default function MatchMatchIdRoute() {
  const params = useLocalSearchParams<{ matchId?: string }>();
  const match = useMatchStore((state) => state.current);
  const matchId = params.matchId ?? "";
  const result = memberGuard(match, matchId);
  // 1g: an eliminated player is sent to /out automatically (docs/04 "bankrupt" guard).
  if (result.allow && match?.eliminated) {
    return <Redirect href={`/match/${matchId}/out`} />;
  }
  return (
    <Guarded result={result}>
      <PlaceholderScreen
        opt="1c"
        title="Match"
        back={{
        kind: "custom",
        handle: () => {
          // 1c: back opens the pause sheet (3i) and never leaves the match. Consumed until E1 wires it.
          return true;
        },
      }}
      />
    </Guarded>
  );
}
