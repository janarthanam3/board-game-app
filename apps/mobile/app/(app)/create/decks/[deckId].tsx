import { useLocalSearchParams } from "expo-router";

import { itemOwnerGuard } from "@/navigation/guards";
import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";
import { Guarded } from "@/navigation/useGuard";
import { useBuilderStore } from "@/stores/builder";
import { useSessionStore } from "@/stores/session";

// docs/screens/1y-*.md · back → /create/decks · guard: owner (deckId or new)
// confirm-on-back with unsaved changes belongs to the 1y screen
export default function CreateDecksDeckIdRoute() {
  const params = useLocalSearchParams<{ deckId?: string }>();
  const session = useSessionStore((state) => state);
  const deck = useBuilderStore((state) => state.decks[params.deckId ?? ""]);
  return (
    <Guarded result={itemOwnerGuard(deck, params.deckId ?? "", session, "/create/decks")}>
      <PlaceholderScreen opt="1y" title="Deck" back={{ kind: "route", href: "/create/decks" }} />
    </Guarded>
  );
}
