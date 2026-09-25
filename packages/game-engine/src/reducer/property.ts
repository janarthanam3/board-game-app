// Buying, building, selling, mortgaging and redeeming (rulebook §8, §9, §10 trigger, §21).

import type { Action } from "../actions";
import { OK, refuse, type ValidationResult } from "../errors";
import { houseLadder } from "../invariants";
import { resolvePrice } from "../pricing";
import { holdsSet, thresholdFor } from "../sets";
import { isOwnable, type MatchState, type PlayerId, type PropertyTile, type TileIndex } from "../state";
import { type Ctx, emit, bankPays, payBank } from "./context";
import { actorInMatch, all, inStage, isActorsTurn, matchIsLive, noOpenDebt, notJailBlocked } from "./guards";
import { declinePurchase } from "./turn";

type Buy = Extract<Action, { kind: "BUY" }>;
type PassBuy = Extract<Action, { kind: "PASS_BUY" }>;
type Build = Extract<Action, { kind: "BUILD" }>;
type Sell = Extract<Action, { kind: "SELL" }>;
type Mortgage = Extract<Action, { kind: "MORTGAGE" }>;
type Redeem = Extract<Action, { kind: "REDEEM" }>;

// ─── BUY / PASS_BUY (the PROPERTY COST decision) ────────────────────────────────

function validateDecision(state: MatchState, action: Buy | PassBuy): ValidationResult {
  const base = all(matchIsLive(state), actorInMatch(state, action), isActorsTurn(state, action.by), inStage(state, "decision"));
  if (!base.ok) {
    return base;
  }
  const player = state.players[action.by];
  if (!player || player.position !== action.tileIndex) {
    return refuse("E_ACTION_ILLEGAL", `${action.by} is not standing on tile ${action.tileIndex}`);
  }
  const tile = state.tiles[action.tileIndex];
  if (!tile || tile.ownerId !== null) {
    return refuse("E_TILE_OWNED", `tile ${action.tileIndex} is owned`);
  }
  return OK;
}

export function validateBuy(state: MatchState, action: Buy): ValidationResult {
  const base = validateDecision(state, action);
  if (!base.ok) {
    return base;
  }
  const boardTile = state.board.tiles[action.tileIndex];
  const player = state.players[action.by];
  if (!boardTile || !isOwnable(boardTile) || !player) {
    return refuse("E_ACTION_ILLEGAL", "not an ownable tile");
  }
  // Edge case #1: cash below cost disables Buy; no debt is created.
  return player.cash >= boardTile.cost ? OK : refuse("E_INSUFFICIENT_CASH", `cost ${boardTile.cost} exceeds cash ${player.cash}`);
}

export function applyBuy(ctx: Ctx, action: Buy): void {
  const boardTile = ctx.state.board.tiles[action.tileIndex];
  const tile = ctx.state.tiles[action.tileIndex];
  if (!boardTile || !isOwnable(boardTile) || !tile) {
    return;
  }
  payBank(ctx, action.by, boardTile.cost);
  tile.ownerId = action.by;
  emit(ctx, { kind: "bought", playerId: action.by, tileIndex: action.tileIndex, cost: boardTile.cost });
  ctx.state.turn.stage = "postRoll";
}

export function validatePassBuy(state: MatchState, action: PassBuy): ValidationResult {
  return validateDecision(state, action);
}

export function applyPassBuy(ctx: Ctx, action: PassBuy): void {
  declinePurchase(ctx, action.by, action.tileIndex);
}

// ─── BUILD ──────────────────────────────────────────────────────────────────────

function ownedProperty(state: MatchState, by: string, tileIndex: TileIndex): { tile: PropertyTile } | ValidationResult {
  const boardTile = state.board.tiles[tileIndex];
  const tile = state.tiles[tileIndex];
  if (!boardTile || !tile || boardTile.kind !== "property") {
    return refuse("E_ACTION_ILLEGAL", `tile ${tileIndex} is not a property`);
  }
  if (tile.ownerId !== by) {
    return refuse("E_ACTION_ILLEGAL", `${by} does not own tile ${tileIndex}`);
  }
  return { tile: boardTile };
}

/** Side actions are allowed before and after the roll, never mid-decision or with a debt (rulebook §15 #6). */
function sideActionGuards(state: MatchState, action: Build | Sell | Mortgage | Redeem): ValidationResult {
  return all(
    matchIsLive(state),
    actorInMatch(state, action),
    isActorsTurn(state, action.by),
    noOpenDebt(state, action.by),
    notJailBlocked(state, action.by),
    inStage(state, "preRoll", "postRoll"),
  );
}

