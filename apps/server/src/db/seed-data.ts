// The seed's content. docs/08-database.md §"Seed data" specifies it; this file is that specification
// turned into documents the engine can read, with three departures, each recorded below and in
// docs/design-concerns.md.
//
// **1. Monopoly board names are substituted.** docs/08's tile list contains Go, Community chest, Income
// tax, Park Avenue, Luxury tax, Free park and Go to jail — Monopoly's board spaces — in the same section
// that ends "**No Monopoly names in any fixture** (A2)". CLAUDE.md makes it a hard constraint: "No
// Monopoly board names in code, fixtures, seeds or tests — they are blocked at publish time too." The
// owner confirmed on 28 September 2026 that the constraint wins. Every other name on the list is
// Chennai's and is kept exactly as written.
//
// **2. The decks carry no rules.** docs/08 wants 14 / 3 / 6 / 4 rules; `1z` names six rules in the whole
// design and no document says which rule belongs to which deck, in which order, or what most of them do.
// Inventing twenty-one card effects would be inventing play. The four decks exist with their names, draw
// modes and fallbacks; their `rules` are empty, which the engine handles as a first-class case
// (`drawFromDeck` returns `source: "emptyDeck"`). **OQ-46.**
//
// **3. Classic's per-tile prices are not specified anywhere.** docs/08 gives its ruleset numbers and its
// tile names; no document gives a cost for a single tile. The ladder below is derived from the ring
// position so it is at least principled and reproducible, and it is flagged in OQ-46 item 2.
//
// **4. Two group colours were renamed so they render.** Classic shipped `sky` and `amber`, and the
// Chennai board shipped `sky`. A group's colour is drawn as a fill on four screens (`1c` §3 #6 and #16,
// `1j` §3 #4, `2b` §3 #15) and read as copy on two, and neither `sky` nor `amber` is a colour keyword
// any renderer knows — so those groups drew no tile band, no list bar and no coloured set line at all,
// and two of Classic's eight sets were visually identical, against D2's "the swatch is the identifier".
// They are now `skyblue` and `orange`: the nearest keyword to each, distinct from every other group on
// the same board. Found by E1's design check, 30 September 2026. **The palette the colour picker is
// meant to offer is OQ-51**, and its answer replaces these two names along with the other six.

import type { ColourGroup, FrozenBoard, FrozenDeck, FrozenTile, Ruleset } from "@royal-navy/game-engine";

/** docs/08 §Seed 1. The password is the same for all three playable accounts. */
export const SEED_PASSWORD = "royalnavy";

/**
 * Every colour the seeded boards give a group, in Classic's ring order with Chennai's `purple` last.
 * This is not the design's palette — no document states one (**OQ-51**) — it is the list these two
 * boards use, named here so `seed.test.ts` can check each one against the client's own colour parser.
 * A ninth colour added to a seeded board belongs in this list too, or that test fails.
 */
export const GROUP_COLOURS = ["teal", "skyblue", "violet", "orange", "red", "gold", "green", "navy", "purple"] as const;

export const SEED_USERS = [
  { handle: "royalnavy", displayName: "Royal Navy", email: "royalnavy@royalnavy.test", official: true },
  { handle: "naveen", displayName: "Naveen", email: "naveen@royalnavy.test", official: false },
  { handle: "priya", displayName: "Priya", email: "priya@royalnavy.test", official: false },
  { handle: "arun", displayName: "Arun", email: "arun@royalnavy.test", official: false },
] as const;

/**
 * The six seats of the completed match, in `2b`'s own standings order. Naveen, Priya and Arun are the
 * seeded accounts; Meera, Karthik and Divya are guest seats, which `match_players.user_id` allows
 * ("null for AI and pass-and-play guests").
 *
 * docs/08 asks for six players and names four users, three of whom play. The other three names are the
 * design's: `2b` §2.1 lists all six in its final standings, and `1b`'s lobby draws four of them.
 */
export const SEED_MATCH_SEATS = ["Naveen", "Priya", "Arun", "Meera", "Karthik", "Divya"] as const;

const PERCENT = (percent: number) => ({ mode: "percent" as const, percent });

/** The rent ladder every seeded property uses, as percentages of its own cost (rulebook §3). */
function property(name: string, groupId: string, cost: number): FrozenTile {
  return {
    kind: "property",
    name,
    groupId,
    cost,
    baseRent: PERCENT(8),
    houseRent: [PERCENT(40), PERCENT(120), PERCENT(340), PERCENT(480)],
    hotelRent: PERCENT(600),
    mortgage: PERCENT(50),
    houseCost: PERCENT(21),
    hotelCost: PERCENT(21),
    sellHouse: PERCENT(50),
    sellHotel: PERCENT(50),
    sellProperty: PERCENT(70),
  };
}

function utility(name: string, cost: number): FrozenTile {
  return {
    kind: "utility",
    name,
    cost,
    mortgage: PERCENT(50),
    rentBasis: "dice",
    multipliers: [4, 10, 16, 20],
    fixedRent: null,
    sellToBank: PERCENT(70),
  };
}

