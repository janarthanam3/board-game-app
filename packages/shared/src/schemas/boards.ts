// Request and response schemas for the board and catalogue routes (docs/07-api-contract.md §Boards,
// §Catalogue). As with auth, the schema is the contract and both sides import it.
//
// The FrozenBoard document is validated **structurally** here — enough to know the engine can read it
// and that the derived counters are trustworthy — and then semantically by the engine's own
// `validateBoard()`, which is the same validator the builder runs. Duplicating the engine's type
// definitions as zod schemas field for field would create exactly the drift this arrangement exists
// to prevent, so the deep shapes are `passthrough` objects.

import { z } from "zod";

/** A tile carries its kind; the engine's FrozenTile union decides the rest. */
const frozenTileSchema = z
  .object({ kind: z.enum(["property", "utility", "card", "corner"]) })
  .passthrough();

const colourGroupSchema = z
  .object({
    id: z.string().min(1),
    colour: z.string().min(1),
    tileIndexes: z.array(z.number().int().nonnegative()),
    thresholdOverride: z.number().int().positive().nullable(),
  })
  .passthrough();

const frozenDeckSchema = z
  .object({
    id: z.string().min(1),
    name: z.string(),
    rules: z.array(z.object({}).passthrough()),
  })
  .passthrough();

/**
 * FrozenBoard as the engine declares it (game-engine/src/state.ts). `boardVersionId` is assigned by
 * the server on publish, so a submitted document's own value is ignored rather than trusted.
 */
export const frozenBoardSchema = z
  .object({
    name: z.string().min(1),
    rows: z.number().int().min(3),
    cols: z.number().int().min(3),
    tiles: z.array(frozenTileSchema).min(1),
    groups: z.array(colourGroupSchema),
    decks: z.array(frozenDeckSchema),
    houseSupply: z.number().int().nonnegative(),
    hotelSupply: z.number().int().nonnegative(),
  })
  .passthrough();

/**
 * Ruleset as the engine declares it. The sections the server reads are required — the publish gate
 * reads `sets`, and the catalogue card and the read-only rules screen read `money`, `auction` and
 * `rounds`. Everything else passes through, so the engine stays the one definition of the full shape.
 * A document missing one of these could be published and would then crash a catalogue read, so this
 * is where it is refused.
 */
export const rulesetSchema = z
  .object({
    money: z
      .object({
        startingCash: z.number().int().nonnegative(),
        passBonus: z.number().int().nonnegative(),
        finesTo: z.enum(["bank", "pot"]),
      })
      .passthrough(),
    sets: z
      .object({
        mode: z.enum(["allTiles", "majority", "custom"]),
        customValue: z.number().int().positive().nullable(),
        buildEvenly: z.boolean(),
      })
      .passthrough(),
    auction: z.object({ enabled: z.boolean() }).passthrough(),
    rounds: z
      .object({
        cap: z.number().int().positive(),
        /** null means the timer is off (game-engine/src/state.ts). */
        turnTimerSeconds: z.number().int().positive().nullable(),
      })
      .passthrough(),
  })
  .passthrough();

/**
 * The publish body. docs/07 types `document` as a FrozenBoard; `board_versions.document`'s comment
 * and decision D5 both say the stored document also carries the ruleset, and the engine keeps the two
 * apart (MatchSetup has `board` and `rules`). OQ-40 records that contradiction. Until it is answered
 * the ruleset travels as its own field and is stored inside the document, so nothing is lost either
 * way the question is settled.
 *
 * `.strict()` is what makes a client-sent counter a **rejection** rather than something ignored:
 * `slots_total`, `slots_filled` and `has_errors` are derived from the document, and a request that
 * tries to supply them fails outright (D3's acceptance).
 */
export const publishBodySchema = z
  .object({
    localBoardId: z.string().min(1),
    name: z.string().min(1).max(40),
    description: z.string().max(400).default(""),
    document: frozenBoardSchema,
    ruleset: rulesetSchema,
  })
  .strict();

export const nameAvailableQuerySchema = z.object({
  name: z.string().min(1).max(40),
});

export const catalogueQuerySchema = z.object({
  q: z.string().max(80).optional(),
  sort: z.enum(["played", "new", "friends"]).default("played"),
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const reportBodySchema = z.object({
  reason: z.enum(["offensive", "trademark", "broken", "other"]),
  note: z.string().max(500).optional(),
});

export const unpublishImpactSchema = z.object({
  playersInGame: z.number().int().nonnegative(),
  playsToday: z.number().int().nonnegative(),
  openMatches: z.number().int().nonnegative(),
  stakesHeld: z.number().int().nonnegative(),
  liveVersion: z.number().int().nonnegative(),
});

export type PublishBody = z.infer<typeof publishBodySchema>;
export type CatalogueQuery = z.infer<typeof catalogueQuerySchema>;
export type ReportBody = z.infer<typeof reportBodySchema>;
export type UnpublishImpact = z.infer<typeof unpublishImpactSchema>;
