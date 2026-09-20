import { useLocalSearchParams, useRouter } from "expo-router";

import { memberGuard } from "@/navigation/guards";
import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";
import { Guarded } from "@/navigation/useGuard";
import { useMatchStore } from "@/stores/match";

// docs/screens/2c-*.md · back is screen-defined · guard: member
export default function MatchMatchIdLogRoute() {
  const params = useLocalSearchParams<{ matchId?: string; filter?: string }>();
  const router = useRouter();
  const match = useMatchStore((state) => state.current);
  return (
    <Guarded result={memberGuard(match, params.matchId ?? "")}>
      <PlaceholderScreen
        opt="2c"
        title="Match log"
        back={{
        kind: "custom",
        handle: () => {
          // 2c: back returns to the caller.
          if (router.canGoBack()) {
            router.back();
          } else {
            router.navigate(`/match/${params.matchId}`);
          }
          return true;
        },
      }}
      />
    </Guarded>
  );
}
