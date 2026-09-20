// Colour sets and thresholds (rulebook §4).

import type { ColourGroup, GroupId, MatchState, PlayerId } from "./state";

function groupOf(state: MatchState, groupId: GroupId): ColourGroup {
  const group = state.board.groups.find((candidate) => candidate.id === groupId);
  if (!group) {
    throw new Error(`sets: unknown group ${groupId}`);
  }
  return group;
}

/**
 * threshold(group) = override, else group.size (All tiles), floor(size / 2) + 1 (Majority),
 * or the custom value (Custom).
 */
export function thresholdFor(state: MatchState, groupId: GroupId): number {
  const group = groupOf(state, groupId);
  if (group.thresholdOverride !== null) {
    return group.thresholdOverride;
  }
  const size = group.tileIndexes.length;
  switch (state.rules.sets.mode) {
    case "allTiles":
      return size;
    case "majority":
      return Math.floor(size / 2) + 1;
    case "custom":
      // The board validator guarantees a custom value exists when the mode is custom.
      return state.rules.sets.customValue ?? size;
  }
}

/** The Custom stepper enforces more than half the group size and at most the whole group (B5). */
export function isCustomThresholdValid(groupSize: number, value: number): boolean {
  return Number.isInteger(value) && value > groupSize / 2 && value <= groupSize;
}

/**
 * Tiles of the group this player owns that count toward the threshold. With "Mortgage breaks the
 * set" on, a mortgaged tile does not count.
 */
export function countTowardSet(state: MatchState, playerId: PlayerId, groupId: GroupId): number {
  const group = groupOf(state, groupId);
  return group.tileIndexes.filter((index) => {
    const tile = state.tiles[index];
    if (!tile || tile.ownerId !== playerId) {
      return false;
    }
    return !(state.rules.sets.mortgageBreaksSet && tile.mortgaged);
  }).length;
}

export function holdsSet(state: MatchState, playerId: PlayerId, groupId: GroupId): boolean {
  return countTowardSet(state, playerId, groupId) >= thresholdFor(state, groupId);
}

export interface SetProgress {
  owned: number;
  size: number;
  threshold: number;
  held: boolean;
  /** How many more tiles would hold the set; 0 when held. */
  needed: number;
}

/** The 1j pip row: "3 of 5 · set held" or "2 of 5 · need 1 more". */
export function setProgress(state: MatchState, playerId: PlayerId, groupId: GroupId): SetProgress {
  const group = groupOf(state, groupId);
  const owned = countTowardSet(state, playerId, groupId);
  const threshold = thresholdFor(state, groupId);
  const held = owned >= threshold;
  return { owned, size: group.tileIndexes.length, threshold, held, needed: held ? 0 : threshold - owned };
}

export type GroupValidation =
  | { level: "ok" }
  | { level: "error"; message: string; detail: string }
  | { level: "warning"; message: string; detail: string };

/**
 * The Rule lab's checks (rulebook §4 "Hard error (D3)"): a group whose tile count is below its
 * threshold can never be held — a save- and publish-blocking error. Majority on an even group is
 * a warning. Copy is the design's, with the colour name capitalised.
 */
export function validateGroup(state: MatchState, groupId: GroupId): GroupValidation {
  const group = groupOf(state, groupId);
  const size = group.tileIndexes.length;
  const threshold = thresholdFor(state, groupId);
  const colour = capitalise(group.colour);

  if (size < threshold) {
    return {
      level: "error",
      message: `${colour} set has ${size} tiles, threshold ${threshold}`,
      detail: "This set can never be held",
    };
  }
  if (state.rules.sets.mode === "majority" && group.thresholdOverride === null && size % 2 === 0) {
    const half = size / 2;
    return {
      level: "warning",
      message: "Majority needs an odd group size",
      detail: `${colour} has ${size} tiles — a ${half} and ${half} split holds no set`,
    };
  }
  return { level: "ok" };
}

function capitalise(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
