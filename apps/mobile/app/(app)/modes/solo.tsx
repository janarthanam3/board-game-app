
import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";

// docs/screens/3c2-*.md · back → /modes
export default function ModesSoloRoute() {
  return (
    <PlaceholderScreen
      opt="3c2"
      title="Solo vs AI"
      back={{ kind: "route", href: "/modes" }}
    />
  );
}