export function validateBuild(state: MatchState, action: Build): ValidationResult {
  const base = sideActionGuards(state, action);
  if (!base.ok) {
    return base;
  }
  const owned = ownedProperty(state, action.by, action.tileIndex);
  if ("ok" in owned) {
    return owned;
  }
  const boardTile = owned.tile;
  const tile = state.tiles[action.tileIndex]!;
  const player = state.players[action.by]!;

  if (tile.mortgaged) {
    return refuse("E_TILE_MORTGAGED", "cannot build on a mortgaged tile");
  }
  if (!holdsSet(state, action.by, boardTile.groupId)) {
    return refuse("E_BUILD_NEEDS_SET", `needs ${thresholdFor(state, boardTile.groupId)} of the set`);
  }
  if (tile.hotel) {
    return refuse("E_BUILD_HOUSE_LIMIT", "the tile already has a hotel");
  }

  if (action.what === "house") {
    if (tile.houses >= 4) {
      return refuse("E_BUILD_HOUSE_LIMIT", "four houses already; build a hotel");
    }
    if (state.bank.houses < 1) {
      return refuse("E_SUPPLY_EXHAUSTED", "the bank has no houses left");
    }
    if (state.rules.sets.buildEvenly) {
      const lowest = Math.min(...ladderFor(state, boardTile.groupId, action.by));
      if (tile.houses + 1 - lowest > 1) {
        return refuse("E_BUILD_UNEVEN", "Build evenly is on");
      }
    }
    const cost = resolvePrice(boardTile.houseCost, boardTile.cost);
    return player.cash >= cost ? OK : refuse("E_INSUFFICIENT_CASH", `house costs ${cost}`);
  }

  // Hotel: four houses stand, one hotel in the bank, cost paid; the four houses return. No
  // even-build check: the tile leaves the house ladder (invariants.ts houseLadder), and dropping a
  // tile out of the comparison can only narrow the group's spread.
  if (tile.houses !== 4) {
    return refuse("E_BUILD_HOUSE_LIMIT", "four houses before a hotel");
  }
  if (state.bank.hotels < 1) {
    return refuse("E_SUPPLY_EXHAUSTED", "the bank has no hotels left");
  }
  const cost = resolvePrice(boardTile.hotelCost, boardTile.cost);
  return player.cash >= cost ? OK : refuse("E_INSUFFICIENT_CASH", `hotel costs ${cost}`);
}

/** The builder's house ladder in this group, exactly as the evenBuild invariant measures it. */
function ladderFor(state: MatchState, groupId: string, ownerId: PlayerId): number[] {
  const group = state.board.groups.find((candidate) => candidate.id === groupId);
  return houseLadder(state, group?.tileIndexes ?? [], ownerId);
}

export function applyBuild(ctx: Ctx, action: Build): void {
  const state = ctx.state;
  const boardTile = state.board.tiles[action.tileIndex] as PropertyTile;
  const tile = state.tiles[action.tileIndex]!;
  if (action.what === "house") {
    const cost = resolvePrice(boardTile.houseCost, boardTile.cost);
    payBank(ctx, action.by, cost);
    state.bank.houses -= 1;
    tile.houses += 1;
    emit(ctx, { kind: "built", playerId: action.by, tileIndex: action.tileIndex, what: "house", cost, houses: tile.houses, hotel: false });
    return;
  }
  const cost = resolvePrice(boardTile.hotelCost, boardTile.cost);
  payBank(ctx, action.by, cost);
  state.bank.hotels -= 1;
  tile.hotel = true;
  // Rulebook §8: the four houses go back to the bank supply (OQ-17 item 4 dropped the toggle).
  state.bank.houses += tile.houses;
  tile.houses = 0;
  emit(ctx, { kind: "built", playerId: action.by, tileIndex: action.tileIndex, what: "hotel", cost, houses: 0, hotel: true });
}

// ─── SELL ───────────────────────────────────────────────────────────────────────

