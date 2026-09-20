import { create } from "zustand";

/** What the `owner` and `owner + published` guards need to know about a local board. */
export interface LocalBoardFacts {
  boardId: string;
  ownerAccountId: string;
  /** Set once the board has a published version (docs/04 "owner + published"). */
  publishedVersionId: string | null;
}

export interface BuilderState {
  /** Local boards by id. SQLite becomes the source of truth in Phase F; this mirrors it. */
  boards: Record<string, LocalBoardFacts>;
  upsertBoard: (board: LocalBoardFacts) => void;
  removeBoard: (boardId: string) => void;
}

export const useBuilderStore = create<BuilderState>((set) => ({
  boards: {},
  upsertBoard: (board) => set((state) => ({ boards: { ...state.boards, [board.boardId]: board } })),
  removeBoard: (boardId) =>
    set((state) => {
      const { [boardId]: _removed, ...rest } = state.boards;
      return { boards: rest };
    }),
}));
