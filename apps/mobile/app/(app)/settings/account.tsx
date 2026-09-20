
import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";

// docs/screens/3o-*.md · back → /settings
export default function SettingsAccountRoute() {
  return (
    <PlaceholderScreen
      opt="3o"
      title="Account"
      back={{ kind: "route", href: "/settings" }}
    />
  );
}
