// The match state, from packages/game-engine/SPEC.md "State shape", with FrozenBoard and Ruleset
// filled in from docs/05-game-rules.md. Plain data only: everything here must survive
// JSON.stringify/parse unchanged, because the same state travels over the socket and into SQLite.
//
// All money is an integer number of rupees (rulebook, top). No floats anywhere in this file.

import type { MatchEvent } from "./events";
import type { TurnStageKind } from "./machines/turn";

// ─── Identifiers ────────────────────────────────────────────────────────────────

export type MatchId = string;
export type PlayerId = string;
export type GroupId = string;
export type DeckId = string;
export type RuleId = string;
export type TileIndex = number;

/** The six seat colours, in seat order (docs/02 "Colour — player tokens"). */
export type PlayerColour = "gold" | "blue" | "green" | "red" | "amber" | "violet";

// ─── Pricing (rulebook §3) ──────────────────────────────────────────────────────

/**
 * A priced field stores what the author typed and derives the other side (rulebook §3 "Storage
 * rule"). The engine resolves `flat` directly, or computes it from `percent` of the base.
 */
export type PricedField =
  | { readonly mode: "flat"; readonly flat: number }
  | { readonly mode: "percent"; readonly percent: number };

// ─── Rules and cards (rulebook §5) ──────────────────────────────────────────────

export type CardEffect =
  | { kind: "jailPass" }
  | { kind: "rentWaiver" }
  | { kind: "rentMultiplier"; factor: number; side: "collect" | "pay" }
  | { kind: "moveAnywhere" }
  | { kind: "skipTurn" }
  /** The "Free Rest house Card" of rulebook §13 — exempts one rest-house stay (OQ-21 item 2). */
  | { kind: "freeRestHouse" }
  | { kind: "chooseDice" }
  | { kind: "clearDebt" }
  | { kind: "freeBuild" }
  | { kind: "sendToJail"; target: "choose" }
  | { kind: "zeroCash"; target: "choose" }
  | { kind: "removeBuilding"; target: "choose" }
  | { kind: "forceTradeAccept"; target: "choose" };

export type HoldCardExpiry = "never" | "round" | "match";

export interface HoldCard {
  /** Unique within the match, so USE_CARD can name it. */
  id: string;
  effect: CardEffect;
  uses: number;
  expires: HoldCardExpiry;
  tradeable: boolean;
  /** The round the card was granted; "round" expiry discards it at the start of the next one. */
  grantedRound: number;
}

/** MONEY block (rulebook §5.1). */
export interface MoneyBlock {
  direction: "bankPaysYou" | "youPayBank" | "shareToAllPlayers" | "collectFromAllPlayers";
  amount: number;
  basis: "flat" | "perPlayer" | "perHouse" | "perTileOwned";
}

/** MOVE block. `count` is 0–40; `targetTileIndex` applies to "toTile". */
export interface MoveBlock {
  direction: "forward" | "backward" | "toTile";
  count: number;
  targetTileIndex: TileIndex | null;
  collectPassBonus: boolean;
}

/** HOLD CARD block: grants a hold card to me or to a chosen player. */
export interface HoldCardBlock {
  affects: "me" | "anotherPlayer";
  effect: CardEffect;
  uses: number;
  expires: HoldCardExpiry;
  tradeable: boolean;
}

/** CONDITIONS block: every listed condition must hold or the rule does nothing. */
export interface ConditionsBlock {
  holdsColourSet: boolean;
  ownsEveryTileInSet: boolean;
  cashAbove: number | null;
  hasHouseOrHotel: boolean;
}

/** One rule = one effect with up to four active blocks, applied CONDITIONS → MONEY → MOVE → HOLD. */
export interface RuleDefinition {
  id: RuleId;
  name: string;
  conditions: ConditionsBlock | null;
  money: MoneyBlock | null;
  move: MoveBlock | null;
  holdCard: HoldCardBlock | null;
}

export type DeckDrawMode = "shuffle" | "myOrder" | "diceNumber";
export type DeckFallback = "wholeDeck" | "nothing" | "nextInOrder";

export interface DeckRule {
  rule: RuleDefinition;
  active: boolean;
  /** For "diceNumber": the dice totals this rule answers to, stored explicitly (rulebook §5.2). */
  diceTotals: number[];
}

export interface FrozenDeck {
  id: DeckId;
  name: string;
  drawMode: DeckDrawMode;
  fallback: DeckFallback;
  /** In the author's stored order — "My Order" draws walk this list. */
  rules: DeckRule[];
}

