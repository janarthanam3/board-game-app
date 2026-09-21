// Net worth, the round cap and standings (rulebook §14).

import { resolvePrice } from "./pricing";
import { isSolvent, type MatchState, type PlayerId } from "./state";

/**
 * netWorth = cash + unmortgaged tiles at cost + mortgaged tiles at half cost
 *          + houses × house cost + hotels × hotel cost
 */
export function netWorth(state: MatchState, playerId: PlayerId): number {
  const player = state.players[playerId];
  if (!player) {
    return 0;
  }
  let worth = player.cash;
  state.tiles.forEach((tile, index) => {
    if (tile.ownerId !== playerId) {
      return;
    }
    const boardTile = state.board.tiles[index];
    if (!boardTile || (boardTile.kind !== "property" && boardTile.kind !== "utility")) {
      return;
    }
    // "Mortgaged tiles count at half value" (3m); integer rupees, so halves round down.
    worth += tile.mortgaged ? Math.floor(boardTile.cost / 2) : boardTile.cost; // floor is unstated — OQ-20 item 3
    if (boardTile.kind === "property") {
      worth += tile.houses * resolvePrice(boardTile.houseCost, boardTile.cost);
      if (tile.hotel) {
        worth += resolvePrice(boardTile.hotelCost, boardTile.cost);
      }
    }
  });
  return worth;
}

function tilesOwned(state: MatchState, playerId: PlayerId): number {
  return state.tiles.filter((tile) => tile.ownerId === playerId).length;
}

function buildingsOwned(state: MatchState, playerId: PlayerId): number {
  return state.tiles
    .filter((tile) => tile.ownerId === playerId)
    .reduce((sum, tile) => sum + tile.houses + (tile.hotel ? 1 : 0), 0);
}

/**
 * Standings, best first: solvent players by net worth, ties broken by most tiles, most buildings,
 * lowest seat (rulebook §14, edge case #33); eliminated players after them, latest out first.
 */
export function standings(state: MatchState): PlayerId[] {
  const players = Object.values(state.players);
  const solvent = players.filter(isSolvent).sort((a, b) => {
    const worth = netWorth(state, b.id) - netWorth(state, a.id);
    if (worth !== 0) return worth;
    const tiles = tilesOwned(state, b.id) - tilesOwned(state, a.id);
    if (tiles !== 0) return tiles;
    const buildings = buildingsOwned(state, b.id) - buildingsOwned(state, a.id);
    if (buildings !== 0) return buildings;
    return a.seat - b.seat;
  });
  const out = players
    .filter((player) => !isSolvent(player))
    .sort((a, b) => (b.bankrupt?.round ?? 0) - (a.bankrupt?.round ?? 0) || a.seat - b.seat);
  return [...solvent, ...out].map((player) => player.id);
}

export function solventPlayers(state: MatchState): PlayerId[] {
  return state.seatOrder.filter((id) => {
    const player = state.players[id];
    return player !== undefined && isSolvent(player);
  });
}