function card(name: string, cardType: "chance" | "chest", deckId: string): FrozenTile {
  return { kind: "card", name, cardType, deckId };
}

function corner(name: string, cornerType: "jail" | "restHouse" | "none", extras: Partial<FrozenTile> = {}): FrozenTile {
  return {
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
  } as FrozenTile;
}

/**
 * A tax office. The engine has no "tax" tile kind — rulebook §2.3's tax office is a **card** tile whose
 * deck charges — so the seeded tax spaces draw from the Tax office deck, which is exactly what docs/08's
 * "Tax office (fixed order, 6)" deck is for. With that deck empty (OQ-46) they currently charge nothing.
 */
function taxOffice(name: string): FrozenTile {
  return card(name, "chest", "d-tax");
}

export const SEED_DECKS: FrozenDeck[] = [
  // docs/08 §Seed 4 and `1y` §2.1: four decks, with these names, draw modes and rule counts. The counts
  // are what OQ-46 blocks; the decks themselves are fully specified and are here.
  { id: "d-chance", name: "Chance", drawMode: "shuffle", fallback: "nothing", rules: [] },
  { id: "d-community", name: "Community fund", drawMode: "diceNumber", fallback: "nothing", rules: [] },
  { id: "d-tax", name: "Tax office", drawMode: "myOrder", fallback: "nothing", rules: [] },
  { id: "d-club", name: "Club privilege", drawMode: "diceNumber", fallback: "nothing", rules: [] },
];

/**
 * Classic: 11 × 11, 40 tiles (ring maths `2r + 2c − 4`), owned by `royalnavy`.
 *
 * Names are docs/08's list in its order, with the seven Monopoly board spaces substituted:
 * Go → Start, Community chest → Community fund, Income tax → Tax office, Park Avenue → Kilpauk,
 * Luxury tax → Toll gate, Free park → Marina Park, Go to jail → Napier Bridge.
 */
export function classicBoard(): FrozenBoard {
  // A group's colour is drawn as a fill on four screens and read as copy on two (`1c` §3 #6 and #15,
  // `1j` §3 #4, `2b` §3 #15), so every value here has to be one the client can actually render.
  // `sky` and `amber` were not — neither is a CSS colour keyword, so two of these eight groups drew
  // no tile band, no list bar and no set line at all. See GROUP_COLOURS below and OQ-51.
  const groups: ColourGroup[] = [
    { id: "g-teal", colour: "teal", tileIndexes: [1, 3], thresholdOverride: null },
    { id: "g-sky", colour: "skyblue", tileIndexes: [6, 8, 9], thresholdOverride: null },
    { id: "g-violet", colour: "violet", tileIndexes: [11, 13, 14], thresholdOverride: null },
    { id: "g-amber", colour: "orange", tileIndexes: [16, 18, 19], thresholdOverride: null },
    { id: "g-red", colour: "red", tileIndexes: [21, 23, 24], thresholdOverride: null },
    { id: "g-gold", colour: "gold", tileIndexes: [26, 27, 29], thresholdOverride: null },
    { id: "g-green", colour: "green", tileIndexes: [31, 32, 34], thresholdOverride: null },
    { id: "g-navy", colour: "navy", tileIndexes: [37, 39], thresholdOverride: null },
  ];

  // Cost rises with ring position, in ₹100 steps from ₹1,200 — principled and reproducible, but not
  // specified by any document (OQ-46 item 2).
  const costAt = (index: number) => 1200 + index * 100;

  const tiles: FrozenTile[] = [
    corner("Start", "none"), // 0 — docs/08 "Go"
    property("Old Town", "g-teal", costAt(1)),
    card("Community fund", "chest", "d-community"), // 2 — docs/08 "Community chest"
    property("Mill Street", "g-teal", costAt(3)),
    taxOffice("Tax office"), // 4 — docs/08 "Income tax"
    utility("Harbour Line", 2000),
    property("City Club", "g-sky", costAt(6)),
    card("Chance", "chance", "d-chance"),
    property("Bay Road", "g-sky", costAt(8)),
    property("Marina Drive", "g-sky", costAt(9)),
    corner("Jail", "jail", {
      getOut: { amount: 5000, maxRoundsHeld: 3, doubleToGetOut: true, useJailPassCard: true },
      getIn: { amount: 100, payTo: "bank" },
    } as Partial<FrozenTile>), // 10
    property("Central Rail", "g-violet", costAt(11)),
    utility("Metro", 2000),
    property("Kilpauk", "g-violet", costAt(13)), // docs/08 "Park Avenue"
    property("Bazaar", "g-violet", costAt(14)),
    card("Club privilege", "chest", "d-club"),
    property("Marina Beach", "g-amber", costAt(16)),
    card("Chance", "chance", "d-chance"),
    property("T. Nagar", "g-amber", costAt(18)),
    property("Anna Salai", "g-amber", costAt(19)),
    corner("Rest house", "restHouse", {
      stayHere: { perSkipTurnAmount: 1000, useFreeRestHouseCard: true },
    } as Partial<FrozenTile>), // 20
    property("Poes Garden", "g-red", costAt(21)),
    card("Community fund", "chest", "d-community"),
    property("Mylapore", "g-red", costAt(23)),
    property("Besant", "g-red", costAt(24)),
    utility("Egmore", 2000),
    property("Adyar", "g-gold", costAt(26)),
    property("Guindy", "g-gold", costAt(27)),
    card("Chance", "chance", "d-chance"),
    property("Velachery", "g-gold", costAt(29)),
    corner("Napier Bridge", "none"), // 30 — docs/08 "Go to jail"; the engine has no such corner type
    property("Tambaram", "g-green", costAt(31)),
    property("Avadi", "g-green", costAt(32)),
    card("Community fund", "chest", "d-community"),
    property("Ambattur", "g-green", costAt(34)),
    utility("Kodambakkam", 2000),
    taxOffice("Toll gate"), // 36 — docs/08 "Luxury tax"
    property("Saidapet", "g-navy", costAt(37)),
    card("Chance", "chance", "d-chance"),
    property("Nungambakkam", "g-navy", costAt(39)),
  ];

  return {
    boardVersionId: "",
    name: "Classic",
    rows: 11,
    cols: 11,
    tiles,
    groups,
    decks: SEED_DECKS,
    houseSupply: 32,
    hotelSupply: 12,
  };
}

