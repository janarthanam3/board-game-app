// Board routes, author side. docs/07-api-contract.md §Boards; decision D5 for slots, immutability and
// unpublishing; decision D7 (via the engine's validateBoard) for what a valid board is.
//
// The counter rules here are the owner's, recorded on D3's acceptance criteria:
//
// - publish **derives** slots_total, slots_filled and has_errors from the submitted document and
//   never accepts client-supplied values;
// - a publish request that carries those counters is **rejected**, not ignored (the body schema is
//   strict, so an unknown key fails validation);
// - PATCH counters before publish are an untrusted display hint that nothing may gate on — so no code
//   here reads them to make a decision;
// - unpublish **re-derives** from the live version rather than restoring the last draft state, because
//   the draft may have drifted and a stale restore would put the board in a state its contents deny.

import { validateBoard } from "@royal-navy/game-engine";
import type { FrozenBoard, Ruleset } from "@royal-navy/game-engine";
import { newId } from "@royal-navy/shared/id";
import { nameAvailableQuerySchema, publishBodySchema } from "@royal-navy/shared/schemas/boards";
import type { FastifyPluginAsync } from "fastify";

import { coverMotif, deriveCounters, errorsOf, ruleChips } from "../boards/document.js";
import type { NameFilter } from "../boards/names.js";
import type { ServerEnv } from "../config/env.js";
import { sendError } from "../http/errors.js";

export interface BoardRoutesOptions {
  env: ServerEnv;
  /** D5: 3 published boards per account, from MAX_PUBLISHED_BOARDS. */
  maxPublished: number;
  /**
   * The name filters, built at boot from the two list files (docs/09's PROFANITY_LIST_PATH and
   * TRADEMARK_LIST_PATH). Passed in rather than read here, so a publish never touches the file system
   * and a test can supply its own list.
   */
  nameFilter: NameFilter;
}

interface BoardRow {
  id: string;
  author_id: string;
  name: string;
}

