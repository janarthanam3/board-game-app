// Match events: the only thing the UI and the match log read (SPEC.md reducer contract #3).
// The seventeen notification cards in docs/screens/1n-notification-cards.md each map to a kind
// here (noted per entry); the rest are log-only transitions (docs/06: "every transition is logged").
//
// Names, subjects and amounts are carried as data; copy is composed at the render edge from the
// board's own tile and player names, never from the engine.

import type { DrawSource } from "./decks";
import type { RuleCategory } from "./effects";
import type { CardEffect, DeckId, PlayerId, RuleId, TileIndex } from "./state";

interface Base {
  /** Monotonic within the match; the log is append-only. */
  seq: number;
  atMs: number;
}

export type MatchEvent = Base &
  (
    | { kind: "matchStarted"; playerIds: PlayerId[]; seed: number }
    | { kind: "roundStarted"; round: number }
    | { kind: "turnStarted"; playerId: PlayerId; round: number }
    | { kind: "turnSkipped"; playerId: PlayerId; remaining: number }
    | { kind: "diceRolled"; playerId: PlayerId; dice: [number, number]; doubles: boolean; chosen: boolean }
    | { kind: "moved"; playerId: PlayerId; from: TileIndex; to: TileIndex; passedStart: boolean }
    /** 1n #15 START BONUS */
    | { kind: "startBonus"; playerId: PlayerId; amount: number }
    /** 1n #3 PROPERTY COST (decision) */
    | { kind: "propertyCost"; playerId: PlayerId; tileIndex: TileIndex; cost: number; canAfford: boolean }
    | { kind: "bought"; playerId: PlayerId; tileIndex: TileIndex; cost: number }
    | { kind: "purchasePassed"; playerId: PlayerId; tileIndex: TileIndex; auctionOpens: boolean }
    /** 1n #1 RENT DUE — a decision only when `debtId` is set (the player cannot pay) */
    | { kind: "rentDue"; payerId: PlayerId; ownerId: PlayerId; tileIndex: TileIndex; amount: number; debtId: string | null }
    /** 1n #2 RENT PAID */
    | { kind: "rentPaid"; payerId: PlayerId; ownerId: PlayerId; tileIndex: TileIndex; amount: number }
    /** 1n #12 INCOME TAX — any tax office charge */
    | { kind: "taxCharged"; playerId: PlayerId; tileIndex: TileIndex; amount: number; debtId: string | null }
    /** A card space with no deck, or one reached past the card-chain cap: the landing only */
    | { kind: "cardSpaceLanded"; playerId: PlayerId; tileIndex: TileIndex; cardType: "chance" | "chest" | "none" }
    /** 1n #10 CHANCE / #11 COMMUNITY CHEST — the draw; `applied` is false for a failed gate or no rule */
    | {
        kind: "cardDrawn";
        playerId: PlayerId;
        tileIndex: TileIndex;
        deckId: DeckId;
        ruleId: RuleId | null;
        ruleName: string | null;
        source: DrawSource;
        category: RuleCategory | null;
        applied: boolean;
        skipped: "noRule" | "conditions" | null;
      }
    /** One MONEY transfer of a drawn rule; `debtId` is set when the payer could not pay */
    | { kind: "cardMoney"; playerId: PlayerId; ruleId: RuleId; from: PlayerId | "bank"; to: PlayerId | "bank"; amount: number; debtId: string | null }
    | { kind: "cardBlockSkipped"; playerId: PlayerId; ruleId: RuleId; block: "move"; reason: "debtOpen" }
    | { kind: "holdCardGranted"; playerId: PlayerId; ruleId: RuleId; cardId: string; effect: CardEffect["kind"] }
    /** OQ-19: "Affects another player" needs a target-choice action that does not exist yet */
    | { kind: "holdCardSkipped"; playerId: PlayerId; ruleId: RuleId; reason: "needsTarget" }
    /** 1n #4 AUCTION LIVE */
    | { kind: "auctionOpened"; tileIndex: TileIndex; minBid: number; bidders: PlayerId[]; reason: "declined" | "bankruptcy" }
    | { kind: "bidPlaced"; playerId: PlayerId; tileIndex: TileIndex; amount: number }
    | { kind: "bidderPassed"; playerId: PlayerId; tileIndex: TileIndex }
    /** 1n #5 AUCTION WON */
    | { kind: "auctionWon"; playerId: PlayerId; tileIndex: TileIndex; amount: number }
    | { kind: "auctionNoSale"; tileIndex: TileIndex }
    /** 1n #6 DEAL OFFER (decision, to the target) */
    | { kind: "dealOffered"; offerId: string; from: PlayerId; to: PlayerId; expiresAtMs: number }
    /** 1n #7 TRADE DONE */
    | { kind: "tradeDone"; offerId: string; from: PlayerId; to: PlayerId }
    | { kind: "tradeRejected"; offerId: string; from: PlayerId; to: PlayerId }
    | { kind: "tradeExpired"; offerId: string; from: PlayerId; to: PlayerId }
    | { kind: "tradeCancelled"; offerId: string; from: PlayerId; to: PlayerId; reason: "offererBankrupt" }
    /** 1n #8 SENT TO JAIL */
    | { kind: "sentToJail"; playerId: PlayerId; reason: "landed" | "thirdDouble" | "card"; entryCharge: number }
    /** 1n #9 IN JAIL (decision) */
    | { kind: "inJail"; playerId: PlayerId; roundsHeld: number; maxRoundsHeld: number; bail: number }
    | { kind: "jailReleased"; playerId: PlayerId; how: "bail" | "double" | "jailPass" | "served" }
    | { kind: "jailStay"; playerId: PlayerId; roundsHeld: number }
    /** 1n #14 REST HOUSE */
    | { kind: "restHouse"; playerId: PlayerId; turnsSkipped: number; amount: number }
    /** Edge case #10: sendToJail on a board without a jail */
    | { kind: "noJailOnBoard"; playerId: PlayerId }
    | { kind: "built"; playerId: PlayerId; tileIndex: TileIndex; what: "house" | "hotel"; cost: number; houses: number; hotel: boolean }
    | { kind: "sold"; playerId: PlayerId; tileIndex: TileIndex; what: "house" | "hotel" | "property"; proceeds: number }
    | { kind: "mortgaged"; playerId: PlayerId; tileIndexes: TileIndex[]; proceeds: number }
    | { kind: "redeemed"; playerId: PlayerId; tileIndexes: TileIndex[]; cost: number }
    | { kind: "debtOpened"; debtId: string; debtorId: PlayerId; creditorId: PlayerId | "bank"; amount: number; cause: string }
    | { kind: "debtSettled"; debtId: string; debtorId: PlayerId; creditorId: PlayerId | "bank"; amount: number }
    /** 1n #17 BANKRUPT (compact) / 1o */
    | { kind: "bankrupt"; playerId: PlayerId; creditorId: PlayerId | "bank"; tiles: TileIndex[]; cashTransferred: number; round: number }
    | { kind: "cardUsed"; playerId: PlayerId; cardId: string; effect: string }
    /** A rentWaiver was spent: the payment is skipped and the owner collects nothing (§7) */
    | { kind: "rentWaived"; payerId: PlayerId; ownerId: PlayerId; tileIndex: TileIndex }
    /** A clearDebt card wiped a debt; no money moved and the creditor was not paid */
    | { kind: "debtCleared"; debtId: string; debtorId: PlayerId; creditorId: PlayerId | "bank"; amount: number }
    | { kind: "timerExpired"; scope: "turn" | "auction" | "offer"; applied: string[] }
    | { kind: "turnEnded"; playerId: PlayerId }
    | { kind: "playerDisconnected"; playerId: PlayerId }
    | { kind: "playerReconnected"; playerId: PlayerId }
    | { kind: "matchEnded"; reason: "roundCap" | "lastStanding" | "abandoned"; standings: PlayerId[] }
  );

export type MatchEventKind = MatchEvent["kind"];
