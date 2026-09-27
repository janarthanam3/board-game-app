// D4 · the match REST routes. docs/07-api-contract.md §Matches; docs/flows/match-create-join.md for the
// create and join sequence and its failure branches; docs/13-error-catalog.md for every code asserted.
//
// `GET /history` and `GET /leaderboard` are not tested because they are not implemented — they are `3h`
// and `3d`, G2's screens, and OQ-9 decides what rows they may contain. See routes/matches.ts.

import type { FastifyInstance } from "fastify";
import request from "supertest";
import { io as connectClient, type Socket } from "socket.io-client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { parseEnv } from "../src/config/env.js";
import { migrateUp } from "../src/db/migrate.js";
import { publishBody, unique } from "./fixtures.js";
import { testEnv } from "./helpers.js";

interface Account {
  id: string;
  handle: string;
  token: string;
}

let app: FastifyInstance;
let baseUrl: string;
let host: Account;
let guest: Account;
let stranger: Account;
let boardVersionId: string;
const open: Socket[] = [];

async function signUp(prefix: string): Promise<Account> {
  const handle = unique(prefix).slice(0, 20);
  const response = await request(app.server)
    .post("/auth/signup")
    .send({ handle, email: `${handle}@example.test`, password: "harbour88" });
  return { id: response.body.user.id, handle, token: response.body.accessToken };
}

function create(token = host.token, boardId = boardVersionId, settings: unknown = { name: unique("Friday ") }) {
  return request(app.server).post("/matches").set("Authorization", `Bearer ${token}`).send({ boardVersionId: boardId, settings });
}

function join(token: string, roomCode: string) {
  return request(app.server).post("/matches/join").set("Authorization", `Bearer ${token}`).send({ roomCode });
}

/** Creates a room, seats the guest, and starts it over the socket — the only path that starts a match. */
async function startedMatch(): Promise<{ matchId: string; hostSocket: Socket }> {
  const created = await create();
  const { matchId, roomCode } = created.body as { matchId: string; roomCode: string };
  await join(guest.token, roomCode);

  const hostSocket = connectClient(`${baseUrl}/match`, {
    transports: ["websocket"],
    auth: { token: host.token },
    forceNew: true,
  });
  open.push(hostSocket);
  await hostSocket.emitWithAck("match:subscribe", { matchId });
  const live = new Promise((resolve) => hostSocket.once("match:state", resolve));
  await hostSocket.emitWithAck("lobby:start", { matchId });
  await live;
  return { matchId, hostSocket };
}

beforeAll(async () => {
  app = await buildApp(parseEnv(testEnv()), { authRateLimitPerMinute: 10_000 });
  await app.ready();
  await migrateUp(app.pg);
  baseUrl = await app.listen({ host: "127.0.0.1", port: 0 });

  host = await signUp("mh_");
  guest = await signUp("mg_");
  stranger = await signUp("ms_");

  const published = await request(app.server)
    .post("/boards/publish")
    .set("Authorization", `Bearer ${host.token}`)
    .send(publishBody());
  boardVersionId = published.body.boardVersionId;
});

afterAll(async () => {
  for (const client of open) {
    client.disconnect();
  }
  await app.pg.query("delete from matches where host_user_id in (select id from users where email like '%@example.test')");
  await app.pg.query("delete from users where email like '%@example.test'");
  await app.close();
});

