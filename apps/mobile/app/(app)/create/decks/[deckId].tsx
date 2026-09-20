import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";

// docs/screens/1y-*.md · back → /create/decks
// confirm-on-back with unsaved changes belongs to the 1y screen
export default function CreateDecksDeckIdRoute() {
  return (
    <PlaceholderScreen
      opt="1y"
      title="Deck"
      back={{ kind: "route", href: "/create/decks" }}
    />
  );
}
