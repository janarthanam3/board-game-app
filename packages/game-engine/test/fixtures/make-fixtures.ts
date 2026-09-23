// Builds the five fixtures SPEC.md "Testing hooks" names. The JSON files beside this module are
// generated from these functions (`pnpm --filter game-engine fixtures`), and fixtures.test.ts
// asserts the committed JSON still matches — so a state-shape change cannot silently rot them.
//
// Every name here is a Chennai / Royal Navy name: no trademarked property names in any fixture
// (CLAUDE.md, rulebook §20).

import { createMatch, type MatchSetup } from "../../src/match";
import type { FrozenBoard, FrozenTile, MatchState } from "../../src/state";
import { testBoard, testRules } from "../support/state";

const NAVEEN = "p-naveen";
const PRIYA = "p-priya";
const ARUN = "p-arun";
const MEERA = "p-meera";

const FOUR = [
  { id: NAVEEN, name: "Naveen", colour: "gold" as const },
  { id: PRIYA, name: "Priya", colour: "blue" as const },
  { id: ARUN, name: "Arun", colour: "green" as const },
  { id: MEERA, name: "Meera", colour: "red" as const },
];

function setupWith(overrides: Partial<MatchSetup>): MatchSetup {
  return {
    id: "m-fixture",
    mode: "online",
    board: testBoard(),
    rules: testRules(),
    players: FOUR.slice(0, 2),
    seed: 20260923,
    atMs: 0,
    ...overrides,
  };
}

/** The 16-tile Chennai board the engine tests run on, at turn 1. */
export function chennai16(): MatchState {
  return createMatch(setupWith({ id: "m-chennai-16" }));
}

/**
 * A 40-tile ring (11 × 11 = 2r + 2c − 4), the classic size from rulebook §1. Twenty-eight
 * properties in seven colour groups, four corners, four card spaces and four utilities.
 */
export function classic40(): MatchState {
  return createMatch(setupWith({ id: "m-classic-40", board: classicBoard(), players: FOUR }));
}

/**
 * Restates the bank ledger so cashConservation holds: whatever the players no longer hold was
 * absorbed by the bank (deeds and houses bought from it).
 */
function balanceLedger(state: MatchState): MatchState {
  const held =
    Object.values(state.players).reduce((sum, player) => sum + player.cash, 0) +
    state.bank.finePot +
    (state.auction ? Object.values(state.auction.escrow).reduce((sum, amount) => sum + amount, 0) : 0);
  state.bank.ledger.absorbed = state.bank.ledger.issued - held;
  return state;
}

/** Four players a few turns in: deeds held, houses standing, one tile mortgaged. */
export function midgame4p(): MatchState {
  const state = createMatch(setupWith({ id: "m-midgame-4p", players: FOUR }));
  // One house on each of the three purple tiles Naveen holds. The other two tiles in the group
  // sit at 0, so the ladder spans 1 — even build allows that (rulebook §4, and see OQ-21 item 4).
  for (const tileIndex of [1, 2, 3]) {
    state.tiles[tileIndex]!.ownerId = NAVEEN;
    state.tiles[tileIndex]!.houses = 1;
    state.bank.houses -= 1;
  }
  for (const tileIndex of [5, 6, 9]) {
    state.tiles[tileIndex]!.ownerId = PRIYA;
  }
  state.tiles[10]!.ownerId = ARUN;
  state.tiles[10]!.mortgaged = true;
  state.players[NAVEEN]!.cash = 6_200;
  state.players[PRIYA]!.cash = 8_400;
  state.players[ARUN]!.cash = 9_100;
  state.players[MEERA]!.cash = 10_000;
  // The ledger stays honest: nothing above moved money, only deeds and buildings.
  state.round = 3;
  state.turn = { playerId: ARUN, stage: "preRoll", doublesThisTurn: 0, dice: null, deadlineMs: null };
  return balanceLedger(state);
}

/** Naveen owes Priya rent he cannot pay: a debt stands and the turn is blocked in raiseCash. */
export function debtPending(): MatchState {
  const state = createMatch(setupWith({ id: "m-debt-pending", players: FOUR.slice(0, 2) }));
  state.tiles[5]!.ownerId = PRIYA;   // Mount Road, where Naveen has landed
  state.tiles[1]!.ownerId = NAVEEN;  // one deed left to mortgage
  state.players[NAVEEN]!.cash = 40;
  state.players[NAVEEN]!.position = 5;
  state.debts = [{ id: "debt-1", debtorId: NAVEEN, creditorId: PRIYA, amount: 350, createdRound: 1, payTo: "creditor" }];
  state.turn = { playerId: NAVEEN, stage: "raiseCash", doublesThisTurn: 0, dice: [2, 3], deadlineMs: null };
  return balanceLedger(state);
}

/** A lot open on Bay Road with one bid escrowed and one bidder passed. */
export function auctionLive(): MatchState {
  const state = createMatch(setupWith({ id: "m-auction-live", players: FOUR.slice(0, 3) }));
  state.tiles[2]!.underAuction = true;
  state.players[PRIYA]!.cash = 10_000 - 1_500;
  state.auction = {
    tileIndex: 2,
    minBid: 1_400,
    leadingBid: 1_500,
    leadingBidderId: PRIYA,
    escrow: { [PRIYA]: 1_500 },
    passed: [ARUN],
    deadlineMs: 30_000,
    resumeStage: "postRoll",
  };
  state.turn = { playerId: NAVEEN, stage: "auction", doublesThisTurn: 0, dice: [1, 1], deadlineMs: null };
  return balanceLedger(state);
}