// ─── Tiles (rulebook §2) ────────────────────────────────────────────────────────

export interface PropertyTile {
  kind: "property";
  name: string;
  groupId: GroupId;
  /** Cost is always flat (rulebook §2.1). */
  cost: number;
  baseRent: PricedField;
  /** Rent with 1, 2, 3 and 4 houses. */
  houseRent: readonly [PricedField, PricedField, PricedField, PricedField];
  hotelRent: PricedField;
  mortgage: PricedField;
  houseCost: PricedField;
  hotelCost: PricedField;
  /** Percent of house cost / hotel cost / cost respectively (rulebook §3 "Sell-back"). */
  sellHouse: PricedField;
  sellHotel: PricedField;
  sellProperty: PricedField;
}

export interface UtilityTile {
  kind: "utility";
  name: string;
  cost: number;
  mortgage: PricedField;
  rentBasis: "dice" | "fixed";
  /** Multiplier by utilities owned 1/2/3/4; a fifth reuses the last entry (rulebook §7). */
  multipliers: readonly [number, number, number, number];
  fixedRent: number | null;
  sellToBank: PricedField;
}

export type TaxMode = "flat" | "percent" | "playersChoice";

export interface CardTile {
  kind: "card";
  name: string;
  cardType: "chance" | "chest" | "tax" | "none";
  deckId: DeckId | null;
  /** Tax office only (rulebook §2.3). */
  tax?: { mode: TaxMode; flatAmount: number; percent: number; percentOf: "cash" | "netWorth" };
}

export interface CornerTile {
  kind: "corner";
  name: string;
  cornerType: "jail" | "restHouse" | "none";
  /** With several active sections, "shuffle" applies one at random; one section is "fixed". */
  drawMode: "shuffle" | "fixed";
  getOut: { amount: number; maxRoundsHeld: number; doubleToGetOut: boolean; useJailPassCard: boolean } | null;
  stayHere: { perSkipTurnAmount: number; useFreeRestHouseCard: boolean } | null;
  getIn: { amount: number; payTo: "bank" | "pot" } | null;
  blockActionsWhileHeld: boolean;
  collectRentWhileHeld: boolean;
}

export type FrozenTile = PropertyTile | UtilityTile | CardTile | CornerTile;

export interface ColourGroup {
  id: GroupId;
  colour: string;
  tileIndexes: TileIndex[];
  /** Per-group threshold override (rulebook §4), else the ruleset's mode decides. */
  thresholdOverride: number | null;
}

/**
 * A published board version, or a local snapshot: a self-contained document (D5) — tiles with
 * their prices, colour groups, decks with their rules copied in.
 */
export interface FrozenBoard {
  boardVersionId: string;
  name: string;
  rows: number;
  cols: number;
  /** Index 0 is the start tile; ring order is clockwise (rulebook §1). */
  tiles: FrozenTile[];
  groups: ColourGroup[];
  decks: FrozenDeck[];
  houseSupply: number;
  hotelSupply: number;
}

// ─── Ruleset (rulebook §4, §6, §8–§11, §14) ─────────────────────────────────────

/** Resolved from the board at match start; never editable in-match (D1). */
export interface Ruleset {
  money: {
    startingCash: number;
    passBonus: number;
    /** Where fines and taxes go (rulebook §6). */
    finesTo: "bank" | "pot";
  };
  rounds: {
    cap: number;
    /** null = timer off. */
    turnTimerSeconds: number | null;
  };
  sets: {
    mode: "allTiles" | "majority" | "custom";
    customValue: number | null;
    mortgageBreaksSet: boolean;
    buildEvenly: boolean;
  };
  /**
   * Rulebook §8: hotels are built by returning four houses plus the hotel cost, always. The
   * "Hotel returns houses" toggle was dropped (OQ-17 item 4) — the design gave it no
   * off-behaviour, and the only one the engine could invent silently shrank the house supply.
   */
  mortgage: {
    interestPercent: number;
  };
  auction: {
    enabled: boolean;
    startingPrice: number;
    bidTimerSeconds: number;
  };
  trade: {
    expirySeconds: number;
  };
}

// ─── Per-match state ────────────────────────────────────────────────────────────

