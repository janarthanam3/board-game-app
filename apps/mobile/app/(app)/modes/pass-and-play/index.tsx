
import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";

// docs/screens/3c3-*.md · back → /modes
export default function ModesPassAndPlayRoute() {
  return (
    <PlaceholderScreen
      opt="3c3"
      title="Pass and play"
      back={{ kind: "route", href: "/modes" }}
    />
  );
}
