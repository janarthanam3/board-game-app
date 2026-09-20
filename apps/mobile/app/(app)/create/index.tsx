
import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";

// docs/screens/1w2-*.md · back → /modes
export default function CreateRoute() {
  return (
    <PlaceholderScreen
      opt="1w2"
      title="Create"
      back={{ kind: "route", href: "/modes" }}
    />
  );
}
