// Publish-time board checks that the reducer cannot make at match time, because a published
// version is frozen (D5) and must already be playable.
//
// One check lives here, and it answers two questions:
//
// - **OQ-19 item 6** — a MOVE block may not send a token to a card space. Such a rule draws again
//   on arrival, and one pointing at its own space would loop for ever. Banning it at publish is
//   the answer the design chose over a runtime cap; reducer/cards.ts keeps MAX_CARD_CHAIN as a
//   backstop for boards published before this check existed.
// - **OQ-26** — a `To tile` whose target is the tile the token already stands on is not a move and
//   must not pay the pass bonus. A MOVE block is only ever applied by a card draw
//   (reducer/turn.ts resolves a `card` tile through resolveCardSpace), so the token is always on a
//   card space when one runs. Refusing every card-space target therefore already refuses every
//   zero-length jump a board can author — no second check is needed, and one would be unreachable.
//   The other way to reach a zero-length jump is the `moveAnywhere` hold card, whose target is
//   picked during play and so cannot be seen from the board; task C8 owns that guard.

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
