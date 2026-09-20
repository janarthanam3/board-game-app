import { useLocalSearchParams } from "expo-router";

import { itemOwnerGuard } from "@/navigation/guards";
import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";
import { Guarded } from "@/navigation/useGuard";
import { useBuilderStore } from "@/stores/builder";
import { useSessionStore } from "@/stores/session";

// docs/screens/1x-*.md · back → /create/tiles · guard: owner (tileId or new)
// confirm-on-back with unsaved changes belongs to the 1x screen
export default function CreateTilesTileIdRoute() {
  const params = useLocalSearchParams<{ tileId?: string }>();
  const session = useSessionStore((state) => state);
  const tile = useBuilderStore((state) => state.tiles[params.tileId ?? ""]);
  return (
    <Guarded result={itemOwnerGuard(tile, params.tileId ?? "", session, "/create/tiles")}>
      <PlaceholderScreen opt="1x" title="Tile" back={{ kind: "route", href: "/create/tiles" }} />
    </Guarded>
  );
}
