import { useLocalSearchParams } from "expo-router";

import { ownerGuard } from "@/navigation/guards";
import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";
import { Guarded } from "@/navigation/useGuard";
import { useBuilderStore } from "@/stores/builder";
import { useSessionStore } from "@/stores/session";

// docs/screens/2a5-*.md · back → /create/boards/[boardId]/settings · guard: owner
export default function CreateBoardsBoardIdSizeRoute() {
  const params = useLocalSearchParams<{ boardId?: string }>();
  const session = useSessionStore((state) => state);
  const board = useBuilderStore((state) => state.boards[params.boardId ?? ""]);
  return (
    <Guarded result={ownerGuard(board, session)}>
      <PlaceholderScreen
        opt="2a5"
        title="Board size"
        back={{ kind: "route", href: `/create/boards/${params.boardId}/settings` }}
      />
    </Guarded>
  );
}
