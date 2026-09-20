
import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";

// docs/screens/3f-*.md · back → /profile
export default function SettingsRoute() {
  return (
    <PlaceholderScreen
      opt="3f"
      title="Settings"
      back={{ kind: "route", href: "/profile" }}
    />
  );
}
