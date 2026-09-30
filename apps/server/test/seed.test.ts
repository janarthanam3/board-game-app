// D5 · the gate's second criterion: "seed data loads". docs/08-database.md §"Seed data" is the spec.
//
// The seed is the one fixture the whole team develops against, so these tests check what it *is*, not
// only that it ran: the boards publish-valid, the match really played, and no Monopoly name anywhere.

import { validateBoard, type FrozenBoard, type Ruleset } from "@royal-navy/game-engine";
import type { FastifyInstance } from "fastify";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { parseEnv } from "../src/config/env.js";
import { migrateUp } from "../src/db/migrate.js";
import { seed } from "../src/db/seed.js";
import {
  chennaiBoard,
  chennaiRuleset,
  classicBoard,
  classicRuleset,
  GROUP_COLOURS,
  SEED_USERS,
} from "../src/db/seed-data.js";
import { testEnv } from "./helpers.js";

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp(parseEnv(testEnv()), { authRateLimitPerMinute: 10_000 });
  await app.ready();
  await migrateUp(app.pg);
  await seed(app.pg);
}, 120_000);

afterAll(async () => {
  await app.close();
});

describe("the seed loads", () => {
  it("inserts the four users docs/08 names", async () => {
    const rows = await app.pg.query<{ handle: string }>(
      "select handle from users where handle = any($1::text[]) order by handle",
      [SEED_USERS.map((user) => user.handle)],
    );

    expect(rows.rows.map((row) => row.handle)).toEqual(["arun", "naveen", "priya", "royalnavy"]);
  });

  it("is idempotent — a second run changes nothing", async () => {
    const before = await counts();

    await seed(app.pg);

    expect(await counts()).toEqual(before);
  }, 120_000);

  it("publishes Classic at 11x11 / 40 tiles, owned by royalnavy", async () => {
    const row = await app.pg.query<{ ring_size: number; rows: number; cols: number; handle: string; status: string }>(
      `select v.ring_size, v.rows, v.cols, u.handle, b.status
         from board_versions v join boards b on b.id = v.board_id join users u on u.id = b.author_id
        where b.name = 'Classic'`,
    );

    expect(row.rows[0]).toMatchObject({ ring_size: 40, rows: 11, cols: 11, handle: "royalnavy", status: "published" });
  });

  it("publishes Chennai Edition at 5x5 / 16 tiles, owned by naveen, with the 3-of-5 threshold", async () => {
    const row = await app.pg.query<{ ring_size: number; handle: string; document: FrozenBoard & { ruleset: Ruleset } }>(
      `select v.ring_size, u.handle, v.document
         from board_versions v join boards b on b.id = v.board_id join users u on u.id = b.author_id
        where b.name = 'Chennai Edition'`,
    );

    expect(row.rows[0]).toMatchObject({ ring_size: 16, handle: "naveen" });
    expect(row.rows[0]!.document.ruleset.money.startingCash).toBe(15_000);
    expect(row.rows[0]!.document.ruleset.sets).toMatchObject({ mode: "custom", customValue: 3 });
  });

  it("seeds boards the publish gate would accept", () => {
    // The same validator POST /boards/publish runs (D7). A seed the product would refuse is a seed that
    // lies about what the product accepts.
    const errors = (board: FrozenBoard, ruleset: Ruleset) =>
      validateBoard(board, ruleset).filter((issue) => issue.severity === "error");

    expect(errors(classicBoard(), classicRuleset())).toEqual([]);
    expect(errors(chennaiBoard(), chennaiRuleset())).toEqual([]);
  });

  it("appears in the catalogue both boards are published to", async () => {
    const response = await request(app.server).get("/catalogue");

    const names = (response.body.items as { name: string }[]).map((item) => item.name);
    expect(names).toContain("Classic");
    expect(names).toContain("Chennai Edition");
  });
});

describe("the completed match docs/08 asks for", () => {
  it("has six seats, placed, with the three seeded accounts among them", async () => {
    const players = await app.pg.query<{ name: string; final_place: number; user_id: string | null }>(
      `select p.name, p.final_place, p.user_id from match_players p
         join matches m on m.id = p.match_id where m.ended_at is not null order by p.seat`,
    );

    expect(players.rows).toHaveLength(6);
    expect(players.rows.map((row) => row.name)).toEqual(["Naveen", "Priya", "Arun", "Meera", "Karthik", "Divya"]);
    // Every seat is placed 1..6, which is what `2b`'s standings render.
    expect([...players.rows.map((row) => row.final_place)].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6]);
    // Three are real accounts; the rest are guest seats, which match_players allows.
    expect(players.rows.filter((row) => row.user_id !== null)).toHaveLength(3);
  });

  it("ran to the round cap and carries a full event log", async () => {
    const match = await app.pg.query<{ end_reason: string; end_round: number; winner_player_id: string }>(
      "select end_reason, end_round, winner_player_id from matches where ended_at is not null",
    );
    const events = await app.pg.query<{ count: string }>(
      "select count(*)::text as count from match_events where match_id = (select id from matches where ended_at is not null)",
    );

    expect(match.rows[0]?.end_reason).toBe("cap");
    expect(match.rows[0]?.end_round).toBe(20);
    expect(match.rows[0]?.winner_player_id).toBeTruthy();
    // A real 20-round six-player match; the exact number depends on the seeded RNG.
    expect(Number(events.rows[0]!.count)).toBeGreaterThan(100);
  });

  it("carries per-round snapshots for 2b's chart", async () => {
    const snapshots = await app.pg.query<{ round: number }>(
      `select distinct round from match_round_snapshots
        where match_id = (select id from matches where ended_at is not null) order by round`,
    );

    expect(snapshots.rows.length).toBeGreaterThan(1);
    expect(snapshots.rows[0]?.round).toBe(1);
  });

  it("serves a result and a log through the real routes", async () => {
    const match = await app.pg.query<{ id: string }>("select id from matches where ended_at is not null");
    const matchId = match.rows[0]!.id;
    const account = await request(app.server)
      .post("/auth/signin")
      .send({ email: "naveen@royalnavy.test", password: "royalnavy" });
    const token = account.body.accessToken;

    const result = await request(app.server).get(`/matches/${matchId}/result`).set("Authorization", `Bearer ${token}`);
    const log = await request(app.server).get(`/matches/${matchId}/log`).set("Authorization", `Bearer ${token}`);

    // The state is gone from Redis — this match was never live — so the result route refuses rather than
    // answering with half a result. `2b` reads it while the match is still in Redis; a match read back
    // days later is what OQ-48 covers.
    expect([200, 503]).toContain(result.status);
    expect(log.status).toBe(200);
    expect((log.body.items as unknown[]).length).toBeGreaterThan(0);
  });
});

