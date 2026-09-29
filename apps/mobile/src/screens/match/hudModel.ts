// The play HUD's view model (docs/screens/1c-play-hud.md §3, §4, §6). Pure functions over the
// engine's MatchState: no React, no navigation, no formatting beyond the shared ₹ formatter — so
// every number and label on the screen can be tested without rendering anything.

import {
  isOwnable,
  type MatchState,
  type PlayerColour,
  type PlayerId,
  type PropertyTile,
  rentFor,
  resolvePrice,
  type TileIndex,
  type UtilityTile,
} from "@royal-navy/game-engine";
import { formatRupees, rupeesInWords } from "@royal-navy/shared";

// ─── Header (§3 #2, #3) ─────────────────────────────────────────────────────────

export interface HudHeader {
  /** The match name the host typed on `1b`; it is not part of the engine state. */
  title: string;
  /** `Round <n> · <m> players` */
  meta: string;
}

export function hudHeader(state: MatchState, matchName: string): HudHeader {
  return { title: matchName, meta: `Round ${state.round} · ${state.seatOrder.length} players` };
}

// ─── Player strip (§3 #10, #11) ─────────────────────────────────────────────────

export interface PlayerChipModel {
  playerId: PlayerId;
  name: string;
  /** Seat colour name; `seatFill` turns it into the design's flat colour or gradient. */
  colour: PlayerColour;
  cash: string;
  /** docs/12: "Money is announced as words … not ₹1,200"; §9's chip label carries it. */
  spokenCash: string;
  /** The player whose turn it is — a gold border and fill (§3 #11). */
  active: boolean;
  /** The viewer themself. */
  me: boolean;
}

/** In seat order, which is the order the turn passes in (§2's strip reads P1 … P6). */
export function playerChips(state: MatchState, viewerId: PlayerId | null): PlayerChipModel[] {
  return state.seatOrder.flatMap((id) => {
    const player = state.players[id];
    if (!player) {
      return [];
    }
    return [
      {
        playerId: id,
        name: player.name,
        colour: player.colour,
        cash: formatRupees(player.cash),
        spokenCash: rupeesInWords(player.cash),
        active: state.turn.playerId === id,
        me: viewerId === id,
      },
    ];
  });
}

/** `<name>'s turn` (§3 #10). */
export function turnLine(state: MatchState): string {
  const actor = state.players[state.turn.playerId];
  return `${actor?.name ?? ""}'s turn`;
}

// ─── The primary action (§4) ────────────────────────────────────────────────────

/**
 * What the button asks the match to do. The HUD names the intent; the turn loop (E3) decides which
 * engine action carries it out — `rollAgain`, for one, is END_TURN followed by ROLL, because the
 * engine grants the extra roll when a turn that rolled a double ends.
 */
export type PrimaryIntent = "roll" | "rollAgain" | "buy" | "auction" | "pay" | "endTurn" | "none";

export interface PrimaryActionModel {
  label: string;
  enabled: boolean;
  intent: PrimaryIntent;
  /** Why it is disabled (§4 "not your turn", §9 "announces … its reason"). */
  hint?: string;
  /** The tile the intent acts on, for `buy` and `auction`. */
  tileIndex?: TileIndex;
  /** The debt `pay` settles. */
  debtId?: string;
}

/** Off-turn copy, verbatim (§4). */
export function waitingHint(name: string): string {
  return `Waiting for ${name}.`;
}

/**
 * §4's table, in its order. The engine persists only six of the turn machine's stages — preRoll,
 * jailChoice, decision, postRoll, raiseCash and auction — so the rest never reach a rendered HUD;
 * every stage the table does not name falls to `OK`, disabled, which is the label §4 already gives
 * for "you cannot act now" (moving, and not your turn). See OQ-49 item 1.
 */
