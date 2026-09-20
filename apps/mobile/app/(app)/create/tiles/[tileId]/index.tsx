import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";

// docs/screens/1x-*.md · back → /create/tiles
// confirm-on-back with unsaved changes belongs to the 1x screen
export default function CreateTilesTileIdRoute() {
  return (
    <PlaceholderScreen
      opt="1x"
      title="Tile"
      back={{ kind: "route", href: "/create/tiles" }}
    />
  );
}
