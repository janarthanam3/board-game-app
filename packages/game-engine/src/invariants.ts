// Every invariant from SPEC.md "Invariants (must always hold)", as a runnable check. The reducer
// contract says checkInvariants(apply(s, a).state) must be [] after every legal action; the
// property suite and the server both call it.

import { isOwnable, isSolvent, type MatchState, type PlayerId, type TileIndex } from "./state";

export type InvariantName =
  | "cashNonNegative"
  | "cashConservation"
  | "houseSupply"
  | "hotelSupply"
  | "buildLimits"
  | "ownershipUnique"
  | "mortgageConsistency"
  | "seatIntegrity"
  | "turnActor"
  | "auctionExclusive"
  | "debtBlocking"
  | "roundMonotonic"
  | "logAppendOnly"
  | "rngMonotonic";

export interface InvariantViolation {
  name: InvariantName;
  /** Names the offending player, tile or value so a bug report can quote it. */
  message: string;
}

type Check = (state: MatchState) => InvariantViolation[];

function violation(name: InvariantName, message: string): InvariantViolation {
  return { name, message };
}

// ─── State invariants ───────────────────────────────────────────────────────────

/** every player.cash ≥ 0 */
const cashNonNegative: Check = (state) =>
  Object.values(state.players)
    .filter((player) => player.cash < 0)
    .map((player) => violation("cashNonNegative", `${player.id} has cash ${player.cash}`));

/**
 * Σ player cash + bank.finePot + escrowed bids = ledger.issued − ledger.absorbed.
 * Money only enters through the ledger (starting cash, pass bonus, card payouts) and only leaves
 * through it (purchases, taxes, bail), so the total in play is always known.
 */
const cashConservation: Check = (state) => {
  const playerCash = Object.values(state.players).reduce((sum, player) => sum + player.cash, 0);
  const escrowed = state.auction
    ? Object.values(state.auction.escrow).reduce((sum, amount) => sum + amount, 0)
    : 0;
  const held = playerCash + state.bank.finePot + escrowed;
  const expected = state.bank.ledger.issued - state.bank.ledger.absorbed;
  return held === expected
    ? []
    : [violation("cashConservation", `money in play is ${held} but the ledger says ${expected}`)];
};

/** bank.houses + Σ tile.houses = board.houseSupply */
const houseSupply: Check = (state) => {
  const onBoard = state.tiles.reduce((sum, tile) => sum + tile.houses, 0);
  const total = state.bank.houses + onBoard;
  return total === state.board.houseSupply
    ? []
    : [violation("houseSupply", `bank ${state.bank.houses} + board ${onBoard} = ${total}, supply is ${state.board.houseSupply}`)];
};

/** bank.hotels + Σ tile.hotel = board.hotelSupply */
const hotelSupply: Check = (state) => {
  const onBoard = state.tiles.filter((tile) => tile.hotel).length;
  const total = state.bank.hotels + onBoard;
  return total === state.board.hotelSupply
    ? []
    : [violation("hotelSupply", `bank ${state.bank.hotels} + board ${onBoard} = ${total}, supply is ${state.board.hotelSupply}`)];
};

/** 0 ≤ tile.houses ≤ 4; tile.hotel ⇒ tile.houses === 0 */
const buildLimits: Check = (state) =>
  state.tiles.flatMap((tile, index) => {
    const found: InvariantViolation[] = [];
    if (tile.houses < 0 || tile.houses > 4) {
      found.push(violation("buildLimits", `tile ${index} has ${tile.houses} houses`));
    }
    if (tile.hotel && tile.houses !== 0) {
      found.push(violation("buildLimits", `tile ${index} has a hotel and ${tile.houses} houses`));
    }
    return found;
  });

/**
 * When Build evenly is on, within a group max(houses) − min(houses) ≤ 1 over the tiles that do not
 * hold a hotel (see houseLadder below). Reading a hotel as a sixth level instead let a legal
 * BUILD or SELL hotel break this invariant; SPEC.md states the ladder rule (OQ-15 item 3, answered).
 */
