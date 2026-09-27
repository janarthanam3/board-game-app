// Catalogue routes, reader side. docs/07-api-contract.md §Catalogue.
//
// Only live published versions are visible: D5 says unpublishing removes the board from the catalogue
// immediately while the frozen row stays for match history, so every query here filters on
// `withdrawn_at is null` and the board's published status rather than deleting anything.

import type { FrozenBoard, Ruleset } from "@royal-navy/game-engine";
import { newId } from "@royal-navy/shared/id";
import { catalogueQuerySchema, reportBodySchema } from "@royal-navy/shared/schemas/boards";
import type { FastifyPluginAsync } from "fastify";

import { coverMotif, ruleChips, ruleSummary, tileSummaries } from "../boards/document.js";
import { sendError } from "../http/errors.js";

/** docs/08 seeds `royalnavy` as the official author, so "official" is that handle's work. */
const OFFICIAL_HANDLE = "royalnavy";

interface VersionRow {
  id: string;
  board_id: string;
  name: string;
  version: number;
  ring_size: number;
  play_count: number;
  published_at: Date;
  description: string;
  document: FrozenBoard & { ruleset: Ruleset };
  cover_motif: { palette: string[]; grid: number[] };
  author_handle: string;
  author_id: string;
}

/** The live-version join every route here starts from. */
const LIVE_VERSION_SELECT = `
  select v.id, v.board_id, b.name, v.version, v.ring_size, v.play_count, v.published_at,
         v.description, v.document, v.cover_motif, u.handle as author_handle, u.id as author_id
    from board_versions v
    join boards b on b.id = v.board_id
    join users u on u.id = b.author_id
   where v.withdrawn_at is null
     and b.status = 'published'
     and u.deleted_at is null
     -- Republishing adds a version and leaves the old rows untouched (D5), so the catalogue shows
     -- the highest version of each board and nothing older.
     and v.version = (select max(v2.version) from board_versions v2
                       where v2.board_id = v.board_id and v2.withdrawn_at is null)`;