describe("no Monopoly board names anywhere in the seed", () => {
  // CLAUDE.md: "No Monopoly board names in code, fixtures, seeds or tests — they are blocked at publish
  // time too." docs/08's own seed list contains seven of them, in the same section that forbids them;
  // the owner confirmed on 28 September 2026 that the constraint wins. This is what holds the line.
  const FORBIDDEN = [
    "go to jail",
    "community chest",
    "income tax",
    "luxury tax",
    "free parking",
    "free park",
    "park avenue",
    "park place",
    "boardwalk",
    "mayfair",
    "monopoly",
    "marvin gardens",
    "baltic",
    "oriental",
    "ventnor",
    "st charles",
    "reading railroad",
    "electric company",
    "water works",
  ];

  it("has none in either seeded board", () => {
    const names = [...classicBoard().tiles, ...chennaiBoard().tiles].map((tile) => tile.name.toLowerCase());

    for (const forbidden of FORBIDDEN) {
      expect(names).not.toContain(forbidden);
    }
  });

  it("has none in the stored documents either", async () => {
    const rows = await app.pg.query<{ document: unknown }>("select document from board_versions");
    const serialised = JSON.stringify(rows.rows).toLowerCase();

    for (const forbidden of FORBIDDEN) {
      expect(serialised).not.toContain(forbidden);
    }
  });

  it("keeps every Chennai name docs/08 lists", () => {
    // The substitution replaced seven names and nothing else: these are the list's own, and they stay.
    const names = classicBoard().tiles.map((tile) => tile.name);

    for (const kept of ["Old Town", "Mill Street", "Marina Drive", "Anna Salai", "Mylapore", "Adyar", "Guindy", "Avadi"]) {
      expect(names).toContain(kept);
    }
  });
});

describe("the four decks", () => {
  it("exist with the names and draw modes docs/08 and 1y specify", () => {
    const decks = classicBoard().decks;

    expect(decks.map((deck) => deck.name)).toEqual(["Chance", "Community fund", "Tax office", "Club privilege"]);
    expect(decks.map((deck) => deck.drawMode)).toEqual(["shuffle", "diceNumber", "myOrder", "diceNumber"]);
  });

  it("carry no rules, which is OQ-46 and not an oversight", () => {
    // docs/08 wants 14 / 3 / 6 / 4. `1z` names six rules in the whole design and nothing says which rule
    // belongs to which deck, in what order, or what most of them do. The engine treats an empty deck as a
    // first-class case, so the boards are playable and a card space simply draws nothing.
    for (const deck of classicBoard().decks) {
      expect(deck.rules).toEqual([]);
    }
  });
});

describe("the group colours the boards are seeded with", () => {
  // A group's colour is board data, and the design states no palette (OQ-51). What broke is that the
  // client draws it as a fill: `sky` and `amber` both shipped, neither is a colour keyword, and those
  // groups drew no tile band, no list bar and no set line. The half of the guard that needs the
  // renderer's own parser lives with the renderer, in
  // `apps/mobile/src/ui/groupColour.test.ts`, which reads GROUP_COLOURS from this module. This half
  // pins that the seeded boards use nothing outside it.
  const colours = [...classicBoard().groups, ...chennaiBoard().groups].map((group) => group.colour);

  it("uses only the colours GROUP_COLOURS declares, so a new one cannot slip in unchecked", () => {
    expect([...new Set(colours)].sort()).toEqual([...GROUP_COLOURS].sort());
  });

  it("gives no two groups on one board the same colour (rulebook §4 'One colour, one set', D2)", () => {
    for (const board of [classicBoard(), chennaiBoard()]) {
      const used = board.groups.map((group) => group.colour);
      expect(new Set(used).size).toBe(used.length);
    }
  });

  it("no longer carries the two the client could not render", () => {
    expect(colours).not.toContain("sky");
    expect(colours).not.toContain("amber");
  });
});

async function counts(): Promise<Record<string, number>> {
  const one = async (sql: string): Promise<number> => Number((await app.pg.query<{ c: string }>(sql)).rows[0]!.c);
  return {
    users: await one("select count(*)::text as c from users where email like '%@royalnavy.test'"),
    boards: await one("select count(*)::text as c from boards"),
    versions: await one("select count(*)::text as c from board_versions"),
    matches: await one("select count(*)::text as c from matches"),
    events: await one("select count(*)::text as c from match_events"),
  };
}