export function validateSell(state: MatchState, action: Sell): ValidationResult {
  const base = all(
    matchIsLive(state),
    actorInMatch(state, action),
    isActorsTurn(state, action.by),
    notJailBlocked(state, action.by),
    // Selling is also a raise-cash route (rulebook §16).
    inStage(state, "preRoll", "postRoll", "raiseCash"),
  );
  if (!base.ok) {
    return base;
  }
  const boardTile = state.board.tiles[action.tileIndex];
  const tile = state.tiles[action.tileIndex];
  if (!boardTile || !tile || !isOwnable(boardTile)) {
    return refuse("E_ACTION_ILLEGAL", `tile ${action.tileIndex} cannot be sold`);
  }
  if (tile.ownerId !== action.by) {
    return refuse("E_ACTION_ILLEGAL", `${action.by} does not own tile ${action.tileIndex}`);
  }
  if (action.what === "property") {
    if (tile.houses > 0 || tile.hotel) {
      return refuse("E_MORTGAGE_HAS_BUILDINGS", "sell the buildings first");
    }
    // OQ-20 item 1: selling a mortgaged tile at its full price paid out more than the tile cost,
    // because the mortgage had already been drawn. Redeem first.
    if (tile.mortgaged) {
      return refuse("E_TILE_MORTGAGED", "redeem this tile before selling it");
    }
    return OK;
  }
  if (boardTile.kind !== "property") {
    return refuse("E_ACTION_ILLEGAL", "utilities have no buildings");
  }
  if (action.what === "hotel") {
    if (!tile.hotel) {
      return refuse("E_ACTION_ILLEGAL", "no hotel on this tile");
    }
    if (state.rules.sets.buildEvenly) {
      // The tile rejoins the ladder at 0 houses (§8: no houses are re-placed), so every other
      // tile still in the ladder must be within 1 of 0. This tile is not in the ladder yet — it
      // still holds its hotel.
      if (Math.max(...ladderFor(state, boardTile.groupId, action.by), 0) > 1) {
        return refuse("E_BUILD_UNEVEN", "Build evenly is on");
      }
    }
    return OK;
  }
  if (tile.houses === 0) {
    return refuse("E_ACTION_ILLEGAL", "no houses on this tile");
  }
  if (state.rules.sets.buildEvenly) {
    // Selling mirrors building: no tile may fall more than 1 below another (rulebook §4).
    const highest = Math.max(...ladderFor(state, boardTile.groupId, action.by));
    if (highest - (tile.houses - 1) > 1) {
      return refuse("E_BUILD_UNEVEN", "Build evenly is on");
    }
  }
  return OK;
}

export function applySell(ctx: Ctx, action: Sell): void {
  const state = ctx.state;
  const boardTile = state.board.tiles[action.tileIndex]!;
  const tile = state.tiles[action.tileIndex]!;
  let proceeds = 0;
  if (action.what === "property") {
    proceeds = boardTile.kind === "property"
      ? resolvePrice(boardTile.sellProperty, boardTile.cost)
      : boardTile.kind === "utility"
        ? resolvePrice(boardTile.sellToBank, boardTile.cost)
        : 0;
    tile.ownerId = null;
  } else if (boardTile.kind === "property" && action.what === "hotel") {
    proceeds = resolvePrice(boardTile.sellHotel, resolvePrice(boardTile.hotelCost, boardTile.cost));
    tile.hotel = false;
    state.bank.hotels += 1;
    // Selling a hotel does not re-place four houses (rulebook §8).
  } else if (boardTile.kind === "property") {
    proceeds = resolvePrice(boardTile.sellHouse, resolvePrice(boardTile.houseCost, boardTile.cost));
    tile.houses -= 1;
    state.bank.houses += 1;
  }
  bankPays(ctx, action.by, proceeds);
  emit(ctx, { kind: "sold", playerId: action.by, tileIndex: action.tileIndex, what: action.what, proceeds });
}

// ─── MORTGAGE / REDEEM ──────────────────────────────────────────────────────────

function mortgageValue(state: MatchState, index: TileIndex): number {
  const boardTile = state.board.tiles[index];
  return boardTile && isOwnable(boardTile) ? resolvePrice(boardTile.mortgage, boardTile.cost) : 0;
}

/** Redeem = mortgage amount + interest (10 % on the design board), rounded to a rupee. */
export function redeemCost(state: MatchState, index: TileIndex): number {
  const value = mortgageValue(state, index);
  return value + Math.round((value * state.rules.mortgage.interestPercent) / 100); // rounding to the rupee is unstated — OQ-20 item 3
}

