// Fixtures shared by the board and match tests: a publishable board, its ruleset, and a publish body.
//
// One copy, because two tests now need a board that the engine will actually start a match on — and a
// second copy would drift the first time the document's shape changes.
//
// The names are Chennai and Royal Navy names. CLAUDE.md: "No Monopoly board names in code, fixtures,
// seeds or tests — they are blocked at publish time too."

export function unique(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/** A 5x5 / 16-tile board, the shape the engine's own test board uses. */
export function document(overrides: Record<string, unknown> = {}) {
  const property = (name: string, groupId: string, cost: number) => ({
    kind: "property",
    name,
    groupId,
    cost,
    baseRent: { mode: "percent", percent: 8 },
    houseRent: [
      { mode: "percent", percent: 40 },
      { mode: "percent", percent: 120 },
      { mode: "percent", percent: 340 },
      { mode: "percent", percent: 480 },
    ],
    hotelRent: { mode: "percent", percent: 600 },
    mortgage: { mode: "percent", percent: 50 },
    houseCost: { mode: "percent", percent: 21 },
    hotelCost: { mode: "percent", percent: 21 },
    sellHouse: { mode: "percent", percent: 50 },
    sellHotel: { mode: "percent", percent: 50 },
    sellProperty: { mode: "percent", percent: 70 },
  });
  const corner = (name: string, cornerType: string, extras: Record<string, unknown> = {}) => ({
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
  });

  return {
    name: "Harbour 16",
    rows: 5,
    cols: 5,
    tiles: [
      corner("Start", "none"),
      property("Marina Drive", "g-purple", 1400),
      property("Bay Road", "g-purple", 1400),
      property("Fort Street", "g-purple", 1200),
      { kind: "card", name: "Chance", cardType: "chance", deckId: "d-chance" },
      property("Mount Road", "g-sky", 2000),
      property("Anna Salai", "g-sky", 2000),
      {
        kind: "utility",
        name: "City Club",
        cost: 900,
        mortgage: { mode: "percent", percent: 50 },
        rentBasis: "dice",
        multipliers: [4, 10, 16, 20],
        fixedRent: null,
        sellToBank: { mode: "percent", percent: 70 },
      },
      corner("Jail", "jail", {
        getOut: { amount: 5000, maxRoundsHeld: 3, doubleToGetOut: true, useJailPassCard: true },
        getIn: { amount: 100, payTo: "bank" },
      }),
      property("Harbour Lane", "g-sky", 2200),
      property("Beach Road", "g-sky", 2200),
      property("Mylapore", "g-sky", 2400),
      { kind: "card", name: "Community fund", cardType: "chest", deckId: "d-chance" },
      property("Adyar", "g-purple", 1600),
      property("Besant Nagar", "g-purple", 1600),
      corner("Rest house", "restHouse", { stayHere: { perSkipTurnAmount: 1000, useFreeRestHouseCard: true } }),
    ],
    groups: [
      { id: "g-purple", colour: "purple", tileIndexes: [1, 2, 3, 13, 14], thresholdOverride: null },
      { id: "g-sky", colour: "sky", tileIndexes: [5, 6, 9, 10, 11], thresholdOverride: null },
    ],
    decks: [{ id: "d-chance", name: "Chance", drawMode: "shuffle", fallback: "nothing", rules: [] }],
    houseSupply: 32,
    hotelSupply: 12,
    ...overrides,
  };
}

export const ruleset = {
  money: { startingCash: 10_000, passBonus: 2000, finesTo: "bank" },
  sets: { mode: "majority", customValue: null, mortgageBreaksSet: true, buildEvenly: true },
  auction: { enabled: true, startingPrice: 100, bidTimerSeconds: 15 },
  rounds: { cap: 20, turnTimerSeconds: 30 },
  trade: { expirySeconds: 60 },
};

export function publishBody(overrides: Record<string, unknown> = {}) {
  return {
    localBoardId: unique("local-"),
    name: unique("Harbour "),
    description: "A compact ring around the docks.",
    document: document(),
    ruleset,
    ...overrides,
  };
}
