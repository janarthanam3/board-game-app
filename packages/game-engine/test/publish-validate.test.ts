// The publish-time board validator: decision D7's "minimum viable board" — five hard errors and five
// warnings — plus the MOVE-target check that OQ-19 item 6 answered (its own tests are in
// publish.test.ts).
//
// docs/07-api-contract.md: `POST /boards/publish` "validates the document server-side with the
// **same** validator the builder runs (errors block, warnings do not)". That is why this lives in the
// engine: the builder (F2) and the server (D3) must not drift apart on what a valid board is.

import { describe, expect, it } from "vitest";

import { validateBoard } from "../src/publish";
import type { BoardIssue } from "../src/publish";
import type { FrozenBoard, FrozenTile, RuleDefinition, Ruleset } from "../src/state";
import { testBoard, testRules } from "./support/state";

function codes(issues: BoardIssue[]): string[] {
  return issues.map((issue) => issue.code);
}

function errors(issues: BoardIssue[]): BoardIssue[] {
  return issues.filter((issue) => issue.severity === "error");
}

function warnings(issues: BoardIssue[]): BoardIssue[] {
  return issues.filter((issue) => issue.severity === "warning");
}

function find(issues: BoardIssue[], code: string): BoardIssue | undefined {
  return issues.find((issue) => issue.code === code);
}

describe("validateBoard — a publishable board", () => {
  it("passes the 5x5 test board with no errors and no warnings", () => {
    expect(validateBoard(testBoard(), testRules())).toEqual([]);
  });
});

describe("validateBoard — D7's hard errors", () => {
  it("refuses a document with fewer tiles than its grid has slots", () => {
    const board = testBoard();
    const short: FrozenBoard = { ...board, tiles: board.tiles.slice(0, board.tiles.length - 2) };

    const issue = find(validateBoard(short, testRules()), "E_SLOTS_EMPTY");
    expect(issue?.severity).toBe("error");
    // 2a's READY TO PLAY row copy.
    expect(issue?.message).toBe("2 slots still empty");
  });

  it("refuses a document with more tiles than its grid has slots", () => {
    const board = testBoard();
    const long: FrozenBoard = { ...board, tiles: [...board.tiles, board.tiles[1]!] };

    expect(codes(validateBoard(long, testRules()))).toContain("E_SLOT_COUNT");
  });

  it("refuses a board under twelve tiles", () => {
    // A 3x4 grid has 10 ring positions, which D7 rejects at the stepper; a document can still claim
    // it, so the validator says so too.
    const board: FrozenBoard = { ...testBoard(), rows: 3, cols: 4, tiles: testBoard().tiles.slice(0, 10) };

    const issue = find(validateBoard(board, testRules()), "E_TOO_FEW_TILES");
    expect(issue?.severity).toBe("error");
    expect(issue?.message).toBe("10 tiles · minimum 12");
  });

  it("refuses a card space with no deck assigned", () => {
    const board = testBoard();
    const tiles: FrozenTile[] = [...board.tiles];
    tiles[4] = { kind: "card", name: "Chance", cardType: "chance", deckId: null };

    const issue = find(validateBoard({ ...board, tiles }, testRules()), "E_CARD_SPACE_NO_DECK");
    expect(issue?.severity).toBe("error");
    expect(issue?.tileIndexes).toEqual([4]);
  });

  it("refuses a card space pointing at a deck the board does not carry", () => {
    // A published version carries copies of its decks (D5), so a dangling id cannot be resolved at
    // match time and the board would be unplayable.
    const board = testBoard();
    const tiles: FrozenTile[] = [...board.tiles];
    tiles[4] = { kind: "card", name: "Chance", cardType: "chance", deckId: "d-missing" };

    expect(codes(validateBoard({ ...board, tiles }, testRules()))).toContain("E_CARD_SPACE_NO_DECK");
  });

  it("does not ask a tax office for a deck — it draws nothing", () => {
    const board = testBoard();
    const tiles: FrozenTile[] = [...board.tiles];
    tiles[4] = {
      kind: "card",
      name: "Tax office",
      cardType: "tax",
      deckId: null,
      tax: { mode: "flat", flatAmount: 2000, percent: 10, percentOf: "cash" },
    };

    expect(errors(validateBoard({ ...board, tiles }, testRules()))).toEqual([]);
  });

  it("refuses a colour group that can never be held, with the design's copy", () => {
    const board = testBoard();
    const groups = [...board.groups];
    groups[0] = { ...groups[0]!, tileIndexes: [1, 2], thresholdOverride: 3 };

    const issue = find(validateBoard({ ...board, groups }, testRules()), "E_SET_BELOW_THRESHOLD");
    expect(issue?.severity).toBe("error");
    expect(issue?.message).toBe("Purple set has 2 tiles, threshold 3");
    expect(issue?.detail).toBe("This set can never be held");
    expect(issue?.groupId).toBe("g-purple");
  });

  it("includes a MOVE block that targets a card space as an error", () => {
    const board = testBoard();
    const rule: RuleDefinition = {
      id: "r-jump",
      name: "Advance",
      conditions: null,
      money: null,
      move: { direction: "toTile", count: 3, targetTileIndex: 4, collectPassBonus: false },
      holdCard: null,
    };
    const decks = [{ ...board.decks[0]!, rules: [{ rule, active: true, diceTotals: [] }] }];

    const issue = find(validateBoard({ ...board, decks }, testRules()), "E_MOVE_TARGETS_CARD_SPACE");
    expect(issue?.severity).toBe("error");
    expect(issue?.tileIndexes).toEqual([4]);
    expect(issue?.deckId).toBe("d-chance");
    expect(issue?.ruleId).toBe("r-jump");
  });

  it("refuses a custom set mode with no custom value", () => {
    const rules: Ruleset = { ...testRules(), sets: { ...testRules().sets, mode: "custom", customValue: null } };

    expect(codes(validateBoard(testBoard(), rules))).toContain("E_SET_CUSTOM_VALUE_MISSING");
  });
});