export const fixtures = {
  "chennai-16": chennai16,
  "classic-40": classic40,
  "midgame-4p": midgame4p,
  "debt-pending": debtPending,
  "auction-live": auctionLive,
} as const;

export type FixtureName = keyof typeof fixtures;

// ─── The 40-tile board ──────────────────────────────────────────────────────────

const GROUPS = [
  { id: "g-purple", colour: "purple", names: ["Marina Drive", "Bay Road", "Fort Street"] },
  { id: "g-sky", colour: "sky", names: ["Mount Road", "Anna Salai", "Harbour Lane"] },
  { id: "g-rose", colour: "rose", names: ["Beach Road", "Mylapore", "Adyar"] },
  { id: "g-amber", colour: "amber", names: ["Besant Nagar", "Triplicane", "Egmore"] },
  { id: "g-green", colour: "green", names: ["Nungambakkam", "Kodambakkam", "Saidapet"] },
  { id: "g-teal", colour: "teal", names: ["Velachery", "Guindy", "Perungudi"] },
  { id: "g-coral", colour: "coral", names: ["Thiruvanmiyur", "Kottivakkam", "Neelankarai"] },
] as const;

function property(name: string, groupId: string, cost: number): FrozenTile {
  return {
    kind: "property",
    name,
    groupId,
    cost,
    mortgage: { mode: "percent", percent: 50 },
    baseRent: { mode: "percent", percent: 2.5 },
    houseCost: { mode: "percent", percent: 20 },
    hotelCost: { mode: "percent", percent: 50 },
    houseRent: [
      { mode: "percent", percent: 5 },
      { mode: "percent", percent: 10 },
      { mode: "percent", percent: 20 },
      { mode: "percent", percent: 30 },
    ] as const,
    hotelRent: { mode: "percent", percent: 54 },
    sellHouse: { mode: "percent", percent: 50 },
    sellHotel: { mode: "percent", percent: 50 },
    sellProperty: { mode: "percent", percent: 70 },
  } as FrozenTile;
}

function classicBoard(): FrozenBoard {
  const tiles: FrozenTile[] = [];
  const groups: FrozenBoard["groups"] = [];
  const corner = (name: string, cornerType: "jail" | "restHouse" | "none", extras: Partial<Extract<FrozenTile, { kind: "corner" }>> = {}): FrozenTile =>
    ({
      kind: "corner",
      name,
      cornerType,
      drawMode: "fixed",
      getOut: null,
      stayHere: null,
      getIn: null,
      blockActionsWhileHeld: true,
      collectRentWhileHeld: true,
      ...extras,
    }) as FrozenTile;

  tiles.push(corner("Start", "none"));
  let groupIndex = 0;
  // Four sides of nine tiles plus the four corners = 40.
  for (let side = 0; side < 4; side++) {
    for (let step = 0; step < 9; step++) {
      const index = tiles.length;
      if (step === 2) {
        tiles.push({ kind: "card", name: side % 2 === 0 ? "Chance" : "Community fund", cardType: side % 2 === 0 ? "chance" : "chest", deckId: "d-chance" } as FrozenTile);
        continue;
      }
      if (step === 6) {
        tiles.push({
          kind: "utility",
          name: ["City Club", "Harbour Ferry", "Metro Line", "Power House"][side] ?? "City Club",
          cost: 900,
          mortgage: { mode: "percent", percent: 50 },
          rentBasis: "dice",
          multipliers: [4, 10, 16, 20],
          fixedRent: null,
          sellToBank: { mode: "percent", percent: 70 },
        } as FrozenTile);
        continue;
      }
      const group = GROUPS[groupIndex % GROUPS.length]!;
      const placed = groups.find((candidate) => candidate.id === group.id);
      const position = placed ? placed.tileIndexes.length : 0;
      tiles.push(property(group.names[position] ?? `${group.colour} ${position + 1}`, group.id, 1_200 + groupIndex * 200 + position * 100));
      if (placed) {
        placed.tileIndexes.push(index);
      } else {
        groups.push({ id: group.id, colour: group.colour, tileIndexes: [index], thresholdOverride: null });
      }
      if (position === 2) {
        groupIndex++;
      }
    }
    if (side < 3) {
      const name = ["Jail", "Rest house", "Checkpoint"][side]!;
      const type = (["jail", "restHouse", "none"] as const)[side]!;
      tiles.push(
        corner(
          name,
          type,
          type === "jail"
            ? { getOut: { amount: 5_000, maxRoundsHeld: 3, doubleToGetOut: true, useJailPassCard: true }, getIn: { amount: 100, payTo: "bank" } }
            : type === "restHouse"
              ? { stayHere: { perSkipTurnAmount: 1_000, useFreeRestHouseCard: true } }
              : {},
        ),
      );
    }
  }

  return {
    boardVersionId: "bv-classic-40",
    name: "Chennai 40 (fixture)",
    rows: 11,
    cols: 11,
    tiles,
    groups,
    decks: [{ id: "d-chance", name: "Chance", drawMode: "shuffle", fallback: "nothing", rules: [] }],
    houseSupply: 32,
    hotelSupply: 12,
  };
}

export function writeFixtures(writeFile: (name: string, json: string) => void): void {
  for (const [name, build] of Object.entries(fixtures)) {
    writeFile(name, `${JSON.stringify(build(), null, 2)}\n`);
  }
}
