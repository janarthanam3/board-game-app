import { useLocalSearchParams } from "expo-router";

import { ownerPublishedGuard } from "@/navigation/guards";
import { PlaceholderScreen } from "@/navigation/PlaceholderScreen";
import { Guarded } from "@/navigation/useGuard";
import { useBuilderStore } from "@/stores/builder";
import { useSessionStore } from "@/stores/session";

// docs/screens/3u-*.md · back → /create/boards/[boardId] · guard: ownerPublished
export default function CreateBoardsBoardIdAnalyticsRoute() {
  const params = useLocalSearchParams<{ boardId?: string }>();
  const session = useSessionStore((state) => state);
  const board = useBuilderStore((state) => state.boards[params.boardId ?? ""]);
  return (
    <Guarded result={ownerPublishedGuard(board, session)}>
      <PlaceholderScreen
        opt="3u"
        title="Board analytics"
        back={{ kind: "route", href: `/create/boards/${params.boardId}` }}
      />
    </Guarded>
  );
}
