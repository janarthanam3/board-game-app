import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";

// docs/screens/1x-*.md · back → /create
export default function CreateTilesRoute() {
  return (
    <PlaceholderScreen
      opt="1x"
      title="Tiles"
      back={{ kind: "route", href: "/create" }}
    />
  );
}