describe("validateBoard — D7's warnings, which do not block", () => {
  it("warns when there is no jail tile, in D7's words", () => {
    const board = testBoard();
    const tiles = board.tiles.map((tile) =>
      tile.kind === "corner" && tile.cornerType === "jail" ? { ...tile, cornerType: "none" as const } : tile,
    );

    const issues = validateBoard({ ...board, tiles }, testRules());
    const issue = find(issues, "W_NO_JAIL");
    expect(issue?.severity).toBe("warning");
    expect(issue?.detail).toBe("Go-to-jail card effects will have nowhere to send players.");
    // A warning never blocks a publish (D7).
    expect(errors(issues)).toEqual([]);
  });

  it("warns on fewer than two colour groups", () => {
    const board = testBoard();
    // Fold every purple tile into the sky group, so one group covers them all.
    const groups = [{ ...board.groups[1]!, tileIndexes: [1, 2, 3, 5, 6, 9, 10, 11, 13, 14] }];
    const tiles = board.tiles.map((tile) =>
      tile.kind === "property" ? { ...tile, groupId: "g-sky" } : tile,
    );

    const issues = validateBoard({ ...board, groups, tiles }, testRules());
    expect(find(issues, "W_FEW_GROUPS")?.detail).toBe("Players will rarely be able to build.");
  });

  it("warns on fewer than four properties", () => {
    const board = testBoard();
    const spare: FrozenTile = { kind: "corner", name: "Free parking", cornerType: "none", drawMode: "fixed", getOut: null, stayHere: null, getIn: null, blockActionsWhileHeld: true, collectRentWhileHeld: true };
    const tiles = board.tiles.map((tile, index) => (tile.kind === "property" && index > 2 ? spare : tile));
    const groups = board.groups.map((group) => ({ ...group, tileIndexes: group.tileIndexes.filter((index) => index <= 2) }));

    const issues = validateBoard({ ...board, tiles, groups: groups.filter((group) => group.tileIndexes.length > 0) }, testRules());
    expect(find(issues, "W_FEW_PROPERTIES")?.detail).toBe("Very little to buy.");
  });

  it("warns when more than 30% of the ring is card spaces", () => {
    const board = testBoard();
    const card: FrozenTile = { kind: "card", name: "Chance", cardType: "chance", deckId: "d-chance" };
    // Six of sixteen is 37.5%.
    const tiles = board.tiles.map((tile, index) => ([1, 2, 3, 4, 12, 13].includes(index) ? card : tile));
    const groups = board.groups.map((group) => ({ ...group, tileIndexes: group.tileIndexes.filter((index) => ![1, 2, 3, 13].includes(index)) }));

    const issues = validateBoard({ ...board, tiles, groups }, testRules());
    expect(find(issues, "W_MANY_CARD_SPACES")?.detail).toBe("Most landings will be random events.");
  });

  it("warns when money only ever enters the game", () => {
    const board = testBoard();
    const tiles = board.tiles.map((tile) => (tile.kind === "corner" ? { ...tile, getIn: null, stayHere: null } : tile));

    const issues = validateBoard({ ...board, tiles }, testRules());
    expect(find(issues, "W_NO_MONEY_SINK")?.detail).toBe("Money only enters the game, never leaves. Matches may not end.");
  });

  it("a tax office counts as money leaving, so it silences that warning", () => {
    const board = testBoard();
    const tiles: FrozenTile[] = board.tiles.map((tile) => (tile.kind === "corner" ? { ...tile, getIn: null, stayHere: null } : tile));
    tiles[4] = {
      kind: "card",
      name: "Tax office",
      cardType: "tax",
      deckId: null,
      tax: { mode: "flat", flatAmount: 2000, percent: 10, percentOf: "cash" },
    };

    expect(codes(validateBoard({ ...board, tiles }, testRules()))).not.toContain("W_NO_MONEY_SINK");
  });

  it("puts every error before every warning, the order READY TO PLAY renders them", () => {
    const board = testBoard();
    const tiles = board.tiles
      .slice(0, board.tiles.length - 1)
      .map((tile) => (tile.kind === "corner" && tile.cornerType === "jail" ? { ...tile, cornerType: "none" as const } : tile));

    const issues = validateBoard({ ...board, tiles }, testRules());
    const firstWarning = issues.findIndex((issue) => issue.severity === "warning");
    const lastError = issues.map((issue) => issue.severity).lastIndexOf("error");

    expect(errors(issues).length).toBeGreaterThan(0);
    expect(warnings(issues).length).toBeGreaterThan(0);
    expect(lastError).toBeLessThan(firstWarning);
  });
});