// Even build is **not** a state invariant. Under the holder's-tiles reading (OQ-21 item 4,
// answered) a player may legally hold 3 · 3 · 3 in a group and then buy, win or be given a fourth
// tile, which joins their ladder at 0 houses — a spread of 3 that no action did anything wrong to
// produce. Building that newcomer up to 1 is legal too (it is the lowest tile), giving 3 · 3 · 3 · 1.
// So the rule constrains BUILD and SELL, and lives in reducer/property.ts with the other
// validation; `houseLadder` below is the measure both it and any future checker share.
/**
 * The houses to compare for even build: the tiles in the group that **`ownerId` holds** and that do
 * not hold a hotel.
 *
 * Two readings sit behind this (both answered):
 * - A hotel completes its tile and leaves the house ladder — §8: selling a hotel "does not
 *   automatically re-place 4 houses". Reading it as a sixth level makes a legal BUILD or SELL
 *   hotel break this invariant (OQ-15 item 3).
 * - The ladder covers only the holder's own tiles (OQ-21 item 4). Measuring across the whole
 *   group caps a Majority holder at one house per tile for ever, because the tiles they do not own
 *   sit at 0 and nobody can raise them — which switches building off in that mode entirely.
 */
export function houseLadder(state: MatchState, tileIndexes: readonly TileIndex[], ownerId: PlayerId): number[] {
  return tileIndexes
    .filter((index) => state.tiles[index]?.ownerId === ownerId && !state.tiles[index]?.hotel)
    .map((index) => state.tiles[index]?.houses ?? 0);
}

/** A tile's owner is a solvent player in the match, and only ownable tiles are owned. */
const ownershipUnique: Check = (state) =>
  state.tiles.flatMap((tile, index) => {
    if (tile.ownerId === null) {
      return [];
    }
    const boardTile = state.board.tiles[index];
    if (!boardTile || !isOwnable(boardTile)) {
      return [violation("ownershipUnique", `tile ${index} cannot be owned but has owner ${tile.ownerId}`)];
    }
    const owner = state.players[tile.ownerId];
    if (!owner) {
      return [violation("ownershipUnique", `tile ${index} is owned by ${tile.ownerId}, who is not in the match`)];
    }
    if (!isSolvent(owner)) {
      return [violation("ownershipUnique", `tile ${index} is owned by bankrupt player ${owner.id}`)];
    }
    return [];
  });

/**
 * tile.mortgaged ⇒ no houses, no hotel.
 *
 * The deed does **not** have to be owned: OQ-20 item 2 (answered) keeps the mortgage on a deed
 * that reaches the bank, so the bank can hold a mortgaged tile while it waits to be auctioned,
 * after a lot goes unsold, and on a board with auctions switched off (edge case #43). Whoever
 * takes it next inherits the redeem cost.
 */
const mortgageConsistency: Check = (state) =>
  state.tiles.flatMap((tile, index) => {
    if (!tile.mortgaged) {
      return [];
    }
    const found: InvariantViolation[] = [];
    if (tile.houses !== 0 || tile.hotel) {
      found.push(violation("mortgageConsistency", `tile ${index} is mortgaged with buildings on it`));
    }
    return found;
  });

/** seatOrder is a permutation of Object.keys(players) */
const seatIntegrity: Check = (state) => {
  const playerIds = Object.keys(state.players).sort();
  const seats = [...state.seatOrder].sort();
  const same = playerIds.length === seats.length && playerIds.every((id, i) => id === seats[i]);
  return same
    ? []
    : [violation("seatIntegrity", `seatOrder [${state.seatOrder.join(", ")}] is not a permutation of players [${playerIds.join(", ")}]`)];
};

/**
 * turn.playerId is a solvent player. "Connected-or-auto-played": a disconnected actor is played
 * by the server after the grace period, so connection is not a state condition here.
 */
const turnActor: Check = (state) => {
  const actor = state.players[state.turn.playerId];
  if (!actor) {
    return [violation("turnActor", `turn actor ${state.turn.playerId} is not in the match`)];
  }
  if (!isSolvent(actor)) {
    return [violation("turnActor", `turn actor ${actor.id} is bankrupt`)];
  }
  return [];
};

