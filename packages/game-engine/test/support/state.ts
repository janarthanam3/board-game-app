import type {
  FrozenBoard,
  FrozenTile,
  MatchState,
  PlayerId,
  PlayerState,
  Ruleset,
  TileState,
} from "../../src/state";

/**
 * A small, valid match for invariant tests: a 16-slot ring (5×5) with two colour groups, one
 * utility, one card space and one jail corner; two players at ₹10,000 each. Chennai names only.
 */
export const PLAYERS: PlayerId[] = ["p-naveen", "p-priya"];

function property(name: string, groupId: string, cost: number): FrozenTile {
  return {
    kind: "property",
    name,
    groupId,
    cost,
    baseRent: { mode: "percent", percent: 2.5 },
    houseRent: [
      { mode: "percent", percent: 5 },
      { mode: "percent", percent: 10 },
      { mode: "percent", percent: 20 },
      { mode: "percent", percent: 30 },
    ],
    hotelRent: { mode: "percent", percent: 54 },
    mortgage: { mode: "percent", percent: 50 },
    houseCost: { mode: "percent", percent: 21 },
    hotelCost: { mode: "percent", percent: 54 },
    sellHouse: { mode: "percent", percent: 50 },
    sellHotel: { mode: "percent", percent: 50 },
    sellProperty: { mode: "percent", percent: 70 },
  };
}

export function testBoard(): FrozenBoard {
  const tiles: FrozenTile[] = [
    { kind: "corner", name: "Start", cornerType: "none", drawMode: "fixed", getOut: null, stayHere: null, getIn: null, blockActionsWhileHeld: true, collectRentWhileHeld: true },
    property("Marina Drive", "g-purple", 1400),
    property("Bay Road", "g-purple", 1400),
    property("Fort Street", "g-purple", 1200),
    { kind: "card", name: "Chance", cardType: "chance", deckId: "d-chance" },
    property("Mount Road", "g-sky", 2000),
    property("Anna Salai", "g-sky", 2000),
    { kind: "utility", name: "City Club", cost: 900, mortgage: { mode: "percent", percent: 50 }, rentBasis: "dice", multipliers: [4, 10, 16, 20], fixedRent: null, sellToBank: { mode: "percent", percent: 70 } },
    { kind: "corner", name: "Jail", cornerType: "jail", drawMode: "fixed", getOut: { amount: 5000, maxRoundsHeld: 3, doubleToGetOut: true, useJailPassCard: true }, stayHere: null, getIn: { amount: 100, payTo: "bank" }, blockActionsWhileHeld: true, collectRentWhileHeld: true },
    property("Harbour Lane", "g-sky", 2200),
    property("Beach Road", "g-sky", 2200),
    property("Mylapore", "g-sky", 2400),
    { kind: "card", name: "Community fund", cardType: "chest", deckId: "d-chance" },
    property("Adyar", "g-purple", 1600),
    property("Besant Nagar", "g-purple", 1600),
    { kind: "corner", name: "Rest house", cornerType: "restHouse", drawMode: "fixed", getOut: null, stayHere: { perSkipTurnAmount: 1000, useFreeRestHouseCard: true }, getIn: null, blockActionsWhileHeld: true, collectRentWhileHeld: true },
  ];
  return {
    boardVersionId: "bv-test-16",
    name: "Chennai 16 (test)",
    rows: 5,
    cols: 5,
    tiles,
    groups: [
      { id: "g-purple", colour: "purple", tileIndexes: [1, 2, 3, 13, 14], thresholdOverride: null },
      { id: "g-sky", colour: "sky", tileIndexes: [5, 6, 9, 10, 11], thresholdOverride: null },
    ],
    decks: [{ id: "d-chance", name: "Chance", drawMode: "shuffle", fallback: "nothing", rules: [] }],
    houseSupply: 32,
    hotelSupply: 12,
  };
}

export function testRules(): Ruleset {
  return {
    money: { startingCash: 10000, passBonus: 2000, finesTo: "bank" },
    rounds: { cap: 20, turnTimerSeconds: 30 },
    sets: { mode: "majority", customValue: null, mortgageBreaksSet: true, buildEvenly: true },
    mortgage: { interestPercent: 10 },
    auction: { enabled: true, startingPrice: 100, bidTimerSeconds: 20 },
    trade: { expirySeconds: 60 },
  };
}

function player(id: PlayerId, seat: number, name: string, cash: number): PlayerState {
  return {
    id,
    seat,
    name,
    colour: seat === 1 ? "gold" : "blue",
    cash,
    position: 0,
    jail: { in: false, roundsHeld: 0 },
    holdCards: [],
    skipTurns: 0,
    connected: true,
    bankrupt: null,
    ai: null,
  };
}

export function emptyTile(): TileState {
  return { ownerId: null, houses: 0, hotel: false, mortgaged: false, underAuction: false };
}

/** A fresh, invariant-clean match. Tests mutate copies of it to produce violations. */
export function baseState(): MatchState {
  const board = testBoard();
  const players: Record<PlayerId, PlayerState> = {
    "p-naveen": player("p-naveen", 1, "Naveen", 10000),
    "p-priya": player("p-priya", 2, "Priya", 10000),
  };
  return {
    version: 1,
    id: "m-test",
    mode: "passAndPlay",
    phase: "live",
    board,
    rules: testRules(),
    rng: { seed: 42, cursor: 0 },
    round: 1,
    seatOrder: ["p-naveen", "p-priya"],
    turn: { playerId: "p-naveen", stage: "preRoll", doublesThisTurn: 0, dice: null, deadlineMs: null },
    players,
    tiles: board.tiles.map(() => emptyTile()),
    bank: { houses: 32, hotels: 12, finePot: 0, ledger: { issued: 20000, absorbed: 0 }, pendingAuctions: [] },
    auction: null,
    offers: [],
    debts: [],
    deckCursors: { "d-chance": 0 },
    log: [],
  };
}

/** Deep-ish clone so a test can mutate freely without touching another test's state. */
export function cloneState(state: MatchState): MatchState {
  return JSON.parse(JSON.stringify(state)) as MatchState;
}
