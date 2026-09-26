// createMatch and replay (SPEC.md "Public surface", rulebook §19 #3).

import type { Action } from "./actions";
import { emit, makeCtx } from "./reducer/context";
import { apply } from "./reducer/index";
import { beginTurn } from "./reducer/turn";
import type { FrozenBoard, MatchId, MatchMode, MatchState, PlayerColour, PlayerId, PlayerState, Ruleset } from "./state";

export interface MatchSetup {
  id: MatchId;
  mode: MatchMode;
  board: FrozenBoard;
  rules: Ruleset;
  /** In seat order. */
  players: { id: PlayerId; name: string; colour: PlayerColour; ai?: { tier: "easy" | "normal" | "hard" } | null }[];
  seed: number;
  /** When the match starts, for the first log line. */
  atMs: number;
}

/** A live match at the first player's preRoll, with starting cash dealt and the seed stored. */
export function createMatch(setup: MatchSetup): MatchState {
  if (setup.players.length < 2 || setup.players.length > 6) {
    throw new Error("createMatch: 2–6 players");
  }
  const players: Record<PlayerId, PlayerState> = {};
  setup.players.forEach((entry, index) => {
    players[entry.id] = {
      id: entry.id,
      seat: index + 1,
      name: entry.name,
      colour: entry.colour,
      cash: setup.rules.money.startingCash,
      position: 0,
      jail: { in: false, roundsHeld: 0 },
      holdCards: [],
      rentWaivers: 0,
      rentCollectMultiplier: 1,
      freeBuilds: 0,
      skipTurns: 0,
      connected: true,
      bankrupt: null,
      ai: entry.ai ?? null,
    };
  });
  const seatOrder = setup.players.map((entry) => entry.id);
  const first = seatOrder[0]!;
  const startingCash = setup.rules.money.startingCash * setup.players.length;

  const initial: MatchState = {
    version: 1,
    id: setup.id,
    mode: setup.mode,
    phase: "live",
    board: setup.board,
    rules: setup.rules,
    rng: { seed: setup.seed, cursor: 0 },
    round: 1,
    seatOrder,
    turn: { playerId: first, stage: "preRoll", doublesThisTurn: 0, dice: null, deadlineMs: null },
    players,
    tiles: setup.board.tiles.map(() => ({ ownerId: null, houses: 0, hotel: false, mortgaged: false, underAuction: false })),
    bank: {
      houses: setup.board.houseSupply,
      hotels: setup.board.hotelSupply,
      finePot: 0,
      ledger: { issued: startingCash, absorbed: 0 },
      pendingAuctions: [],
    },
    auction: null,
    offers: [],
    debts: [],
    deckCursors: Object.fromEntries(setup.board.decks.map((deck) => [deck.id, 0])),
    log: [],
  };

  const ctx = makeCtx(initial, setup.atMs);
  emit(ctx, { kind: "matchStarted", playerIds: seatOrder, seed: setup.seed });
  emit(ctx, { kind: "roundStarted", round: 1 });
  beginTurn(ctx);
  return ctx.state;
}

/** Replay = actions.reduce(apply, createMatch(setup)). Same seed and actions ⇒ identical state. */
export function replay(setup: MatchSetup, actions: readonly Action[]): MatchState {
  return actions.reduce((state, action) => apply(state, action).state, createMatch(setup));
}
