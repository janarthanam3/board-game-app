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

import { ringSize } from "./board";
import { validateGroup } from "./sets";
import type { FrozenBoard, Ruleset } from "./state";

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

// ─── The D7 board validator ──────────────────────────────────────────────────────────────────────
//
// Decision D7 "Minimum viable board" lists five hard errors and five warnings. docs/07 requires the
// publish endpoint to run the *same* validator the builder runs, with errors blocking and warnings
// not, and to return the rows shaped as the READY TO PLAY panel renders them (2a §2.1).
//
// Two of D7's five errors cannot be expressed against a FrozenBoard and are therefore checked
// differently here, which OQ-40 records:
//
// - "Exactly one start tile" — a FrozenBoard has no start marker at all; index 0 *is* the start
//   (state.ts: "Index 0 is the start tile"). A document cannot carry two, so instead the tile count
//   is checked against the grid, which is the failure a hand-made document can actually produce.
// - "No empty slots" — `tiles` is a dense array with no hole to find, so the same count check stands
//   in for it, and reports itself in the panel's words ("2 slots still empty").


/**
 * One READY TO PLAY row. `message` is the row's first line, `detail` the quoted second line.
 *
 * `code` is a docs/13-error-catalog.md code wherever the catalog has one — E_SLOTS_EMPTY,
 * E_TOO_FEW_TILES, E_CARD_SPACE_NO_DECK, E_SET_BELOW_THRESHOLD. Three cases have no catalog entry
 * and are logged as a gap in docs/design-concerns.md: E_SLOT_COUNT (more tiles than slots, which
 * the builder cannot produce), E_SET_CUSTOM_VALUE_MISSING, and every warning — the catalog carries
 * no warning codes at all.
 */
export interface BoardIssue {
  code: string;
  severity: "error" | "warning";
  message: string;
  detail?: string;
  /** What the row's [Fix] button should jump to. */
  tileIndexes?: number[];
  groupId?: string;
  deckId?: string;
  ruleId?: string;
}

/** Share of the ring above which D7 warns that most landings are random. */
const CARD_SPACE_WARNING_SHARE = 0.3;
const MIN_TILES = 12;
const MIN_PROPERTIES = 4;
const MIN_GROUPS = 2;

/**
 * Every D7 issue on a board about to be published. Errors come first, then warnings, which is the
 * order the READY TO PLAY panel renders them in. An empty list is a board with nothing to say about
 * it; a list with no `severity: "error"` entry is publishable.
 */
