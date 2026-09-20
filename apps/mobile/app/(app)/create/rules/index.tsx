
import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";

// docs/screens/1z-*.md · back → /create
export default function CreateRulesRoute() {
  return (
    <PlaceholderScreen
      opt="1z"
      title="Rules"
      back={{ kind: "route", href: "/create" }}
    />
  );
}
