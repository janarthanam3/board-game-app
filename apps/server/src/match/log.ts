// The match log's category for one event. `2c` §4 "Entry categories" is the whole specification:
//
//   Money    | rent, salary, tax, fines, card money, auction payments, trades of cash
//   Property | purchases, auctions won, builds, sells, mortgages, redemptions, trades of tiles
//   Jail     | entering, bail paid, doubles out, released after the maximum
//   Cards    | every card drawn and its effect
//   All      | everything above plus lobby lines, disconnects and match start/end
//
// "Every entry carries a category" — one each, so an event that `2c` puts in two lists has to be given
// to one of them. There are two such events, and both are recorded in docs/design-concerns.md:
//
//  - a **trade** moves cash and tiles in one event; `2c` files "trades of cash" under Money and "trades
//    of tiles" under Property. It is filed under Property here, because `1p`'s deal is about deeds and a
//    cash-only trade is the rarer shape.
//  - an **auction** is "auction payments" under Money and "auctions won" under Property. The bids are
//    Money, the win is Property, which is the closest a one-category-per-event rule can come.
//
// Everything `2c` does not name — the turn's own transitions, a match starting, a disconnect — is
// `system`, which its own table says appears only under `All`. A kind the engine adds later lands there
// by default rather than being silently filed under a chip it was never meant for.
//
// The lists are the single source for **both** directions: the category a row carries, and the `type in
// (...)` the log query filters on. A filter has to run in SQL, because filtering a page after reading it
// would cut the page short and lose the rows a cursor should have reached.

import type { MatchEvent, MatchEventKind } from "@royal-navy/game-engine";
import type { MatchLogFilter } from "@royal-navy/shared/schemas/matches";

/** A chip's category, or `system` for the lines `2c` shows only under `All`. */
export type LogCategory = Exclude<MatchLogFilter, "all"> | "system";

const KINDS_BY_CATEGORY: Record<Exclude<LogCategory, "system">, readonly MatchEventKind[]> = {
  // Money: rent, the start bonus ("salary"), tax, fines, card money, bids, the rest-house fee.
  money: [
    "rentDue",
    "rentPaid",
    "rentWaived",
    "startBonus",
    "taxCharged",
    "cardMoney",
    "bidPlaced",
    "restHouse",
    "debtOpened",
    "debtSettled",
    "debtCleared",
    "cashZeroed",
  ],
  // Property: purchases, auctions won, builds, sells, mortgages, redemptions, trades.
  property: [
    "propertyCost",
    "bought",
    "purchasePassed",
    "auctionOpened",
    "auctionWon",
    "auctionNoSale",
    "bidderPassed",
    "built",
    "sold",
    "mortgaged",
    "redeemed",
    "buildingRemoved",
    "dealOffered",
    "tradeDone",
    "tradeRejected",
    "tradeExpired",
    "tradeCancelled",
  ],
  // Jail: entering, bail paid, doubles out, released after the maximum.
  jail: ["sentToJail", "inJail", "jailReleased", "jailStay", "noJailOnBoard"],
  // Cards: every card drawn and its effect.
  cards: ["cardSpaceLanded", "cardDrawn", "cardBlockSkipped", "holdCardGranted", "cardUsed"],
};

export function categoryOf(event: MatchEvent): LogCategory {
  for (const [category, kinds] of Object.entries(KINDS_BY_CATEGORY)) {
    if ((kinds as readonly string[]).includes(event.kind)) {
      return category as LogCategory;
    }
  }
  return "system";
}

/**
 * The event kinds a chip covers, for the log query's `type = any(...)`. Null for `all`, which filters
 * nothing — `2c`: "`All` never hides anything."
 */
export function kindsFor(filter: MatchLogFilter): readonly string[] | null {
  return filter === "all" ? null : KINDS_BY_CATEGORY[filter];
}