/** docs/08 §Seed 2: starting cash ₹10,000, pass ₹2,000, cap 20, timer 30 s, auctions on, Majority. */
export function classicRuleset(): Ruleset {
  return {
    money: { startingCash: 10_000, passBonus: 2000, finesTo: "bank" },
    rounds: { cap: 20, turnTimerSeconds: 30 },
    sets: { mode: "majority", customValue: null, mortgageBreaksSet: true, buildEvenly: true },
    mortgage: { interestPercent: 10 },
    auction: { enabled: true, startingPrice: 100, bidTimerSeconds: 15 },
    trade: { expirySeconds: 60 },
  };
}

/**
 * Chennai Edition: 5 × 5, 16 tiles, owned by `naveen`, starting cash ₹15,000, custom threshold 3 of 5
 * (docs/08 §Seed 3). The threshold is the ruleset's `custom` mode with `customValue: 3`, over groups of
 * five — which is what `1b`'s lobby draws as "Colour sets own 3 of 5".
 */
export function chennaiBoard(): FrozenBoard {
  const groups: ColourGroup[] = [
    { id: "g-purple", colour: "purple", tileIndexes: [1, 2, 3, 13, 14], thresholdOverride: null },
    // `sky` → `skyblue` for the same reason as the Classic board's: it has to render (OQ-51).
    { id: "g-sky", colour: "skyblue", tileIndexes: [5, 6, 9, 10, 11], thresholdOverride: null },
  ];

  const tiles: FrozenTile[] = [
    corner("Start", "none"),
    property("Marina Drive", "g-purple", 1400),
    property("Bay Road", "g-purple", 1400),
    property("Fort Street", "g-purple", 1200),
    card("Chance", "chance", "d-chance"),
    property("Mount Road", "g-sky", 2000),
    property("Anna Salai", "g-sky", 2000),
    utility("City Club", 900),
    corner("Jail", "jail", {
      getOut: { amount: 5000, maxRoundsHeld: 3, doubleToGetOut: true, useJailPassCard: true },
      getIn: { amount: 100, payTo: "bank" },
    } as Partial<FrozenTile>),
    property("Harbour Lane", "g-sky", 2200),
    property("Beach Road", "g-sky", 2200),
    property("Mylapore", "g-sky", 2400),
    card("Community fund", "chest", "d-community"),
    property("Adyar", "g-purple", 1600),
    property("Besant Nagar", "g-purple", 1600),
    corner("Rest house", "restHouse", {
      stayHere: { perSkipTurnAmount: 1000, useFreeRestHouseCard: true },
    } as Partial<FrozenTile>),
  ];

  return {
    boardVersionId: "",
    name: "Chennai Edition",
    rows: 5,
    cols: 5,
    tiles,
    groups,
    decks: SEED_DECKS.filter((deck) => deck.id === "d-chance" || deck.id === "d-community"),
    houseSupply: 32,
    hotelSupply: 12,
  };
}

export function chennaiRuleset(): Ruleset {
  return {
    money: { startingCash: 15_000, passBonus: 2000, finesTo: "bank" },
    rounds: { cap: 20, turnTimerSeconds: 30 },
    sets: { mode: "custom", customValue: 3, mortgageBreaksSet: true, buildEvenly: true },
    mortgage: { interestPercent: 10 },
    auction: { enabled: true, startingPrice: 100, bidTimerSeconds: 15 },
    trade: { expirySeconds: 60 },
  };
}
