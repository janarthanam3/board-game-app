// MatchState → the shapes `BoardMap` (E2) renders: the ring of tiles and the player tokens
// (docs/screens/1c-play-hud.md §3 #5–#8, §11 AC3 and AC5).

import type { MatchState, PlayerId } from "@royal-navy/game-engine";
import { frame, responsive } from "@royal-navy/shared";

import type { BoardShape, BoardTileShape, PlayerTokenShape } from "../../ui/board";
import { seatFlat } from "../../ui/seat";

export function boardShape(state: MatchState): BoardShape {
  const colourOf = new Map(state.board.groups.map((group) => [group.id, group.colour]));

  return {
    rows: state.board.rows,
    cols: state.board.cols,
    tiles: state.board.tiles.map((tile, index): BoardTileShape => {
      const owned = state.tiles[index];
      const owner = owned?.ownerId === undefined || owned.ownerId === null ? null : state.players[owned.ownerId];
      const base = {
        name: tile.name,
        ...(owner ? { ownerColour: seatFlat(owner.colour), ownerName: owner.name } : {}),
        ...(owned && owned.houses > 0 ? { houses: owned.houses } : {}),
        ...(owned?.hotel ? { hotel: true } : {}),
      };
      switch (tile.kind) {
        case "property":
          return { kind: "property", cost: tile.cost, groupColour: colourOf.get(tile.groupId), ...base };
        case "utility":
          return { kind: "utility", cost: tile.cost, ...base };
        case "card":
          return { kind: "card", ...base };
        case "corner":
          // §3 #7: a corner shows its label where another tile shows its name.
          return { kind: "corner", corner: tile.name, ...base };
      }
    }),
  };
}

/**
 * One token per solvent player.
 *
 * `active` is the actor's token: the one the view keeps in sight after a move (§6, §11 AC5).
 * `ringed` is the viewer's own token on the viewer's own turn: §5 gives it "a 2dp #FFC84A ring" on
 * "your turn" and says that on another player's turn "the active chip is highlighted **instead**".
 * On your turn both flags land on the same token, which is the case §5 and AC5 agree on; where they
 * differ is recorded in docs/design-concerns.md.
 */
export function playerTokens(state: MatchState, viewerId: PlayerId | null): PlayerTokenShape[] {
  return state.seatOrder.flatMap((id) => {
    const player = state.players[id];
    if (!player || player.bankrupt !== null) {
      return [];
    }
    return [
      {
        playerId: id,
        name: player.name,
        colour: seatFlat(player.colour),
        tileIndex: player.position,
        active: state.turn.playerId === id,
        ringed: viewerId === id && state.turn.playerId === id,
      },
    ];
  });
}

/**
 * The board keeps a 1:1 aspect and takes the content column's width (§8). docs/12 holds it to a
 * minimum 240 dp square; on a tablet or in landscape it takes 60% of the split (§8).
 */
export const BOARD_MIN_SIZE = 240;

export function boardViewport(windowWidth: number, split: boolean): number {
  const column =
    windowWidth >= responsive.tabletMinWidth
      ? Math.min(windowWidth, responsive.tabletContentMaxWidth)
      : windowWidth;
  const content = column - frame.padding * 2;
  return Math.max(BOARD_MIN_SIZE, Math.round(split ? content * SPLIT_BOARD_FRACTION : content));
}

/** §8: "Tablet: board left (60%), strip + holdings right (40%)". */
export const SPLIT_BOARD_FRACTION = 0.6;
