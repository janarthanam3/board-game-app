// Publish-time board checks that the reducer cannot make at match time, because a published
// version is frozen (D5) and must already be playable.
//
// Today this holds one check: OQ-19 item 6, answered — a MOVE block may not send a token to a card
// space. Such a rule draws again on arrival, and a rule pointing at its own space would loop for
// ever. Banning it here is the answer the design chose over a runtime cap; reducer/cards.ts keeps
// MAX_CARD_CHAIN as a backstop for boards published before this check existed.

import type { FrozenBoard } from "./state";

export interface PublishIssue {
  code: "E_MOVE_TARGETS_CARD_SPACE";
  deckId: string;
  ruleId: string;
  tileIndex: number;
  message: string;
}

/**
 * Every MOVE block on the board's decks whose `toTile` target is a card space. An empty list means
 * the board's move rules are publishable.
 */
export function checkMoveTargets(board: FrozenBoard): PublishIssue[] {
  const issues: PublishIssue[] = [];
  for (const deck of board.decks) {
    for (const entry of deck.rules) {
      const move = entry.rule.move;
      if (!move || move.direction !== "toTile" || move.targetTileIndex === null) {
        continue;
      }
      const target = board.tiles[move.targetTileIndex];
      if (target?.kind === "card") {
        issues.push({
          code: "E_MOVE_TARGETS_CARD_SPACE",
          deckId: deck.id,
          ruleId: entry.rule.id,
          tileIndex: move.targetTileIndex,
          message: `${entry.rule.name} moves to slot ${move.targetTileIndex + 1}, which is a card space`,
        });
      }
    }
  }
  return issues;
}
