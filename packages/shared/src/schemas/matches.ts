// Request and response schemas for the match routes (docs/07-api-contract.md §Matches). As with auth
// and boards, the schema is the contract and both sides import it.
//
// Two shapes in docs/07 are left open and are pinned here from the screens that fill them:
//
// - `POST /matches` takes `settings: { }` — an empty object in the contract. `1b` "Host a game" has
//   exactly one field a host fills in, `Game name`, and docs/flows/match-create-join.md sends it as
//   `{name, boardVersionId}`. So `settings` is `{ name }` and nothing else. It is deliberately
//   `.strict()`: rules come from the board (D1), so a settings key that looked like a rule would be a
//   match-time override, which the constitution forbids outright.
// - the room code's length. `1b` §2.2 draws a four-character code (`7K2Q`) and the flow doc's
//   invariant 4 says "Room codes are four characters"; docs/09-server-config.md's
//   ROOM_CODE_ALPHABET row says "6 chars". The design wins (authority 1), and the contradiction is in
//   design-concerns.md.

import { z } from "zod";

/** `1b` §2.2: four characters from ROOM_CODE_ALPHABET, which has no I, O, 0 or 1 to misread. */
export const ROOM_CODE_LENGTH = 4;

/**
 * Everything a host chooses that is not a rule. One field today, from `1b`'s `Game name`.
 * `.strict()` keeps a would-be rule override out (D1).
 */
export const matchSettingsSchema = z.object({ name: z.string().min(1).max(40) }).strict();

export const createMatchBodySchema = z
  .object({ boardVersionId: z.string().min(1), settings: matchSettingsSchema })
  .strict();

/**
 * The join body. The code is upper-cased before it is looked up, because `1b`'s field accepts what
 * the player types and the alphabet is upper-case only — a lower-case paste must still find the room.
 */
export const joinMatchBodySchema = z
  .object({
    roomCode: z
      .string()
      .trim()
      .length(ROOM_CODE_LENGTH)
      .transform((code) => code.toUpperCase()),
  })
  .strict();

/** `2c`'s five category chips, and docs/07's `filter` query. */
export const MATCH_LOG_FILTERS = ["all", "money", "property", "jail", "cards"] as const;

export const matchLogQuerySchema = z.object({
  filter: z.enum(MATCH_LOG_FILTERS).default("all"),
  cursor: z.string().max(200).optional(),
  /** `2c` §6 "Scroll to the foot: load the previous 50 entries" and §7's `limit=50`. */
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type MatchSettings = z.infer<typeof matchSettingsSchema>;
export type CreateMatchBody = z.infer<typeof createMatchBodySchema>;
export type JoinMatchBody = z.infer<typeof joinMatchBodySchema>;
export type MatchLogQuery = z.infer<typeof matchLogQuerySchema>;
export type MatchLogFilter = (typeof MATCH_LOG_FILTERS)[number];

// ─── MatchResult (docs/07 §Matches, screen `2b`) ─────────────────────────────────────────────────
//
// docs/07 declares `MatchResult` but leaves `PlayerBreakdown` undeclared; `2b` §2.2 draws it in full,
// so the breakdown's shape comes from the screen and the outer shape from the contract. Two places
// where the two disagree, both recorded in docs/design-concerns.md:
//
// - docs/07 calls the per-player map `breakdowns`; `2b` §7 calls it `perPlayer`. The contract's name
//   is used, since this is the contract.
// - docs/07 types a series point as `number`; `2b` §7 writes `{ round, netWorth }`. The contract's
//   plain number is used — the chart's x-axis is "round 1 → round <last>", which the index already is.

const moneyRupees = z.number().int();

/** `2b` §2.2 MONEY: the six keys as drawn, in the order they are drawn. */
export const playerMoneySchema = z.object({
  rentCollected: moneyRupees,
  rentPaid: moneyRupees,
  tilesBought: moneyRupees,
  buildSpend: moneyRupees,
  cardGains: moneyRupees,
  taxAndFines: moneyRupees,
});

/** `2b` §2.2 PORTFOLIO: "Park Place ₹4,200 rent gain · 1 hotel". Five are drawn; all are returned. */
export const portfolioEntrySchema = z.object({
  tileIndex: z.number().int().nonnegative(),
  name: z.string(),
  rentGain: moneyRupees,
  houses: z.number().int().nonnegative(),
  hotel: z.boolean(),
});

/** `2b` §2.2 "set counts: 3 · 3 · 4 · 2", one chip per colour group in the group's colour. */
export const setCountSchema = z.object({
  groupId: z.string(),
  colour: z.string(),
  tiles: z.number().int().nonnegative(),
});

export const playerBreakdownSchema = z.object({
  money: playerMoneySchema,
  portfolio: z.array(portfolioEntrySchema),
  setCounts: z.array(setCountSchema),
});

export const standingSchema = z.object({
  place: z.number().int().positive(),
  playerId: z.string(),
  name: z.string(),
  netWorth: moneyRupees,
  tiles: z.number().int().nonnegative(),
  hotels: z.number().int().nonnegative(),
  houses: z.number().int().nonnegative(),
  cash: moneyRupees,
  /** Present only for a player who went out (`2b` "bankrupt out on round 31 · owed ₹1,900"). */
  bankruptRound: z.number().int().positive().optional(),
  owed: moneyRupees.optional(),
});

/** docs/08's `matches.end_reason` values. The engine says `roundCap`; the column says `cap`. */
export const endReasonSchema = z.enum(["cap", "lastStanding", "abandoned", "closed"]);

export const matchResultSchema = z.object({
  matchId: z.string(),
  boardName: z.string(),
  durationMinutes: z.number().int().nonnegative(),
  rounds: z.number().int().nonnegative(),
  endReason: endReasonSchema,
  winner: z
    .object({ playerId: z.string(), name: z.string(), netWorth: moneyRupees, reason: endReasonSchema })
    .nullable(),
  standings: z.array(standingSchema),
  /** `2b` §2.1 MATCH STATS, exactly the four tiles drawn. */
  stats: z.object({
    rounds: z.number().int().nonnegative(),
    rentPaid: moneyRupees,
    tilesSold: z.number().int().nonnegative(),
    jailVisits: z.number().int().nonnegative(),
  }),
  netWorthSeries: z.array(z.object({ playerId: z.string(), points: z.array(moneyRupees) })),
  /** `2b` §2.1 AWARDS. Three of the four drawn are computable; see AWARD_KEYS. */
  awards: z.array(z.object({ key: z.string(), label: z.string(), playerId: z.string(), detail: z.string() })),
  breakdowns: z.record(z.string(), playerBreakdownSchema),
});

/**
 * The award rows `2b` draws, with their exact labels.
 *
 * `bestDeal` is drawn ("Best deal — Priya · Bay Rd swap") but no document says which trade is best, so
 * it is **not** emitted — see OQ-42. The other three are unambiguous.
 */
export const AWARD_KEYS = {
  landlord: "Landlord",
  mostRentPaid: "Most rent paid",
  jailbird: "Jailbird",
} as const;

export type MatchResult = z.infer<typeof matchResultSchema>;
export type PlayerBreakdown = z.infer<typeof playerBreakdownSchema>;
export type Standing = z.infer<typeof standingSchema>;
export type EndReason = z.infer<typeof endReasonSchema>;