describe("POST /matches", () => {
  it("creates a room and returns its id and a four-character code", async () => {
    const response = await create();

    expect(response.status).toBe(201);
    expect(typeof response.body.matchId).toBe("string");
    // `1b` §2.2 draws a four-character code; the alphabet has no I, O, 0 or 1 to misread.
    expect(response.body.roomCode).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/);
  });

  it("seats the host as seat 1 in the first seat colour", async () => {
    const response = await create();

    const players = await app.pg.query<{ seat: number; colour: string; user_id: string }>(
      "select seat, colour, user_id from match_players where match_id = $1",
      [response.body.matchId],
    );
    expect(players.rows).toEqual([{ seat: 1, colour: "gold", user_id: host.id }]);
  });

  it("refuses a board that is not published", async () => {
    const response = await create(host.token, "01JNOTAREALBOARDVERSION0000");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("E_BOARD_UNAVAILABLE");
  });

  it("refuses a settings key that is not the room name, so nothing can override a board rule", async () => {
    // D1: rules come from the board and there is no match-time override anywhere. The body is strict, so
    // a rule-shaped settings key is a rejection rather than something quietly stored.
    const response = await create(host.token, boardVersionId, { name: "Friday", startingCash: 99_000 });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("E_VALIDATION");
  });

  it("requires a signed-in host — no anonymous rooms (flow invariant 1)", async () => {
    const response = await request(app.server).post("/matches").send({ boardVersionId, settings: { name: "Friday" } });

    expect(response.status).toBe(401);
  });
});

describe("POST /matches/join", () => {
  it("seats a guest at the next seat and the next colour", async () => {
    const created = await create();
    const response = await join(guest.token, created.body.roomCode);

    expect(response.status).toBe(200);
    expect(response.body.matchId).toBe(created.body.matchId);
    const players = await app.pg.query<{ seat: number; colour: string }>(
      "select seat, colour from match_players where match_id = $1 order by seat",
      [created.body.matchId],
    );
    expect(players.rows).toEqual([
      { seat: 1, colour: "gold" },
      { seat: 2, colour: "blue" },
    ]);
  });

  it("accepts a lower-case code, because the field takes what the player types", async () => {
    const created = await create();
    const response = await join(guest.token, String(created.body.roomCode).toLowerCase());

    expect(response.status).toBe(200);
  });

  it("refuses an unknown code with E_ROOM_NOT_FOUND", async () => {
    const response = await join(guest.token, "ZZZZ");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("E_ROOM_NOT_FOUND");
  });

  it("refuses a code of the wrong length before it looks anything up", async () => {
    const response = await join(guest.token, "ZZZZZZ");

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("E_VALIDATION");
  });

  it("is idempotent for a guest who is already seated", async () => {
    const created = await create();
    await join(guest.token, created.body.roomCode);
    const again = await join(guest.token, created.body.roomCode);

    expect(again.status).toBe(200);
    const players = await app.pg.query("select 1 from match_players where match_id = $1", [created.body.matchId]);
    expect(players.rowCount).toBe(2);
  });

  it("refuses a room that has already started with E_ROOM_STARTED", async () => {
    const created = await create();
    const code = created.body.roomCode;
    await join(guest.token, code);
    // Starting frees the code, so the row is marked started directly to test the branch the flow doc
    // names ("Match already started") rather than the freed-code branch.
    await app.pg.query("update matches set started_at = now() where id = $1", [created.body.matchId]);

    const response = await join(stranger.token, code);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("E_ROOM_STARTED");
  });

  it("refuses a full room with E_ROOM_FULL", async () => {
    const created = await create();
    const code = created.body.roomCode;
    // Five more seats fill the six the rulebook allows.
    for (let seat = 0; seat < 5; seat++) {
      const filler = await signUp(`mf${seat}_`);
      expect((await join(filler.token, code)).status).toBe(200);
    }

    const seventh = await signUp("mx_");
    const response = await join(seventh.token, code);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("E_ROOM_FULL");
  });

  it("refuses a guest a seated player has blocked (B16)", async () => {
    const created = await create();
    await app.pg.query("insert into blocks (user_id, blocked_id) values ($1, $2)", [host.id, stranger.id]);

    const response = await join(stranger.token, created.body.roomCode);

    await app.pg.query("delete from blocks where user_id = $1 and blocked_id = $2", [host.id, stranger.id]);
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("E_BLOCKED_BY_HOST");
  });
});