export function primaryAction(state: MatchState, viewerId: PlayerId | null): PrimaryActionModel {
  const actor = state.players[state.turn.playerId];
  if (viewerId === null || viewerId !== state.turn.playerId) {
    // The hint names the player being waited for; with no such player there is nothing to name, and
    // §4 gives no other sentence, so the button announces its label alone.
    return {
      label: "OK",
      enabled: false,
      intent: "none",
      ...(actor ? { hint: waitingHint(actor.name) } : {}),
    };
  }
  const me = state.players[viewerId];
  if (!me) {
    return { label: "OK", enabled: false, intent: "none" };
  }

  // A standing debt is settled before anything else can happen: the engine refuses ROLL while one
  // is open, and §4's "insufficient cash routes to raise cash (1d)" is the press's other outcome.
  const debt = state.debts.find((candidate) => candidate.debtorId === viewerId);
  if (debt) {
    return { label: `Pay ${formatRupees(debt.amount)}`, enabled: true, intent: "pay", debtId: debt.id };
  }

  switch (state.turn.stage) {
    case "preRoll":
      return { label: state.turn.doublesThisTurn > 0 ? "Roll again" : "Roll", enabled: true, intent: "roll" };

    case "decision": {
      const tileIndex = me.position;
      const tile = state.board.tiles[tileIndex];
      // §4's row is "landed on an unowned tile", and only an ownable tile can be bought. The engine
      // opens this stage on no other kind, so a tile without a price has nothing to offer.
      if (!tile || !isOwnable(tile)) {
        return { label: "OK", enabled: false, intent: "none" };
      }
      const cost = tile.cost;
      if (me.cash >= cost) {
        return { label: `Buy ${formatRupees(cost)}`, enabled: true, intent: "buy", tileIndex };
      }
      // Cannot afford it: the auction takes over when the board runs auctions, else the turn ends.
      return state.rules.auction.enabled
        ? { label: "Auction", enabled: true, intent: "auction", tileIndex }
        : { label: "End turn", enabled: true, intent: "endTurn" };
    }

    case "postRoll": {
      // "rolled doubles → Roll again": the engine sends the same player back to preRoll when a turn
      // that rolled a double ends, under the limit and not out of jail.
      const dice = state.turn.dice;
      const rolledDouble = dice !== null && dice[0] === dice[1];
      if (rolledDouble && state.turn.doublesThisTurn > 0 && state.turn.doublesThisTurn < 3 && !me.jail.in) {
        return { label: "Roll again", enabled: true, intent: "rollAgain" };
      }
      return { label: "End turn", enabled: true, intent: "endTurn" };
    }

    default:
      return { label: "OK", enabled: false, intent: "none" };
  }
}

// ─── Holdings (§3 #14–#17) ──────────────────────────────────────────────────────

/** The chip cycles through these three, in this order (§6 "cycle sort: colour, cost, rent now"). */
export const HOLDINGS_SORTS = ["colour", "cost", "rent now"] as const;
export type HoldingsSort = (typeof HOLDINGS_SORTS)[number];

export function nextSort(sort: HoldingsSort): HoldingsSort {
  return HOLDINGS_SORTS[(HOLDINGS_SORTS.indexOf(sort) + 1) % HOLDINGS_SORTS.length]!;
}

export interface HoldingCell {
  key: string;
  value: string;
  /** The spoken form: docs/12 "Money is announced as words … not ₹1,200". */
  spoken: string;
}

export interface HoldingModel {
  tileIndex: TileIndex;
  name: string;
  /** The group's colour as the board stores it; null for a utility, which is in no colour group. */
  setColour: string | null;
  /** `<colour> set` (§2's "light grey set"); null for a utility. */
  setLine: string | null;
  /** `<n> houses · <n> hotel built`; null while nothing is built. */
  buildLine: string | null;
  /** `cost ₹<n>` for the list row (§3 #16). */
  costLine: string;
  /** The same line spoken, money in words (docs/12). */
  spokenCostLine: string;
  /** The ten-cell grid, in the documented order (§3 "Card grid keys"). */
  cells: HoldingCell[];
  rentNow: number;
  cost: number;
}

/** The ten keys, exactly and in order (§3 "Card grid keys"). */
export const CARD_GRID_KEYS = [
  "cost",
  "base rent",
  "1 house",
  "2 houses",
  "3 houses",
  "hotel rent",
  "house cost",
  "hotel cost",
  "mortgage",
  "rent now",
] as const;

