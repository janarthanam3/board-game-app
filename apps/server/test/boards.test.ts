// D3 · Board and catalogue endpoints. docs/07-api-contract.md §Boards and §Catalogue; the refusal
// codes are docs/13-error-catalog.md's.
//
// The counters are the point of several of these tests. The owner's ruling: publish derives
// slots_total, slots_filled and has_errors from the submitted document and never accepts
// client-supplied values; a request carrying them is rejected, not ignored; and unpublish re-derives
// from the live version rather than restoring a draft that may have drifted.

import type { FastifyInstance } from "fastify";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { parseEnv } from "../src/config/env.js";
import { migrateUp } from "../src/db/migrate.js";
import { testEnv } from "./helpers.js";

let app: FastifyInstance;
let token: string;
let handle: string;

function unique(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/** A 5x5 / 16-tile board, the shape the engine's own test board uses. */
function document(overrides: Record<string, unknown> = {}) {
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

const ruleset = {
  money: { startingCash: 10_000, passBonus: 2000, finesTo: "bank" },
  sets: { mode: "majority", customValue: null, mortgageBreaksSet: true, buildEvenly: true },
  auction: { enabled: true, startingPrice: 100, bidTimerSeconds: 15 },
  rounds: { cap: 20, turnTimerSeconds: 30 },
  trade: { expirySeconds: 60 },
};

function publishBody(overrides: Record<string, unknown> = {}) {
  return {
    localBoardId: unique("local-"),
    name: unique("Harbour "),
    description: "A compact ring around the docks.",
    document: document(),
    ruleset,
    ...overrides,
  };
}

async function publish(body = publishBody(), bearer = token) {
  return request(app.server).post("/boards/publish").set("Authorization", `Bearer ${bearer}`).send(body);
}

beforeAll(async () => {
  // The 3-slot limit is D5's and is proved in its own describe against the documented default. Here
  // it is raised, because these tests publish many boards from one account.
  app = await buildApp(parseEnv(testEnv({ MAX_PUBLISHED_BOARDS: "500" })), { authRateLimitPerMinute: 10_000 });
  await app.ready();
  await migrateUp(app.pg);

  handle = unique("cap_").slice(0, 20);
  const account = await request(app.server)
    .post("/auth/signup")
    .send({ handle, email: `${handle}@example.test`, password: "harbour88" });
  token = account.body.accessToken;
});

afterAll(async () => {
  // reports.reporter_id has no cascade (docs/08 specifies it that way, and the product soft-deletes
  // accounts via users.deleted_at), so a hard delete has to clear the reports first.
  await app.pg.query("delete from reports where reporter_id in (select id from users where email like '%@example.test')");
  await app.pg.query("delete from users where email like '%@example.test'");
  await app.close();
});

describe("POST /boards/publish", () => {
  it("publishes version 1 and returns its id", async () => {
    const response = await publish();

    expect(response.status).toBe(201);
    expect(response.body.version).toBe(1);
    expect(typeof response.body.boardVersionId).toBe("string");
  });

  it("derives the counters from the document and marks the board completed", async () => {
    const response = await publish();
    const row = await app.pg.query(
      "select status, slots_total, slots_filled, has_errors, state from boards where id = (select board_id from board_versions where id = $1)",
      [response.body.boardVersionId],
    );

    // 5x5 has 16 ring positions and the document fills all of them.
    expect(row.rows[0]).toMatchObject({
      status: "published",
      slots_total: 16,
      slots_filled: 16,
      has_errors: false,
      state: "published",
    });
  });

  it("rejects a request that carries its own counters, rather than ignoring them", async () => {
    const response = await publish(publishBody({ slots_total: 99, slots_filled: 99, has_errors: false }));

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("E_VALIDATION");
  });

  it("refuses a board whose colour set can never be held, with the panel's rows", async () => {
    const broken = document({
      groups: [
        { id: "g-purple", colour: "purple", tileIndexes: [1, 2], thresholdOverride: 3 },
        { id: "g-sky", colour: "sky", tileIndexes: [5, 6, 9, 10, 11], thresholdOverride: null },
      ],
    });
    const response = await publish(publishBody({ document: broken }));

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("E_BOARD_INVALID");
    const codes = response.body.error.details.errors.map((row: { code: string }) => row.code);
    expect(codes).toContain("E_SET_BELOW_THRESHOLD");
    const row = response.body.error.details.errors.find((entry: { code: string }) => entry.code === "E_SET_BELOW_THRESHOLD");
    expect(row.message).toBe("Purple set has 2 tiles, threshold 3");
    expect(row.detail).toBe("This set can never be held");
  });

  it("refuses a MOVE block that targets a card space (OQ-19 item 6)", async () => {
    const decks = [
      {
        id: "d-chance",
        name: "Chance",
        drawMode: "shuffle",
        fallback: "nothing",
        rules: [
          {
            active: true,
            diceTotals: [],
            rule: {
              id: "r-jump",
              name: "Advance",
              conditions: null,
              money: null,
              move: { direction: "toTile", count: 3, targetTileIndex: 4, collectPassBonus: false },
              holdCard: null,
            },
          },
        ],
      },
    ];
    const response = await publish(publishBody({ document: document({ decks }) }));

    expect(response.status).toBe(422);
    const codes = response.body.error.details.errors.map((row: { code: string }) => row.code);
    expect(codes).toContain("E_MOVE_TARGETS_CARD_SPACE");
  });

  it("publishes a board that only has warnings", async () => {
    // No jail tile is a warning (D7), so it must not block.
    const tiles = document().tiles.map((tile: Record<string, unknown>) =>
      tile.cornerType === "jail" ? { ...tile, cornerType: "none" } : tile,
    );
    const response = await publish(publishBody({ document: document({ tiles }) }));

    expect(response.status).toBe(201);
  });

  it("publishing again creates version 2 and never mutates version 1", async () => {
    const body = publishBody();
    const first = await publish(body);
    expect(first.status).toBe(201);

    const before = await app.pg.query("select * from board_versions where id = $1", [first.body.boardVersionId]);

    const second = await publish({ ...body, description: "Now with a different description." });
    expect(second.status).toBe(201);
    expect(second.body.version).toBe(2);

    const after = await app.pg.query("select * from board_versions where id = $1", [first.body.boardVersionId]);
    // D5: a published version is immutable. Every column of v1 is untouched — including
    // withdrawn_at, because a running match finishes on v1.
    expect(after.rows[0]).toEqual(before.rows[0]);
    expect(second.body.boardVersionId).not.toBe(first.body.boardVersionId);

    // The catalogue shows the latest version only, so v1 is not listed twice.
    const listed = await request(app.server).get("/catalogue").query({ q: body.name, limit: 50 });
    const ids = listed.body.items.map((item: { boardVersionId: string }) => item.boardVersionId);
    expect(ids).toEqual([second.body.boardVersionId]);
  });

  it("refuses a fourth published board with E_PUBLISH_SLOTS_FULL, at D5's documented limit", async () => {
    // No MAX_PUBLISHED_BOARDS override: this asserts the 3 that decision D5 and docs/09 specify.
    const limited = await buildApp(parseEnv(testEnv()), { authRateLimitPerMinute: 10_000 });
    await limited.ready();
    try {
      const solo = unique("slot_").slice(0, 20);
      const account = await request(limited.server)
        .post("/auth/signup")
        .send({ handle: solo, email: `${solo}@example.test`, password: "harbour88" });
      const bearer = account.body.accessToken;

      for (let used = 0; used < 3; used++) {
        const response = await request(limited.server)
          .post("/boards/publish")
          .set("Authorization", `Bearer ${bearer}`)
          .send(publishBody());
        expect(response.status).toBe(201);
      }
      const fourth = await request(limited.server)
        .post("/boards/publish")
        .set("Authorization", `Bearer ${bearer}`)
        .send(publishBody());

      expect(fourth.status).toBe(409);
      expect(fourth.body.error.code).toBe("E_PUBLISH_SLOTS_FULL");
    } finally {
      await limited.close();
    }
  });

  it("needs a bearer token", async () => {
    const response = await request(app.server).post("/boards/publish").send(publishBody());

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("E_UNAUTHENTICATED");
  });
});

describe("GET /boards/name-available", () => {
  it("is true for an unused name and false for one this author already published", async () => {
    const body = publishBody();
    await publish(body);

    const taken = await request(app.server)
      .get("/boards/name-available")
      .query({ name: body.name })
      .set("Authorization", `Bearer ${token}`);
    const free = await request(app.server)
      .get("/boards/name-available")
      .query({ name: unique("Unused ") })
      .set("Authorization", `Bearer ${token}`);

    expect(taken.body.available).toBe(false);
    expect(free.body.available).toBe(true);
  });

  it("only considers this author's boards — the name is unique per account, not globally", async () => {
    const body = publishBody();
    await publish(body);

    const other = unique("other_").slice(0, 20);
    const account = await request(app.server)
      .post("/auth/signup")
      .send({ handle: other, email: `${other}@example.test`, password: "harbour88" });

    const response = await request(app.server)
      .get("/boards/name-available")
      .query({ name: body.name })
      .set("Authorization", `Bearer ${account.body.accessToken}`);

    expect(response.body.available).toBe(true);
  });
});

describe("GET /boards/published", () => {
  it("lists the author's published boards with the slot count", async () => {
    // docs/07 states `slots: { used, total: 3 }`, so this runs at the documented default.
    const plain = await buildApp(parseEnv(testEnv()), { authRateLimitPerMinute: 10_000 });
    await plain.ready();
    try {
      const owner = unique("list_").slice(0, 20);
      const account = await request(plain.server)
        .post("/auth/signup")
        .send({ handle: owner, email: `${owner}@example.test`, password: "harbour88" });
      const bearer = account.body.accessToken;
      await request(plain.server)
        .post("/boards/publish")
        .set("Authorization", `Bearer ${bearer}`)
        .send(publishBody());

      const response = await request(plain.server).get("/boards/published").set("Authorization", `Bearer ${bearer}`);

      expect(response.status).toBe(200);
      expect(response.body.items).toHaveLength(1);
      expect(response.body.slots).toEqual({ used: 1, total: 3 });
    } finally {
      await plain.close();
    }
  });
});

describe("POST /boards/:boardId/unpublish and GET /boards/:boardId/impact", () => {
  async function published(bearer = token) {
    const response = await publish(publishBody(), bearer);
    const row = await app.pg.query<{ board_id: string }>("select board_id from board_versions where id = $1", [
      response.body.boardVersionId,
    ]);
    return { boardId: row.rows[0]!.board_id, boardVersionId: response.body.boardVersionId };
  }

  it("reports the impact numbers the unpublish sheet shows", async () => {
    const { boardId } = await published();
    const response = await request(app.server)
      .get(`/boards/${boardId}/impact`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      playersInGame: 0,
      playsToday: 0,
      openMatches: 0,
      liveVersion: 1,
    });
    // OQ-41, answered: the field is gone, not zero.
    expect(response.body).not.toHaveProperty("stakesHeld");
  });

  it("frees the slot and takes the board out of the catalogue", async () => {
    const { boardId, boardVersionId } = await published();
    const response = await request(app.server)
      .post(`/boards/${boardId}/unpublish`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.freedSlots).toBe(1);

    const board = await app.pg.query("select status, state from boards where id = $1", [boardId]);
    expect(board.rows[0]).toMatchObject({ status: "draft" });

    // D5: the frozen version stays in the database so history still resolves.
    const version = await app.pg.query("select withdrawn_at from board_versions where id = $1", [boardVersionId]);
    expect(version.rows[0]!.withdrawn_at).not.toBeNull();

    const catalogue = await request(app.server).get(`/catalogue/${boardVersionId}`);
    expect(catalogue.status).toBe(404);
    expect(catalogue.body.error.code).toBe("E_BOARD_UNAVAILABLE");
  });

  it("re-derives the counters from the live version, not from a draft that may have drifted", async () => {
    const { boardId } = await published();
    // Pretend the client PATCHed nonsense counters while editing: they are a display hint only and
    // nothing may gate on them, so unpublish must overwrite them from the version's own document.
    await app.pg.query("update boards set slots_filled = 1, slots_total = 40, has_errors = true where id = $1", [
      boardId,
    ]);

    await request(app.server).post(`/boards/${boardId}/unpublish`).set("Authorization", `Bearer ${token}`);

    const row = await app.pg.query("select slots_total, slots_filled, has_errors, state from boards where id = $1", [
      boardId,
    ]);
    expect(row.rows[0]).toMatchObject({ slots_total: 16, slots_filled: 16, has_errors: false, state: "completed" });
  });

  it("refuses to unpublish someone else's board", async () => {
    const { boardId } = await published();
    const other = unique("thief_").slice(0, 20);
    const account = await request(app.server)
      .post("/auth/signup")
      .send({ handle: other, email: `${other}@example.test`, password: "harbour88" });

    const response = await request(app.server)
      .post(`/boards/${boardId}/unpublish`)
      .set("Authorization", `Bearer ${account.body.accessToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("E_FORBIDDEN");
  });
});

describe("GET /catalogue", () => {
  it("returns published boards as catalogue cards", async () => {
    const owner = unique("cat_").slice(0, 20);
    const account = await request(app.server)
      .post("/auth/signup")
      .send({ handle: owner, email: `${owner}@example.test`, password: "harbour88" });
    const body = publishBody();
    await publish(body, account.body.accessToken);

    const response = await request(app.server).get("/catalogue").query({ limit: 50 });

    expect(response.status).toBe(200);
    const card = response.body.items.find((item: { name: string }) => item.name === body.name);
    expect(card).toMatchObject({ authorHandle: owner, ringSize: 16, version: 1, playCount: 0, official: false });
    expect(card.coverMotif.grid).toHaveLength(16);
    expect(card.ruleChips.length).toBeLessThanOrEqual(3);
  });

  it("pages with a cursor and never repeats a card", async () => {
    const owner = unique("page_").slice(0, 20);
    const account = await request(app.server)
      .post("/auth/signup")
      .send({ handle: owner, email: `${owner}@example.test`, password: "harbour88" });
    for (let made = 0; made < 3; made++) {
      await publish(publishBody(), account.body.accessToken);
    }

    const first = await request(app.server).get("/catalogue").query({ limit: 2, sort: "new" });
    expect(first.body.items).toHaveLength(2);
    expect(first.body.nextCursor).toBeTruthy();

    const second = await request(app.server)
      .get("/catalogue")
      .query({ limit: 2, sort: "new", cursor: first.body.nextCursor });

    const firstIds = first.body.items.map((item: { boardVersionId: string }) => item.boardVersionId);
    const secondIds = second.body.items.map((item: { boardVersionId: string }) => item.boardVersionId);
    expect(secondIds.some((id: string) => firstIds.includes(id))).toBe(false);
  });

  it("sorts by newest when asked", async () => {
    const response = await request(app.server).get("/catalogue").query({ sort: "new", limit: 10 });
    const dates = response.body.items.map((item: { publishedAt?: string }) => item.publishedAt);

    // The list is newest first, so each timestamp is no later than the one before it.
    const sorted = [...dates].sort().reverse();
    expect(dates).toEqual(sorted);
  });

  it("filters by a search term", async () => {
    const owner = unique("find_").slice(0, 20);
    const account = await request(app.server)
      .post("/auth/signup")
      .send({ handle: owner, email: `${owner}@example.test`, password: "harbour88" });
    const body = publishBody({ name: unique("Lighthouse ") });
    await publish(body, account.body.accessToken);

    const response = await request(app.server).get("/catalogue").query({ q: "Lighthouse", limit: 50 });

    expect(response.body.items.length).toBeGreaterThan(0);
    for (const item of response.body.items) {
      expect(item.name.toLowerCase()).toContain("lighthouse");
    }
  });

  it("refuses an unknown sort", async () => {
    const response = await request(app.server).get("/catalogue").query({ sort: "cheapest" });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("E_VALIDATION");
  });

  it("omits an unpublished board", async () => {
    const owner = unique("gone_").slice(0, 20);
    const account = await request(app.server)
      .post("/auth/signup")
      .send({ handle: owner, email: `${owner}@example.test`, password: "harbour88" });
    const bearer = account.body.accessToken;
    const created = await publish(publishBody(), bearer);
    const row = await app.pg.query<{ board_id: string }>("select board_id from board_versions where id = $1", [
      created.body.boardVersionId,
    ]);
    await request(app.server)
      .post(`/boards/${row.rows[0]!.board_id}/unpublish`)
      .set("Authorization", `Bearer ${bearer}`);

    const response = await request(app.server).get("/catalogue").query({ limit: 50 });
    const ids = response.body.items.map((item: { boardVersionId: string }) => item.boardVersionId);
    expect(ids).not.toContain(created.body.boardVersionId);
  });
});

describe("GET /catalogue/:boardVersionId", () => {
  it("returns the detail a catalogue card cannot carry", async () => {
    const created = await publish();
    const response = await request(app.server).get(`/catalogue/${created.body.boardVersionId}`);

    expect(response.status).toBe(200);
    expect(response.body.board).toMatchObject({ version: 1, ringSize: 16, authorHandle: handle });
    expect(response.body.board.preview).toHaveLength(16);
    expect(typeof response.body.board.publishedAt).toBe("string");
    expect(Array.isArray(response.body.board.ruleSummary)).toBe(true);
  });

  it("answers an unknown id with E_BOARD_UNAVAILABLE", async () => {
    const response = await request(app.server).get("/catalogue/01JQZZZZZZZZZZZZZZZZZZZZZZ");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("E_BOARD_UNAVAILABLE");
  });
});

describe("GET /catalogue/:boardVersionId/rules", () => {
  it("returns the frozen ruleset and tile summaries for the read-only rules screen", async () => {
    const created = await publish();
    const response = await request(app.server).get(`/catalogue/${created.body.boardVersionId}/rules`);

    expect(response.status).toBe(200);
    expect(response.body.ruleset.sets.mode).toBe("majority");
    expect(response.body.tiles).toHaveLength(16);
  });
});

describe("POST /catalogue/:boardVersionId/report", () => {
  it("accepts a report with 202", async () => {
    const created = await publish();
    const response = await request(app.server)
      .post(`/catalogue/${created.body.boardVersionId}/report`)
      .set("Authorization", `Bearer ${token}`)
      .send({ reason: "offensive", note: "The tile names are abusive." });

    expect(response.status).toBe(202);
  });

  it("refuses an unknown reason", async () => {
    const created = await publish();
    const response = await request(app.server)
      .post(`/catalogue/${created.body.boardVersionId}/report`)
      .set("Authorization", `Bearer ${token}`)
      .send({ reason: "boring" });

    expect(response.status).toBe(422);
  });
});
