
import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";

// docs/screens/1y-*.md · back → /create
export default function CreateDecksRoute() {
  return (
    <PlaceholderScreen
      opt="1y"
      title="Card decks"
      back={{ kind: "route", href: "/create" }}
    />
  );
}
