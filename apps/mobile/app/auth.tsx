import { useLocalSearchParams, useRouter } from "expo-router";
import { BackHandler } from "react-native";

import { unauthenticatedOnlyGuard } from "@/navigation/guards";
import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";
import { Guarded } from "@/navigation/useGuard";
import { useSessionStore } from "@/stores/session";

// docs/screens/1a-*.md · back is screen-defined
export default function AuthRoute() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const router = useRouter();
  const session = useSessionStore((state) => state);
  return (
    <Guarded result={unauthenticatedOnlyGuard(session)}>
    <PlaceholderScreen
      opt="1a"
      title="Sign in"
      back={{
      kind: "custom",
      handle: () => {
        // 1a: back from signin returns to landing; from landing it exits the app.
        if (params.mode === "signin") {
          router.setParams({ mode: "landing" });
          return true;
        }
        BackHandler.exitApp();
        return true;
      },
    }}
    />
    </Guarded>
  );
}