/** At most one live auction, and exactly its tile is marked underAuction. */
const auctionExclusive: Check = (state) => {
  const marked = state.tiles.flatMap((tile, index) => (tile.underAuction ? [index] : []));
  if (state.auction === null) {
    return marked.length === 0
      ? []
      : [violation("auctionExclusive", `tiles [${marked.join(", ")}] are underAuction with no live auction`)];
  }
  if (marked.length !== 1 || marked[0] !== state.auction.tileIndex) {
    return [violation("auctionExclusive", `live auction is on tile ${state.auction.tileIndex} but underAuction tiles are [${marked.join(", ")}]`)];
  }
  return [];
};

/**
 * Every debt is a positive amount owed by a solvent player to a player or the bank, and the actor
 * cannot be doing anything but raising cash while they owe one. (That the legal-action set is
 * restricted to the raise-cash routes and bankruptcy is asserted on legalActions() itself.)
 */
const debtBlocking: Check = (state) =>
  state.debts.flatMap((debt) => {
    const found: InvariantViolation[] = [];
    const debtor = state.players[debt.debtorId];
    if (!debtor || !isSolvent(debtor)) {
      found.push(violation("debtBlocking", `debt ${debt.id} is owed by ${debt.debtorId}, who is not a solvent player`));
    }
    if (debt.creditorId !== "bank" && !state.players[debt.creditorId]) {
      found.push(violation("debtBlocking", `debt ${debt.id} is owed to ${debt.creditorId}, who is not in the match`));
    }
    if (!(debt.amount > 0)) {
      found.push(violation("debtBlocking", `debt ${debt.id} has amount ${debt.amount}`));
    }
    if (debt.debtorId === state.turn.playerId && state.turn.stage !== "raiseCash") {
      found.push(violation("debtBlocking", `actor ${debt.debtorId} owes debt ${debt.id} but the turn is in stage ${state.turn.stage}`));
    }
    return found;
  });

const stateChecks: readonly Check[] = [
  cashNonNegative,
  cashConservation,
  houseSupply,
  hotelSupply,
  buildLimits,
  ownershipUnique,
  mortgageConsistency,
  seatIntegrity,
  turnActor,
  auctionExclusive,
  debtBlocking,
];

/** Runs every state invariant. [] means healthy. */
export function checkInvariants(state: MatchState): InvariantViolation[] {
  return stateChecks.flatMap((check) => check(state));
}

// ─── Transition invariants ──────────────────────────────────────────────────────
// These compare the state before and after an action; they cannot be judged from one state.

/**
 * roundMonotonic, rngMonotonic and logAppendOnly across one transition. The reducer contract's
 * "apply never mutates its argument" is what makes `before` trustworthy here.
 */
export function checkTransitionInvariants(before: MatchState, after: MatchState): InvariantViolation[] {
  const found: InvariantViolation[] = [];

  if (after.round < before.round) {
    found.push(violation("roundMonotonic", `round went from ${before.round} to ${after.round}`));
  }

  if (after.rng.seed !== before.rng.seed) {
    found.push(violation("rngMonotonic", `rng seed changed from ${before.rng.seed} to ${after.rng.seed}`));
  }
  if (after.rng.cursor < before.rng.cursor) {
    found.push(violation("rngMonotonic", `rng cursor went from ${before.rng.cursor} to ${after.rng.cursor}`));
  }

  if (after.log.length < before.log.length) {
    found.push(violation("logAppendOnly", `log shrank from ${before.log.length} to ${after.log.length} entries`));
  } else {
    for (let i = 0; i < before.log.length; i++) {
      if (!sameEvent(before.log[i], after.log[i])) {
        found.push(violation("logAppendOnly", `log entry ${i} changed`));
        break;
      }
    }
  }

  return found;
}

function sameEvent(a: MatchState["log"][number] | undefined, b: MatchState["log"][number] | undefined): boolean {
  // Log entries are plain data, so a stable JSON comparison is exact.
  return JSON.stringify(a) === JSON.stringify(b);
}

// Exported so tests and the property suite can address one invariant at a time.
export const invariants: Readonly<Record<Exclude<InvariantName, "roundMonotonic" | "logAppendOnly" | "rngMonotonic">, Check>> = {
  cashNonNegative,
  cashConservation,
  houseSupply,
  hotelSupply,
  buildLimits,
  ownershipUnique,
  mortgageConsistency,
  seatIntegrity,
  turnActor,
  auctionExclusive,
  debtBlocking,
};
