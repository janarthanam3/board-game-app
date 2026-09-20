import { useLocalSearchParams } from "expo-router";

import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";

// docs/screens/1x-*.md · back → /create/tiles/[tileId]
export default function CreateTilesTileIdArtRoute() {
  const params = useLocalSearchParams<{ tileId?: string }>();
  return (
    <PlaceholderScreen
      opt="1x"
      title="Tile art"
      back={{ kind: "route", href: `/create/tiles/${params.tileId}` }}
    />
  );
}