export function holdings(state: MatchState, viewerId: PlayerId | null, sort: HoldingsSort): HoldingModel[] {
  if (viewerId === null) {
    return [];
  }
  const owned: HoldingModel[] = [];
  state.tiles.forEach((tile, index) => {
    const boardTile = state.board.tiles[index];
    if (tile.ownerId !== viewerId || !boardTile || !isOwnable(boardTile)) {
      return;
    }
    owned.push(holdingModel(state, index, boardTile));
  });
  return sortHoldings(state, owned, sort);
}

function holdingModel(state: MatchState, index: TileIndex, boardTile: PropertyTile | UtilityTile): HoldingModel {
  const built = state.tiles[index]!;
  const rentNow = rentFor(state, index);
  const group =
    boardTile.kind === "property"
      ? state.board.groups.find((candidate) => candidate.id === boardTile.groupId)
      : undefined;
  return {
    tileIndex: index,
    name: boardTile.name,
    setColour: group?.colour ?? null,
    setLine: group ? `${group.colour} set` : null,
    // §3 #15 quotes the line as "<n> houses · <n> hotel built"; it is shown only once something is
    // built, because "0 houses · 0 hotel built" states nothing. Its singular is a design concern.
    buildLine: built.houses > 0 || built.hotel ? `${built.houses} houses · ${built.hotel ? 1 : 0} hotel built` : null,
    costLine: `cost ${formatRupees(boardTile.cost)}`,
    spokenCostLine: `cost ${rupeesInWords(boardTile.cost)}`,
    cells: gridCells(boardTile, rentNow),
    rentNow,
    cost: boardTile.cost,
  };
}

/**
 * A property fills all ten cells. A utility has no colour group, no buildings and no rent ladder, so
 * it carries only the three keys it owns — `cost`, `mortgage` and `rent now` — in the same order.
 * What the design wants there instead is OQ-49 item 2.
 */
function gridCells(tile: PropertyTile | UtilityTile, rentNow: number): HoldingCell[] {
  const cell = (key: string, amount: number): HoldingCell => ({
    key,
    value: formatRupees(amount),
    spoken: `${key}, ${rupeesInWords(amount)}`,
  });
  if (tile.kind !== "property") {
    return [cell("cost", tile.cost), cell("mortgage", resolvePrice(tile.mortgage, tile.cost)), cell("rent now", rentNow)];
  }
  const houseRent = (index: 0 | 1 | 2) => resolvePrice(tile.houseRent[index], tile.cost);
  return [
    cell("cost", tile.cost),
    cell("base rent", resolvePrice(tile.baseRent, tile.cost)),
    cell("1 house", houseRent(0)),
    cell("2 houses", houseRent(1)),
    cell("3 houses", houseRent(2)),
    cell("hotel rent", resolvePrice(tile.hotelRent, tile.cost)),
    cell("house cost", resolvePrice(tile.houseCost, tile.cost)),
    cell("hotel cost", resolvePrice(tile.hotelCost, tile.cost)),
    cell("mortgage", resolvePrice(tile.mortgage, tile.cost)),
    cell("rent now", rentNow),
  ];
}

/**
 * The design names the three sorts and no direction or tie-break (OQ-49 item 3). Money sorts run
 * high to low, colour follows the board's own group order, and every sort falls back to board order
 * so the list is stable.
 */
function sortHoldings(state: MatchState, list: HoldingModel[], sort: HoldingsSort): HoldingModel[] {
  const groupRank = new Map(state.board.groups.map((group, rank) => [group.colour, rank]));
  const byBoardOrder = (a: HoldingModel, b: HoldingModel) => a.tileIndex - b.tileIndex;
  // A utility has no group, so it sorts after every colour, in board order.
  const rankOf = (holding: HoldingModel) =>
    holding.setColour === null ? Number.MAX_SAFE_INTEGER : (groupRank.get(holding.setColour) ?? Number.MAX_SAFE_INTEGER);

  return [...list].sort((a, b) => {
    switch (sort) {
      case "colour":
        return rankOf(a) - rankOf(b) || byBoardOrder(a, b);
      case "cost":
        return b.cost - a.cost || byBoardOrder(a, b);
      case "rent now":
        return b.rentNow - a.rentNow || byBoardOrder(a, b);
    }
  });
}
