// Rent (rulebook §7).
//
//   rent(tile, owner, state, diceTotal) =
//     0                                   if mortgaged, under auction, or owner in jail with
//                                         "collects rent while held" off
//     utilityRent(tile, owner, diceTotal) if utility
//     buildingRent(tile)                  if houses > 0 or hotel
//     baseRent × (holdsSet ? 2 : 1)       otherwise
//
// Card effects (rentMultiplier, rentWaiver) modify the result last, in applyRentEffects.

import { resolvePrice } from "./pricing";
import { holdsSet } from "./sets";
import type { MatchState, PlayerId, PropertyTile, TileIndex, UtilityTile } from "./state";

/** The rent due on a tile right now; 0 when nothing is owed. Never throws. */
export function rentFor(state: MatchState, tileIndex: TileIndex, diceTotal?: number): number {
  const tile = state.tiles[tileIndex];
  const boardTile = state.board.tiles[tileIndex];
  if (!tile || !boardTile || tile.ownerId === null) {
    return 0;
  }
  if (tile.mortgaged || tile.underAuction) {
    return 0;
  }
  if (ownerHeldWithoutRent(state, tile.ownerId)) {
    return 0;
  }

  switch (boardTile.kind) {
    case "utility":
      return utilityRent(state, boardTile, tile.ownerId, diceTotal);
    case "property":
      return propertyRent(state, boardTile, tile.ownerId, tileIndex);
    case "card":
    case "corner":
      return 0;
  }
}

/** True when the owner is in jail and the board's jail corner says rent is not collected. */
function ownerHeldWithoutRent(state: MatchState, ownerId: PlayerId): boolean {
  const owner = state.players[ownerId];
  if (!owner || !owner.jail.in) {
    return false;
  }
  const jail = state.board.tiles.find((candidate) => candidate.kind === "corner" && candidate.cornerType === "jail");
  // No jail tile on the board: nothing can switch rent off.
  return jail !== undefined && jail.kind === "corner" && !jail.collectRentWhileHeld;
}

/** utilityRent = diceTotal × multiplier[utilitiesOwned], clamped to the 4-entry table. */
function utilityRent(state: MatchState, tile: UtilityTile, ownerId: PlayerId, diceTotal: number | undefined): number {
  if (tile.rentBasis === "fixed") {
    return tile.fixedRent ?? 0;
  }
  if (diceTotal === undefined) {
    return 0;
  }
  const owned = utilitiesOwnedBy(state, ownerId);
  const multiplier = tile.multipliers[Math.min(owned, tile.multipliers.length) - 1] ?? 0; // 5+ utilities reuse the last entry — OQ-20 item 4
  return diceTotal * multiplier;
}

function utilitiesOwnedBy(state: MatchState, ownerId: PlayerId): number {
  return state.board.tiles.filter((boardTile, index) => boardTile.kind === "utility" && state.tiles[index]?.ownerId === ownerId).length;
}

/** Building rent reads the tile's own house/hotel figures; the set multiplier applies to base rent only. */
function propertyRent(state: MatchState, tile: PropertyTile, ownerId: PlayerId, tileIndex: TileIndex): number {
  const built = state.tiles[tileIndex];
  if (!built) {
    return 0;
  }
  if (built.hotel) {
    return resolvePrice(tile.hotelRent, tile.cost);
  }
  if (built.houses > 0) {
    const ladder = tile.houseRent[built.houses - 1];
    return ladder ? resolvePrice(ladder, tile.cost) : 0;
  }
  const base = resolvePrice(tile.baseRent, tile.cost);
  return holdsSet(state, ownerId, tile.groupId) ? base * 2 : base;
}

/** Active card effects on a rent payment: a waiver skips it; a multiplier scales it (×2). */
export interface RentEffects {
  waiver: boolean;
  multiplier: number;
}

export function applyRentEffects(rent: number, effects: RentEffects): number {
  if (effects.waiver) {
    return 0;
  }
  return rent * effects.multiplier;
}
