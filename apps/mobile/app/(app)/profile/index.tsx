
import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";

// docs/screens/3e-*.md · back → /modes
export default function ProfileRoute() {
  return (
    <PlaceholderScreen
      opt="3e"
      title="Profile"
      back={{ kind: "route", href: "/modes" }}
    />
  );
}
