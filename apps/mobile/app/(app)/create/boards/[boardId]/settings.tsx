import { useLocalSearchParams } from "expo-router";

import { ownerGuard } from "@/navigation/guards";
import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";
import { Guarded } from "@/navigation/useGuard";
import { useBuilderStore } from "@/stores/builder";
import { useSessionStore } from "@/stores/session";

// docs/screens/2a-*.md · back → /create/boards/[boardId] · guard: owner
export default function CreateBoardsBoardIdSettingsRoute() {
  const params = useLocalSearchParams<{ boardId?: string }>();
  const session = useSessionStore((state) => state);
  const board = useBuilderStore((state) => state.boards[params.boardId ?? ""]);
  return (
    <Guarded result={ownerGuard(board, session)}>
      <PlaceholderScreen
        opt="2a"
        title="Board settings"
        back={{ kind: "route", href: `/create/boards/${params.boardId}` }}
      />
    </Guarded>
  );
}