describe("GET /matches/:matchId", () => {
  it("refuses a match that has not started with E_MATCH_NOT_LIVE", async () => {
    const created = await create();

    const response = await request(app.server)
      .get(`/matches/${created.body.matchId}`)
      .set("Authorization", `Bearer ${host.token}`);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("E_MATCH_NOT_LIVE");
  });

  it("gives a member the whole state and a non-member a redacted one", async () => {
    const { matchId } = await startedMatch();

    const member = await request(app.server).get(`/matches/${matchId}`).set("Authorization", `Bearer ${host.token}`);
    const outsider = await request(app.server).get(`/matches/${matchId}`).set("Authorization", `Bearer ${stranger.token}`);

    expect(member.status).toBe(200);
    expect(JSON.stringify(member.body.state)).toContain("holdCards");
    expect(outsider.status).toBe(200);
    // The same redaction the spectator socket applies: the fields do not arrive at all.
    expect(JSON.stringify(outsider.body.state)).not.toContain("holdCards");
    expect(JSON.stringify(outsider.body.state)).not.toContain("offers");
  });

  it("refuses an unknown match with E_NOT_IN_MATCH", async () => {
    const response = await request(app.server).get("/matches/01JNOSUCHMATCH0000000000000").set("Authorization", `Bearer ${host.token}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("E_NOT_IN_MATCH");
  });
});

describe("POST /matches/:matchId/leave", () => {
  it("frees a guest's seat before the match starts", async () => {
    const created = await create();
    await join(guest.token, created.body.roomCode);

    const response = await request(app.server)
      .post(`/matches/${created.body.matchId}/leave`)
      .set("Authorization", `Bearer ${guest.token}`);

    expect(response.status).toBe(204);
    const players = await app.pg.query("select 1 from match_players where match_id = $1", [created.body.matchId]);
    expect(players.rowCount).toBe(1);
  });

  it("closes the room when the host leaves before the match starts", async () => {
    const created = await create();
    await join(guest.token, created.body.roomCode);

    const response = await request(app.server)
      .post(`/matches/${created.body.matchId}/leave`)
      .set("Authorization", `Bearer ${host.token}`);

    expect(response.status).toBe(204);
    const row = await app.pg.query<{ end_reason: string }>("select end_reason from matches where id = $1", [created.body.matchId]);
    expect(row.rows[0]?.end_reason).toBe("closed");
    // The code is freed, so it cannot admit anyone to a closed room.
    const rejoined = await join(stranger.token, created.body.roomCode);
    expect(rejoined.status).toBe(404);
  });

  it("keeps a seat that is part of a running match", async () => {
    const { matchId } = await startedMatch();

    const response = await request(app.server).post(`/matches/${matchId}/leave`).set("Authorization", `Bearer ${guest.token}`);

    expect(response.status).toBe(204);
    // `2b` must still name a player who walked out, and their deeds are still on the board.
    const players = await app.pg.query("select 1 from match_players where match_id = $1", [matchId]);
    expect(players.rowCount).toBe(2);
  });

  it("refuses someone who is not seated", async () => {
    const created = await create();

    const response = await request(app.server)
      .post(`/matches/${created.body.matchId}/leave`)
      .set("Authorization", `Bearer ${stranger.token}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("E_NOT_IN_MATCH");
  });
});

describe("GET /matches/:matchId/log", () => {
  it("returns the match's events newest first, each with its 2c category", async () => {
    const { matchId } = await startedMatch();

    const response = await request(app.server).get(`/matches/${matchId}/log`).set("Authorization", `Bearer ${host.token}`);

    expect(response.status).toBe(200);
    const items = response.body.items as { seq: number; kind: string; category: string; round: number }[];
    expect(items.length).toBeGreaterThan(0);
    // Newest first: `2c` "Newest round first; within a round, newest entry first."
    expect(items.map((item) => item.seq)).toEqual([...items.map((item) => item.seq)].sort((a, b) => b - a));
    // The match's own opening lines are system lines, which `2c` shows only under All.
    expect(items.some((item) => item.kind === "matchStarted" && item.category === "system")).toBe(true);
    expect(items.every((item) => typeof item.round === "number")).toBe(true);
  });

  it("filters to one category, and returns nothing for a category with no entries yet", async () => {
    const { matchId, hostSocket } = await startedMatch();
    const state = (await hostSocket.emitWithAck("match:sync", { matchId })) as { state: { turn: { playerId: string } } };
    await hostSocket.emitWithAck("match:action", {
      matchId,
      seq: 0,
      action: { kind: "ROLL", by: state.state.turn.playerId, atMs: 1 },
    });

    const jail = await request(app.server).get(`/matches/${matchId}/log?filter=jail`).set("Authorization", `Bearer ${host.token}`);
    const all = await request(app.server).get(`/matches/${matchId}/log?filter=all`).set("Authorization", `Bearer ${host.token}`);

    expect(jail.status).toBe(200);
    expect((jail.body.items as unknown[]).every((item) => (item as { category: string }).category === "jail")).toBe(true);
    expect((all.body.items as unknown[]).length).toBeGreaterThan((jail.body.items as unknown[]).length);
  });

  it("pages with a cursor and refuses a cursor that is not a sequence number", async () => {
    const { matchId } = await startedMatch();

    const firstPage = await request(app.server)
      .get(`/matches/${matchId}/log?limit=2`)
      .set("Authorization", `Bearer ${host.token}`);
    const bad = await request(app.server).get(`/matches/${matchId}/log?cursor=abc`).set("Authorization", `Bearer ${host.token}`);

    expect((firstPage.body.items as unknown[]).length).toBe(2);
    expect(typeof firstPage.body.nextCursor).toBe("string");
    expect(bad.status).toBe(422);

    const secondPage = await request(app.server)
      .get(`/matches/${matchId}/log?limit=2&cursor=${firstPage.body.nextCursor}`)
      .set("Authorization", `Bearer ${host.token}`);
    const firstSeqs = (firstPage.body.items as { seq: number }[]).map((item) => item.seq);
    const secondSeqs = (secondPage.body.items as { seq: number }[]).map((item) => item.seq);
    // No overlap between pages, which is the whole point of keyset paging on seq.
    expect(secondSeqs.some((seq) => firstSeqs.includes(seq))).toBe(false);
  });
});

describe("GET /matches/:matchId/result", () => {
  it("refuses a match that has not ended", async () => {
    const { matchId } = await startedMatch();

    const response = await request(app.server).get(`/matches/${matchId}/result`).set("Authorization", `Bearer ${host.token}`);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("E_MATCH_NOT_LIVE");
  });

  it("returns the result 2b renders once the match has ended", async () => {
    const { matchId } = await startedMatch();
    // The engine ends a match on its own conditions, which a two-player test cannot reach quickly, so the
    // row is closed directly — what is under test is the result the route builds, not how it got there.
    await app.pg.query("update matches set ended_at = now(), end_reason = 'cap', end_round = 1 where id = $1", [matchId]);

    const response = await request(app.server).get(`/matches/${matchId}/result`).set("Authorization", `Bearer ${host.token}`);

    expect(response.status).toBe(200);
    const result = response.body as {
      matchId: string;
      endReason: string;
      standings: { place: number; playerId: string; netWorth: number }[];
      stats: { rounds: number; rentPaid: number; tilesSold: number; jailVisits: number };
      netWorthSeries: { playerId: string; points: number[] }[];
      breakdowns: Record<string, { money: Record<string, number> }>;
      winner: { playerId: string } | null;
    };

    expect(result.matchId).toBe(matchId);
    expect(result.endReason).toBe("cap");
    expect(result.standings.map((row) => row.place)).toEqual([1, 2]);
    // Both players start on the board's starting cash, so nobody has paid rent or seen a cell yet.
    expect(result.stats).toEqual({ rounds: 1, rentPaid: 0, tilesSold: 0, jailVisits: 0 });
    expect(result.netWorthSeries.length).toBe(2);
    expect(result.winner?.playerId).toBe(result.standings[0]?.playerId);
    // `2b` §2.2's six money keys, present for every seat even at zero.
    for (const breakdown of Object.values(result.breakdowns)) {
      expect(Object.keys(breakdown.money).sort()).toEqual(
        ["buildSpend", "cardGains", "rentCollected", "rentPaid", "taxAndFines", "tilesBought"].sort(),
      );
    }
  });
});