export function validateMortgage(state: MatchState, action: Mortgage): ValidationResult {
  const base = all(
    matchIsLive(state),
    actorInMatch(state, action),
    isActorsTurn(state, action.by),
    notJailBlocked(state, action.by),
    inStage(state, "preRoll", "postRoll", "raiseCash"),
  );
  if (!base.ok) {
    return base;
  }
  if (action.tileIndexes.length === 0 || new Set(action.tileIndexes).size !== action.tileIndexes.length) {
    return refuse("E_ACTION_ILLEGAL", "select at least one tile, each once");
  }
  for (const index of action.tileIndexes) {
    const boardTile = state.board.tiles[index];
    const tile = state.tiles[index];
    if (!boardTile || !tile || !isOwnable(boardTile) || tile.ownerId !== action.by) {
      return refuse("E_ACTION_ILLEGAL", `${action.by} does not own tile ${index}`);
    }
    if (tile.mortgaged) {
      return refuse("E_TILE_MORTGAGED", `tile ${index} is already mortgaged`);
    }
    if (tile.houses > 0 || tile.hotel) {
      return refuse("E_MORTGAGE_HAS_BUILDINGS", `tile ${index} has buildings`);
    }
  }
  return OK;
}

export function applyMortgage(ctx: Ctx, action: Mortgage): void {
  let proceeds = 0;
  for (const index of action.tileIndexes) {
    ctx.state.tiles[index]!.mortgaged = true;
    proceeds += mortgageValue(ctx.state, index);
  }
  bankPays(ctx, action.by, proceeds);
  emit(ctx, { kind: "mortgaged", playerId: action.by, tileIndexes: action.tileIndexes, proceeds });
}

export function validateRedeem(state: MatchState, action: Redeem): ValidationResult {
  const base = all(
    matchIsLive(state),
    actorInMatch(state, action),
    isActorsTurn(state, action.by),
    noOpenDebt(state, action.by),
    notJailBlocked(state, action.by),
    inStage(state, "preRoll", "postRoll"),
  );
  if (!base.ok) {
    return base;
  }
  if (action.tileIndexes.length === 0 || new Set(action.tileIndexes).size !== action.tileIndexes.length) {
    return refuse("E_ACTION_ILLEGAL", "select at least one tile, each once");
  }
  let total = 0;
  for (const index of action.tileIndexes) {
    const tile = state.tiles[index];
    if (!tile || tile.ownerId !== action.by || !tile.mortgaged) {
      return refuse("E_ACTION_ILLEGAL", `tile ${index} is not a mortgaged tile of ${action.by}`);
    }
    total += redeemCost(state, index);
  }
  const player = state.players[action.by]!;
  // Edge case #20: insufficient cash disables Redeem; no debt is created.
  return player.cash >= total ? OK : refuse("E_REDEEM_INSUFFICIENT", `redeeming costs ${total}`);
}

export function applyRedeem(ctx: Ctx, action: Redeem): void {
  let cost = 0;
  for (const index of action.tileIndexes) {
    cost += redeemCost(ctx.state, index);
    ctx.state.tiles[index]!.mortgaged = false;
  }
  payBank(ctx, action.by, cost);
  emit(ctx, { kind: "redeemed", playerId: action.by, tileIndexes: action.tileIndexes, cost });
}

/** Everything a raise-cash screen could raise, per route (docs/flows/raise-cash.md "Route maths"). */
export function raiseCashHeadroom(state: MatchState, playerId: string): { mortgage: number; sell: number } {
  let mortgage = 0;
  let sell = 0;
  state.tiles.forEach((tile, index) => {
    if (tile.ownerId !== playerId) {
      return;
    }
    const boardTile = state.board.tiles[index];
    if (!boardTile || !isOwnable(boardTile)) {
      return;
    }
    if (!tile.mortgaged && tile.houses === 0 && !tile.hotel) {
      mortgage += mortgageValue(state, index);
    }
    if (boardTile.kind === "property") {
      sell += tile.houses * resolvePrice(boardTile.sellHouse, resolvePrice(boardTile.houseCost, boardTile.cost));
      sell += tile.hotel ? resolvePrice(boardTile.sellHotel, resolvePrice(boardTile.hotelCost, boardTile.cost)) : 0;
    }
    // A mortgaged deed cannot be sold until it is redeemed (OQ-20 item 1), so it raises nothing
    // more on this route — its cash was already drawn when it was mortgaged.
    if (tile.mortgaged) {
      return;
    }
    sell += boardTile.kind === "property"
      ? resolvePrice(boardTile.sellProperty, boardTile.cost)
      : resolvePrice(boardTile.sellToBank, boardTile.cost);
  });
  return { mortgage, sell };
}