export function validateBoard(board: FrozenBoard, ruleset: Ruleset): BoardIssue[] {
  const errors: BoardIssue[] = [];
  const warnings: BoardIssue[] = [];

  const slots = ringSize(board.rows, board.cols);
  const filled = board.tiles.length;
  if (filled < slots) {
    const missing = slots - filled;
    errors.push({
      code: "E_SLOTS_EMPTY",
      severity: "error",
      message: `${missing} slot${missing === 1 ? "" : "s"} still empty`,
    });
  } else if (filled > slots) {
    // The builder cannot produce this, so the design has no copy for it; a hand-made document can.
    errors.push({
      code: "E_SLOT_COUNT",
      severity: "error",
      message: `${filled} tiles do not fit a ${board.rows}×${board.cols} grid, which has ${slots} slots`,
    });
  }

  if (filled < MIN_TILES) {
    errors.push({ code: "E_TOO_FEW_TILES", severity: "error", message: `${filled} tiles · minimum ${MIN_TILES}` });
  }

  const deckIds = new Set(board.decks.map((deck) => deck.id));
  board.tiles.forEach((tile, index) => {
    if (tile.kind !== "card") {
      return;
    }
    // A tax office and a plain space draw nothing, so neither needs a deck (rulebook §2.3).
    if (tile.cardType !== "chance" && tile.cardType !== "chest") {
      return;
    }
    if (tile.deckId === null) {
      errors.push({
        code: "E_CARD_SPACE_NO_DECK",
        severity: "error",
        message: `Slot ${index + 1} has no deck assigned`,
        tileIndexes: [index],
      });
      return;
    }
    if (!deckIds.has(tile.deckId)) {
      // A published version carries copies of its decks (D5), so a dangling id is unplayable. The
      // catalog has one code for a card space without a usable deck, and this is that failure.
      errors.push({
        code: "E_CARD_SPACE_NO_DECK",
        severity: "error",
        message: `Slot ${index + 1} points at a deck this board does not carry`,
        tileIndexes: [index],
        deckId: tile.deckId,
      });
    }
  });

  if (ruleset.sets.mode === "custom" && ruleset.sets.customValue === null) {
    errors.push({
      code: "E_SET_CUSTOM_VALUE_MISSING",
      severity: "error",
      message: "Custom colour sets need a threshold",
    });
  }

  // The set checks are the engine's own, so the Rule lab and the publish gate cannot disagree.
  const context = { board: { groups: board.groups }, rules: { sets: ruleset.sets } };
  for (const group of board.groups) {
    const verdict = validateGroup(context, group.id);
    if (verdict.level === "error") {
      errors.push({
        code: "E_SET_BELOW_THRESHOLD",
        severity: "error",
        message: verdict.message,
        detail: verdict.detail,
        groupId: group.id,
        tileIndexes: [...group.tileIndexes],
      });
    } else if (verdict.level === "warning") {
      warnings.push({
        code: "W_SET_MAJORITY_EVEN",
        severity: "warning",
        message: verdict.message,
        detail: verdict.detail,
        groupId: group.id,
      });
    }
  }

  for (const issue of checkMoveTargets(board)) {
    errors.push({
      code: issue.code,
      severity: "error",
      message: issue.message,
      tileIndexes: [issue.tileIndex],
      deckId: issue.deckId,
      ruleId: issue.ruleId,
    });
  }

  // ── Warnings. D7's copy verbatim. ──
  if (!board.tiles.some((tile) => tile.kind === "corner" && tile.cornerType === "jail")) {
    warnings.push({
      code: "W_NO_JAIL",
      severity: "warning",
      message: "No jail tile",
      detail: "Go-to-jail card effects will have nowhere to send players.",
    });
  }

  if (board.groups.length < MIN_GROUPS) {
    warnings.push({
      code: "W_FEW_GROUPS",
      severity: "warning",
      message: `Only ${board.groups.length} colour group${board.groups.length === 1 ? "" : "s"}`,
      detail: "Players will rarely be able to build.",
    });
  }

  const properties = board.tiles.filter((tile) => tile.kind === "property").length;
  if (properties < MIN_PROPERTIES) {
    warnings.push({
      code: "W_FEW_PROPERTIES",
      severity: "warning",
      message: `Only ${properties} propert${properties === 1 ? "y" : "ies"}`,
      detail: "Very little to buy.",
    });
  }

  const cardSpaces = board.tiles.filter((tile) => tile.kind === "card").length;
  if (filled > 0 && cardSpaces / filled > CARD_SPACE_WARNING_SHARE) {
    warnings.push({
      code: "W_MANY_CARD_SPACES",
      severity: "warning",
      message: `${cardSpaces} of ${filled} slots are card spaces`,
      detail: "Most landings will be random events.",
    });
  }

  // "No tax or fine tiles": a tax office takes money out, and so does any corner that charges —
  // jail entry or a rest-house stay (rulebook §2.3, §12, §13).
  const drains = board.tiles.some((tile) => {
    if (tile.kind === "card") {
      return tile.cardType === "tax";
    }
    if (tile.kind === "corner") {
      return (tile.getIn?.amount ?? 0) > 0 || (tile.stayHere?.perSkipTurnAmount ?? 0) > 0;
    }
    return false;
  });
  if (!drains) {
    warnings.push({
      code: "W_NO_MONEY_SINK",
      severity: "warning",
      message: "No tax or fine tile",
      detail: "Money only enters the game, never leaves. Matches may not end.",
    });
  }

  return [...errors, ...warnings];
}