const boardRoutes: FastifyPluginAsync<BoardRoutesOptions> = async (app, options) => {
  app.get("/boards/name-available", { preHandler: app.requireUser }, async (request, reply) => {
    const user = request.user!;
    const parsed = nameAvailableQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return sendError(reply, "E_VALIDATION", parsed.error.issues);
    }

    // 2a: "Must be unique across your boards" — per author, not globally, which is what the
    // `unique (author_id, name)` constraint enforces.
    const result = await app.pg.query(
      "select 1 from boards where author_id = $1 and lower(name) = lower($2)",
      [user.id, parsed.data.name],
    );
    return reply.status(200).send({ available: result.rowCount === 0 });
  });

  app.get("/boards/published", { preHandler: app.requireUser }, async (request, reply) => {
    const user = request.user!;
    const result = await app.pg.query<{
      board_id: string;
      id: string;
      name: string;
      version: number;
      ring_size: number;
      published_at: Date;
      play_count: number;
    }>(
      `select b.id as board_id, v.id, b.name, v.version, v.ring_size, v.published_at, v.play_count
         from boards b
         join board_versions v on v.board_id = b.id
        where b.author_id = $1
          and b.status = 'published'
          and v.withdrawn_at is null
        order by v.published_at desc`,
      [user.id],
    );

    return reply.status(200).send({
      items: result.rows.map((row) => ({
        boardId: row.board_id,
        boardVersionId: row.id,
        name: row.name,
        version: row.version,
        ringSize: row.ring_size,
        publishedAt: row.published_at.toISOString(),
        playCount: row.play_count,
      })),
      // `used` is counted from the rows, never from the boards table's counters.
      slots: { used: result.rowCount ?? 0, total: options.maxPublished },
    });
  });

  app.post("/boards/publish", { preHandler: app.requireUser }, async (request, reply) => {
    const user = request.user!;
    const parsed = publishBodySchema.safeParse(request.body);
    if (!parsed.success) {
      // A client-sent counter lands here: the schema is strict, so an unknown key is a rejection.
      return sendError(reply, "E_VALIDATION", parsed.error.issues);
    }
    const { name, description, document, ruleset } = parsed.data;
    const board = document as unknown as FrozenBoard;
    const rules = ruleset as unknown as Ruleset;

    // The name filters (docs/07: publish applies them; docs/13: E_BOARD_NAME_FILTERED carries
    // `details.kind`). Checked before the document, because a refused name makes the rest moot and the
    // check costs nothing. Both lists ship empty — their contents are OQ-47 — so nothing is blocked yet
    // and this path is proved by tests that supply their own list.
    const filtered = options.nameFilter.check(name);
    if (filtered !== null) {
      return sendError(reply, "E_BOARD_NAME_FILTERED", { kind: filtered });
    }

    const issues = validateBoard(board, rules);
    const errors = errorsOf(issues);
    if (errors.length > 0) {
      // docs/07: the rows are shaped exactly like the READY TO PLAY panel so the client renders them
      // without translation. Warnings travel too — they do not block, but the panel shows both tiers.
      return sendError(reply, "E_BOARD_INVALID", {
        errors,
        warnings: issues.filter((issue) => issue.severity === "warning"),
      });
    }

    const existing = await app.pg.query<BoardRow>(
      "select id, author_id, name from boards where author_id = $1 and lower(name) = lower($2)",
      [user.id, name],
    );
    const board_row = existing.rows[0];

    // D5's slot count. Counted from published rows rather than from any stored counter.
    const published = await app.pg.query(
      "select 1 from boards where author_id = $1 and status = 'published'",
      [user.id],
    );
    const alreadyPublished = board_row ? (published.rowCount ?? 0) - 1 : published.rowCount ?? 0;
    const republishing = board_row !== undefined;
    if (!republishing && (published.rowCount ?? 0) >= options.maxPublished) {
      return sendError(reply, "E_PUBLISH_SLOTS_FULL");
    }
    if (republishing && alreadyPublished >= options.maxPublished) {
      return sendError(reply, "E_PUBLISH_SLOTS_FULL");
    }

    const counters = deriveCounters(board, rules);
    const boardId = board_row?.id ?? newId();
    const versionId = newId();

    const client = await app.pg.connect();
    try {
      await client.query("begin");
      if (!board_row) {
        await client.query("insert into boards (id, author_id, name) values ($1, $2, $3)", [boardId, user.id, name]);
      }

      // Version numbers are per board and only ever go up; an earlier row is never touched (D5).
      const last = await client.query<{ version: number }>(
        "select coalesce(max(version), 0) as version from board_versions where board_id = $1",
        [boardId],
      );
      const version = Number(last.rows[0]?.version ?? 0) + 1;

      // The stored document carries the ruleset with it, so a match can start from this row alone
      // (D5: "a published board carries copies of its decks and rules"). See OQ-40.
      const stored = { ...document, boardVersionId: versionId, ruleset };

      await client.query(
        `insert into board_versions (id, board_id, version, ring_size, rows, cols, description, document, cover_motif)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          versionId,
          boardId,
          version,
          counters.slotsTotal,
          document.rows,
          document.cols,
          description,
          JSON.stringify(stored),
          JSON.stringify(coverMotif(board)),
        ],
      );

      // Earlier versions are left exactly as they were. D5: a published version is immutable, and
      // "matches already running finish on their version" — so the old row is not withdrawn, it simply
      // stops being the latest. The catalogue shows the highest version per board.

      await client.query(
        `update boards
            set status = 'published',
                unpublished_at = null,
                slots_total = $2,
                slots_filled = $3,
                has_errors = $4
          where id = $1`,
        [boardId, counters.slotsTotal, counters.slotsFilled, counters.hasErrors],
      );
      await client.query("commit");

      return reply.status(201).send({ boardVersionId: versionId, version });
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  });

  app.get("/boards/:boardId/impact", { preHandler: app.requireUser }, async (request, reply) => {
    const user = request.user!;
    const { boardId } = request.params as { boardId: string };
    const owned = await ownedBoard(app, boardId, user.id);
    if (owned === "missing") {
      return sendError(reply, "E_BOARD_UNAVAILABLE");
    }
    if (owned === "forbidden") {
      return sendError(reply, "E_FORBIDDEN");
    }

    return reply.status(200).send(await impactOf(app, boardId));
  });

  app.post("/boards/:boardId/unpublish", { preHandler: app.requireUser }, async (request, reply) => {
    const user = request.user!;
    const { boardId } = request.params as { boardId: string };
    const owned = await ownedBoard(app, boardId, user.id);
    if (owned === "missing") {
      return sendError(reply, "E_BOARD_UNAVAILABLE");
    }
    if (owned === "forbidden") {
      return sendError(reply, "E_FORBIDDEN");
    }

    const impact = await impactOf(app, boardId);

    // Re-derive from the live version's own document. Restoring whatever the draft counters happen to
    // say would put the board in a state its contents deny — the failure this closes.
    const live = await app.pg.query<{ id: string; document: unknown }>(
      `select id, document from board_versions
        where board_id = $1
        order by version desc
        limit 1`,
      [boardId],
    );
    const document = live.rows[0]?.document as (FrozenBoard & { ruleset: Ruleset }) | undefined;

    const client = await app.pg.connect();
    try {
      await client.query("begin");
      await client.query(
        "update board_versions set withdrawn_at = now() where board_id = $1 and withdrawn_at is null",
        [boardId],
      );
      if (document) {
        const counters = deriveCounters(document, document.ruleset);
        await client.query(
          `update boards
              set status = 'draft',
                  unpublished_at = now(),
                  slots_total = $2,
                  slots_filled = $3,
                  has_errors = $4
            where id = $1`,
          [boardId, counters.slotsTotal, counters.slotsFilled, counters.hasErrors],
        );
      } else {
        // No version to re-derive from; the counters cannot be trusted, so they go to zero rather
        // than keeping a number nothing backs.
        await client.query(
          `update boards set status = 'draft', unpublished_at = now(), slots_total = 0, slots_filled = 0, has_errors = false
            where id = $1`,
          [boardId],
        );
      }
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }

    // D5: the slot is freed immediately.
    return reply.status(200).send({ freedSlots: 1, impact });
  });
};

type Ownership = "ok" | "missing" | "forbidden";

async function ownedBoard(
  app: Parameters<FastifyPluginAsync<BoardRoutesOptions>>[0],
  boardId: string,
  userId: string,
): Promise<Ownership> {
  const result = await app.pg.query<{ author_id: string }>("select author_id from boards where id = $1", [boardId]);
  const row = result.rows[0];
  if (!row) {
    return "missing";
  }
  return row.author_id === userId ? "ok" : "forbidden";
}

/**
 * UnpublishImpact (docs/07), the numbers 2a §2.4's sheet shows.
 *
 * There is no `stakesHeld`: OQ-41 is answered and the field is dropped. Unpublishing cannot strand
 * money — a running match finishes on its own version (D5) — so nothing is held, and the number could
 * only ever have been 0 here anyway, because a live match's cash is in the engine's state and
 * `match_players.cash` is written when the match ends.
 */
async function impactOf(
  app: Parameters<FastifyPluginAsync<BoardRoutesOptions>>[0],
  boardId: string,
): Promise<{
  playersInGame: number;
  playsToday: number;
  openMatches: number;
  liveVersion: number;
}> {
  const result = await app.pg.query<{
    players_in_game: string;
    plays_today: string;
    open_matches: string;
    live_version: string;
  }>(
    `with versions as (
       select id, version from board_versions where board_id = $1
     ),
     open_matches as (
       select m.id
         from matches m
         join versions v on v.id = m.board_version_id
        where m.ended_at is null
     )
     select
       (select count(*) from match_players p join open_matches o on o.id = p.match_id)::text as players_in_game,
       (select count(*) from matches m join versions v on v.id = m.board_version_id
          where m.created_at >= now() - interval '1 day')::text as plays_today,
       (select count(*) from open_matches)::text as open_matches,
       (select coalesce(max(version), 0) from versions)::text as live_version`,
    [boardId],
  );
  const row = result.rows[0];
  return {
    playersInGame: Number(row?.players_in_game ?? "0"),
    playsToday: Number(row?.plays_today ?? "0"),
    openMatches: Number(row?.open_matches ?? "0"),
    liveVersion: Number(row?.live_version ?? "0"),
  };
}

export default boardRoutes;

/** Re-exported for the catalogue routes, which need the same card shape. */
export { coverMotif, ruleChips };
