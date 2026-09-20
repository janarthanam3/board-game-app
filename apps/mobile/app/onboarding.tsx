import { firstRunGuard } from "@/navigation/guards";
import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";
import { Guarded } from "@/navigation/useGuard";
import { useSessionStore } from "@/stores/session";

// docs/screens/3b-*.md · back exits the app · guard: first run only
// 3b: slides 2–3 act as Back once the carousel exists
export default function OnboardingRoute() {
  const session = useSessionStore((state) => state);
  return (
    <Guarded result={firstRunGuard(session)}>
      <PlaceholderScreen opt="3b" title="Welcome" back={{ kind: "exit" }} />
    </Guarded>
  );
}
