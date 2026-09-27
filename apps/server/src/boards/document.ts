// Everything derived from a board's frozen document: the counters the boards list filters on, the
// catalogue card's motif and chips, and the tile and rule summaries the read-only screens show.
//
// Nothing here is ever read from a request. The owner's ruling on D3: publish derives slots_total,
// slots_filled and has_errors from the submitted document and never accepts client-supplied values,
// and unpublish re-derives them from the live version rather than restoring a draft that may have
// drifted. That is why every one of these functions takes a document and not a body.

import { ringSize, validateBoard, type BoardIssue } from "@royal-navy/game-engine";
import type { FrozenBoard, Ruleset } from "@royal-navy/game-engine";

export interface DerivedCounters {
  slotsTotal: number;
  slotsFilled: number;
  hasErrors: boolean;
}

/**
 * The three counters, from the document alone. `slotsTotal` is what the grid implies rather than what
 * the document claims, so a short document reports empty slots instead of hiding them.
 */
export function deriveCounters(board: FrozenBoard, ruleset: Ruleset): DerivedCounters {
  const issues = validateBoard(board, ruleset);
  return {
    slotsTotal: ringSize(board.rows, board.cols),
    slotsFilled: board.tiles.length,
    hasErrors: issues.some((issue) => issue.severity === "error"),
  };
}

export function errorsOf(issues: BoardIssue[]): BoardIssue[] {
  return issues.filter((issue) => issue.severity === "error");
}

/**
 * The 4×4 cover motif docs/07 calls "generated". The palette is the board's own group colours and the
 * grid is derived from the tile kinds, so two boards look different and one board always looks the
 * same — a motif that changed between requests would flicker in the catalogue list.
 */
export function coverMotif(board: FrozenBoard): { palette: string[]; grid: number[] } {
  const palette = board.groups.map((group) => group.colour).slice(0, 4);
  // Always at least one colour, so a board with no groups still renders.
  if (palette.length === 0) {
    palette.push("sky");
  }
  const grid: number[] = [];
  for (let cell = 0; cell < 16; cell++) {
    const tile = board.tiles[cell % board.tiles.length];
    // Property tiles take their group's palette slot; everything else takes slot 0.
    const slot =
      tile?.kind === "property" ? Math.max(0, board.groups.findIndex((group) => group.id === tile.groupId)) : 0;
    grid.push(slot % palette.length);
  }
  return { palette, grid };
}

/**
 * At most three chips, docs/07's example being "3 of 5 sets". The set threshold is the first because
 * it is the rule that changes play most; then the ring size, then whether auctions run.
 */
/**
 * A ruleset read back out of a stored document. docs/08: `board_versions.document` is never altered
 * in place, and a schema change adds a discriminator rather than rewriting rows — so a version
 * published under an older shape must still render. Every section is therefore optional here, even
 * though the publish schema requires them of anything new.
 */
type StoredRuleset = {
  money?: Partial<Ruleset["money"]>;
  sets?: Partial<Ruleset["sets"]>;
  auction?: Partial<Ruleset["auction"]>;
  rounds?: Partial<Ruleset["rounds"]>;
};

export function ruleChips(board: FrozenBoard, ruleset: StoredRuleset): string[] {
  const chips: string[] = [];
  const largest = board.groups.reduce((most, group) => Math.max(most, group.tileIndexes.length), 0);
  switch (ruleset.sets?.mode) {
    case "allTiles":
      chips.push(largest > 0 ? `${largest} of ${largest} sets` : "All tiles");
      break;
    case "majority":
      chips.push(largest > 0 ? `${Math.floor(largest / 2) + 1} of ${largest} sets` : "Majority");
      break;
    case "custom":
      chips.push(`${ruleset.sets?.customValue ?? largest} of ${largest} sets`);
      break;
    default:
      // A document with no set mode at all: say nothing rather than guess.
      break;
  }
  chips.push(`${board.tiles.length} tiles`);
  if (ruleset.auction?.enabled !== undefined) {
    chips.push(ruleset.auction.enabled ? "Auctions" : "No auctions");
  }
  return chips.slice(0, 3);
}

export interface TileSummary {
  index: number;
  kind: string;
  name: string;
  colour: string | null;
  cost: number | null;
}

/**
 * The per-tile rows `1f` and `3l` list. docs/07 names `TileSummary` but never declares it, so this is
 * the smallest shape those screens need; the gap is recorded in docs/design-concerns.md.
 */
export function tileSummaries(board: FrozenBoard): TileSummary[] {
  return board.tiles.map((tile, index) => ({
    index,
    kind: tile.kind,
    name: tile.name,
    colour:
      tile.kind === "property"
        ? (board.groups.find((group) => group.id === tile.groupId)?.colour ?? null)
        : null,
    cost: tile.kind === "property" || tile.kind === "utility" ? tile.cost : null,
  }));
}

export interface RuleSummaryRow {
  label: string;
  value: string;
}

/** The rule rows the read-only rules screen shows. Same caveat as TileSummary: not declared in 07. */
export function ruleSummary(ruleset: StoredRuleset): RuleSummaryRow[] {
  const unknown = "—";
  const rows: RuleSummaryRow[] = [
    { label: "Starting cash", value: text(ruleset.money?.startingCash) },
    { label: "Pass Start bonus", value: text(ruleset.money?.passBonus) },
    { label: "Fines and taxes", value: ruleset.money?.finesTo === "pot" ? "To the pot" : "To the bank" },
    { label: "Colour sets", value: ruleset.sets?.mode ?? unknown },
    { label: "Build evenly", value: ruleset.sets?.buildEvenly ? "On" : "Off" },
    { label: "Round cap", value: text(ruleset.rounds?.cap) },
    {
      label: "Turn timer",
      // null means the timer is off (state.ts), not zero seconds.
      value: ruleset.rounds?.turnTimerSeconds == null ? "Off" : `${ruleset.rounds.turnTimerSeconds}s`,
    },
  ];
  return rows;
}

/** A stored number, or an em dash when a document written under an older shape has no value. */
function text(value: number | undefined): string {
  return value === undefined ? "—" : String(value);
}
