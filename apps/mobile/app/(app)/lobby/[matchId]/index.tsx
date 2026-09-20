import { useLocalSearchParams } from "expo-router";

import { memberGuard } from "@/navigation/guards";
import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";
import { Guarded } from "@/navigation/useGuard";
import { useMatchStore } from "@/stores/match";

// docs/screens/1b-*.md · back is screen-defined · guard: member
export default function LobbyMatchIdRoute() {
  const params = useLocalSearchParams<{ matchId?: string }>();
  const match = useMatchStore((state) => state.current);
  return (
    <Guarded result={memberGuard(match, params.matchId ?? "")}>
      <PlaceholderScreen
        opt="1b"
        title="Lobby"
        back={{
        kind: "custom",
        handle: () => {
          // 1b: back opens the leave-match dialog (3j); the lobby screen wires it. Consumed until then.
          return true;
        },
      }}
      />
    </Guarded>
  );
}
