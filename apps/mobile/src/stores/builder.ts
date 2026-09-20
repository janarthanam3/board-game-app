import { create } from "zustand";

/** What the `owner` and `owner + published` guards need to know about a local board. */
export interface LocalBoardFacts {
  boardId: string;
  ownerAccountId: string;
  /** Set once the board has a published version (docs/04 "owner + published"). */
  publishedVersionId: string | null;
}

/** What the `owner` guard needs for a local tile, deck or rule. */
export interface LocalItemFacts {
  id: string;
  ownerAccountId: string;
}

export interface BuilderState {
  /** Local boards by id. SQLite becomes the source of truth in Phase F; this mirrors it. */
  boards: Record<string, LocalBoardFacts>;
  tiles: Record<string, LocalItemFacts>;
  decks: Record<string, LocalItemFacts>;
  rules: Record<string, LocalItemFacts>;
  upsertBoard: (board: LocalBoardFacts) => void;
  removeBoard: (boardId: string) => void;
  upsertItem: (kind: "tiles" | "decks" | "rules", item: LocalItemFacts) => void;
}

export const useBuilderStore = create<BuilderState>((set) => ({
  boards: {},
  tiles: {},
  decks: {},
  rules: {},
  upsertBoard: (board) => set((state) => ({ boards: { ...state.boards, [board.boardId]: board } })),
  removeBoard: (boardId) =>
    set((state) => {
      const { [boardId]: _removed, ...rest } = state.boards;
      return { boards: rest };
    }),
  upsertItem: (kind, item) => set((state) => ({ [kind]: { ...state[kind], [item.id]: item } })),
}));
