// Publish-time checks (OQ-19 item 6, answered: a MOVE block may not target a card space).

import { describe, expect, it } from "vitest";

import { checkMoveTargets } from "../src/publish";
import type { FrozenBoard, RuleDefinition } from "../src/state";
import { testBoard } from "./support/state";

const blank: RuleDefinition = { id: "r", name: "Rule", conditions: null, money: null, move: null, holdCard: null };

function boardWithMove(targetTileIndex: number | null, direction: "toTile" | "forward" = "toTile"): FrozenBoard {
  const board = testBoard();
  const rule: RuleDefinition = {
    ...blank,
    id: "r-jump",
    name: "Advance",
    move: { direction, count: 3, targetTileIndex, collectPassBonus: false },
  };
  return { ...board, decks: [{ id: "d-chance", name: "Chance", drawMode: "shuffle", fallback: "nothing", rules: [{ rule, active: true, diceTotals: [] }] }] };
}

describe("checkMoveTargets", () => {
  it("flags a rule that jumps to a card space — it would draw again, and could loop", () => {
    // Tile 4 on the test board is the Chance space.
    expect(checkMoveTargets(boardWithMove(4))).toEqual([
      {
        code: "E_MOVE_TARGETS_CARD_SPACE",
        deckId: "d-chance",
        ruleId: "r-jump",
        tileIndex: 4,
        message: "Advance moves to slot 5, which is a card space",
      },
    ]);
  });

  it("passes a rule that jumps to a property", () => {
    expect(checkMoveTargets(boardWithMove(1))).toEqual([]);
  });

  it("passes a rule that jumps to a corner", () => {
    expect(checkMoveTargets(boardWithMove(8))).toEqual([]);
  });

  it("ignores a forward move, which has no target", () => {
    expect(checkMoveTargets(boardWithMove(4, "forward"))).toEqual([]);
  });

  it("ignores a rule with no target set", () => {
    expect(checkMoveTargets(boardWithMove(null))).toEqual([]);
  });

  it("passes a board whose decks carry no move rules", () => {
    expect(checkMoveTargets(testBoard())).toEqual([]);
  });
});