const catalogueRoutes: FastifyPluginAsync = async (app) => {
  app.get("/catalogue", async (request, reply) => {
    const parsed = catalogueQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return sendError(reply, "E_VALIDATION", parsed.error.issues);
    }
    const { q, sort, cursor, limit } = parsed.data;

    // "friends" needs a viewer, so it falls back to "played" for an anonymous reader rather than
    // failing: the catalogue is browsable without signing in (docs/07 lists no auth on this route).
    const viewerId = await viewerOf(app, request.headers.authorization);
    const effectiveSort = sort === "friends" && viewerId === null ? "played" : sort;

    const conditions: string[] = [];
    const values: unknown[] = [];
    if (q) {
      values.push(`%${q}%`);
      conditions.push(`b.name ilike $${values.length}`);
    }
    if (effectiveSort === "friends" && viewerId !== null) {
      values.push(viewerId);
      conditions.push(`b.author_id in (
        select f.friend_id from friendships f where f.user_id = $${values.length} and f.status = 'accepted'
      )`);
    }

    // Keyset paging on the sort's own key plus the id, so a page boundary cannot repeat or skip a row
    // when two boards share a play count or a timestamp.
    const decoded = decodeCursor(cursor);
    if (decoded) {
      values.push(decoded.key, decoded.id);
      const keyParam = `$${values.length - 1}`;
      const idParam = `$${values.length}`;
      conditions.push(
        effectiveSort === "played"
          ? `(v.play_count, v.id) < (${keyParam}::integer, ${idParam})`
          : `(v.published_at, v.id) < (${keyParam}::timestamptz, ${idParam})`,
      );
    }

    const order = effectiveSort === "played" ? "v.play_count desc, v.id desc" : "v.published_at desc, v.id desc";
    values.push(limit + 1); // one extra row tells us whether another page exists
    const sql = `${LIVE_VERSION_SELECT}${conditions.length > 0 ? ` and ${conditions.join(" and ")}` : ""}
      order by ${order}
      limit $${values.length}`;

    const result = await app.pg.query<VersionRow>(sql, values);
    const rows = result.rows.slice(0, limit);
    const hasMore = result.rows.length > limit;
    const last = rows[rows.length - 1];

    return reply.status(200).send({
      items: rows.map((row) => card(row)),
      nextCursor:
        hasMore && last
          ? encodeCursor(effectiveSort === "played" ? String(last.play_count) : last.published_at.toISOString(), last.id)
          : null,
    });
  });

  app.get("/catalogue/:boardVersionId", async (request, reply) => {
    const { boardVersionId } = request.params as { boardVersionId: string };
    const row = await liveVersion(app, boardVersionId);
    if (!row) {
      return sendError(reply, "E_BOARD_UNAVAILABLE");
    }

    return reply.status(200).send({
      board: {
        ...card(row),
        publishedAt: row.published_at.toISOString(),
        description: row.description,
        // The avatar is drawn from a seed rather than an uploaded image, so the handle is the seed.
        authorAvatarSeed: row.author_handle,
        preview: tileSummaries(row.document),
        ruleSummary: ruleSummary(row.document.ruleset),
      },
    });
  });

  app.get("/catalogue/:boardVersionId/rules", async (request, reply) => {
    const { boardVersionId } = request.params as { boardVersionId: string };
    const row = await liveVersion(app, boardVersionId);
    if (!row) {
      return sendError(reply, "E_BOARD_UNAVAILABLE");
    }

    // The frozen ruleset, exactly as the version carries it: this is what a match on it will use.
    return reply.status(200).send({ ruleset: row.document.ruleset, tiles: tileSummaries(row.document) });
  });

  app.post("/catalogue/:boardVersionId/report", { preHandler: app.requireUser }, async (request, reply) => {
    const user = request.user!;
    const { boardVersionId } = request.params as { boardVersionId: string };
    const parsed = reportBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, "E_VALIDATION", parsed.error.issues);
    }

    const exists = await app.pg.query("select 1 from board_versions where id = $1", [boardVersionId]);
    if (exists.rowCount === 0) {
      return sendError(reply, "E_BOARD_UNAVAILABLE");
    }

    await app.pg.query(
      `insert into reports (id, reporter_id, kind, target_board_version_id, reason, note)
       values ($1, $2, 'board', $3, $4, $5)`,
      [newId(), user.id, boardVersionId, parsed.data.reason, parsed.data.note ?? null],
    );
    // 202: the report is queued for a human, not acted on now (D5 "Moderation").
    return reply.status(202).send({ ok: true });
  });
};

function card(row: VersionRow) {
  return {
    boardVersionId: row.id,
    name: row.name,
    version: row.version,
    authorHandle: row.author_handle,
    ringSize: row.ring_size,
    playCount: row.play_count,
    // Stored at publish time so the list does not recompute it per request; regenerated if absent.
    coverMotif: row.cover_motif ?? coverMotif(row.document),
    ruleChips: ruleChips(row.document, row.document.ruleset),
    official: row.author_handle === OFFICIAL_HANDLE,
  };
}

async function liveVersion(
  app: Parameters<FastifyPluginAsync>[0],
  boardVersionId: string,
): Promise<VersionRow | undefined> {
  const result = await app.pg.query<VersionRow>(`${LIVE_VERSION_SELECT} and v.id = $1`, [boardVersionId]);
  return result.rows[0];
}

/** The viewer, when a bearer token happens to be present. The catalogue does not require one. */
async function viewerOf(app: Parameters<FastifyPluginAsync>[0], header: string | undefined): Promise<string | null> {
  const match = /^Bearer (.+)$/i.exec(header ?? "");
  if (!match?.[1]) {
    return null;
  }
  const claims = app.verifyAccess(match[1]);
  return claims?.sub ?? null;
}

/** `key|id`, base64url. Opaque to the client, which only ever echoes it back. */
function encodeCursor(key: string, id: string): string {
  return Buffer.from(`${key}|${id}`, "utf8").toString("base64url");
}

function decodeCursor(cursor: string | undefined): { key: string; id: string } | null {
  if (!cursor) {
    return null;
  }
  const decoded = Buffer.from(cursor, "base64url").toString("utf8");
  const separator = decoded.lastIndexOf("|");
  if (separator <= 0) {
    return null;
  }
  return { key: decoded.slice(0, separator), id: decoded.slice(separator + 1) };
}

export default catalogueRoutes;
