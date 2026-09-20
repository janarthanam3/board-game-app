
import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";

// docs/screens/3p-*.md · back → /settings
export default function SettingsPrivacyRoute() {
  return (
    <PlaceholderScreen
      opt="3p"
      title="Privacy"
      back={{ kind: "route", href: "/settings" }}
    />
  );
}