export interface PlayerState {
  id: PlayerId;
  seat: number;
  name: string;
  colour: PlayerColour;
  cash: number;
  /** Tile index the token stands on. (Not listed in SPEC.md's shape; nothing else can hold it.) */
  position: TileIndex;
  jail: { in: boolean; roundsHeld: number };
  holdCards: HoldCard[];
  skipTurns: number;
  connected: boolean;
  bankrupt: { out: true; round: number; owedTo: PlayerId | "bank"; amount: number } | null;
  ai: { tier: "easy" | "normal" | "hard" } | null;
}

export interface TileState {
  ownerId: PlayerId | null;
  /** 0..4 */
  houses: number;
  hotel: boolean;
  mortgaged: boolean;
  underAuction: boolean;
}

export interface AuctionState {
  tileIndex: TileIndex;
  minBid: number;
  leadingBid: number;
  leadingBidderId: PlayerId | null;
  /** Cash escrowed per bidder on their accepted bid; released when outbid (rulebook §21 #4). */
  escrow: Record<PlayerId, number>;
  passed: PlayerId[];
  deadlineMs: number | null;
  /** Where the turn continues once the lot resolves: preRoll for a lot opened at turn start. */
  resumeStage: "preRoll" | "postRoll";
}

/** What one side of a trade puts in (rulebook §11). */
export interface Bundle {
  cash: number;
  tileIndexes: TileIndex[];
  holdCardIds: string[];
}

export interface TradeOffer {
  id: string;
  from: PlayerId;
  to: PlayerId;
  give: Bundle;
  get: Bundle;
  createdAtMs: number;
  expiresAtMs: number;
}

export interface Debt {
  id: string;
  debtorId: PlayerId;
  creditorId: PlayerId | "bank";
  amount: number;
  createdRound: number;
  /**
   * Where the money goes once it is paid: "fine" follows the board's setting (rulebook §6), while
   * "pot" and "bank" are a tile's own "Pay to" and win over it (OQ-21 item 5). Carried on the debt
   * so a charge that could not be paid at once still reaches the right place.
   */
  payTo: "creditor" | "fine" | "pot" | "bank";
}

export type MatchMode = "online" | "passAndPlay" | "solo";

export type MatchPhase =
  | "draft"
  | "lobby"
  | "starting"
  | "live"
  | "ending"
  | "ended"
  | "abandoned"
  | "closed";

/**
 * The turn's flow stage. Derived from the turn machine (src/machines/turn.ts) so the reducer can
 * never store a stage the design's state diagram does not have (state-machine skill rule 3).
 */
export type TurnStage = TurnStageKind;

export interface TurnState {
  playerId: PlayerId;
  stage: TurnStage;
  doublesThisTurn: number;
  dice: [number, number] | null;
  /** Set by the server; informational in the engine. */
  deadlineMs: number | null;
}

export interface BankState {
  houses: number;
  hotels: number;
  finePot: number;
  /**
   * Running totals of money the bank has put into play (starting cash, pass bonuses, card
   * payouts…) and taken out (purchases, taxes, bail…). The cashConservation invariant compares
   * them with the money currently held. SPEC.md names this ledger without listing it in the shape.
   */
  ledger: { issued: number; absorbed: number };
  /**
   * Lots a bank bankruptcy queued for auction. Each opens, one at a time, at the start of the
   * first turn of `fromRound` (docs/06 "Auction", docs/flows/bankruptcy.md step 3: "Auctions
   * begin next round"). Not in SPEC.md's shape — OQ-15.
   */
  pendingAuctions: { tileIndex: TileIndex; fromRound: number }[];
}

export interface MatchState {
  readonly version: 1;
  id: MatchId;
  mode: MatchMode;
  phase: MatchPhase;
  board: FrozenBoard;
  rules: Ruleset;
  rng: { seed: number; cursor: number };
  /** 1-based. */
  round: number;
  seatOrder: PlayerId[];
  turn: TurnState;
  players: Record<PlayerId, PlayerState>;
  /** Index-aligned with board.tiles. */
  tiles: TileState[];
  bank: BankState;
  auction: AuctionState | null;
  offers: TradeOffer[];
  debts: Debt[];
  deckCursors: Record<DeckId, number>;
  /** Append-only; drives 2c and 1n. */
  log: MatchEvent[];
}

// ─── Small helpers over the shape ───────────────────────────────────────────────

/** Property and utility tiles can be owned; card and corner spaces cannot (rulebook §2). */
export function isOwnable(tile: FrozenTile): tile is PropertyTile | UtilityTile {
  return tile.kind === "property" || tile.kind === "utility";
}

export function isSolvent(player: PlayerState): boolean {
  return player.bankrupt === null;
}

export type { MatchEvent };
