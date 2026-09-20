
import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";

// docs/screens/3h-*.md · back → /profile
export default function ProfileHistoryRoute() {
  return (
    <PlaceholderScreen
      opt="3h"
      title="Match history"
      back={{ kind: "route", href: "/profile" }}
    />
  );
}
