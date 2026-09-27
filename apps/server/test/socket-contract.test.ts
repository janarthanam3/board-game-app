// D4 · the `socket-contract` skill's eight tests, against the real `/match` namespace.
//
// Test 1 (schema round-trip) and the client half of test 3 live in packages/shared/test/events.test.ts,
// where the schemas are. The six that need a running server are here:
//
//   2. the server refuses a malformed payload with the right error code
//   4. ordering: the snapshot arrives before its event cards
//   5. idempotency: the same action twice produces one state change
//   6. redaction: a spectator socket receives no hidden field — asserted on the raw received payload
//   7. resync: disconnect mid-flow, resync, state matches a client that never disconnected
//   8. reconnect with a stale seq still yields a correct full snapshot
//
// Everything runs over a real socket against a real Postgres and Redis, because the point of these tests
// is the wire, not the handlers in isolation.

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
  handle: string;
  token: string;
}

let app: FastifyInstance;
let baseUrl: string;
let host: Account;
let guest: Account;
let watcher: Account;
let boardVersionId: string;

const open: Socket[] = [];

async function signUp(prefix: string): Promise<Account> {
  const handle = unique(prefix).slice(0, 20);
  const response = await request(app.server)
    .post("/auth/signup")
    .send({ handle, email: `${handle}@example.test`, password: "harbour88" });
  if (response.status !== 201 && response.status !== 200) {
    throw new Error(`signup failed: ${response.status} ${JSON.stringify(response.body)}`);
  }
  return { handle, token: response.body.accessToken };
}

function connect(token: string): Socket {
  const client = connectClient(`${baseUrl}/match`, { transports: ["websocket"], auth: { token }, forceNew: true });
  open.push(client);
  return client;
}

/** Resolves on the next `event`, or rejects after `timeoutMs` so a missing emit fails rather than hangs. */
function once<T = unknown>(client: Socket, event: string, timeoutMs = 4000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out waiting for ${event}`)), timeoutMs);
    client.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

/** Records the order events arrive in on one connection — what the ordering test asserts on. */
function recordOrder(client: Socket, events: readonly string[]): string[] {
  const seen: string[] = [];
  for (const event of events) {
    client.on(event, () => seen.push(event));
  }
  return seen;
}

interface StateAck {
  state?: { seq?: number; turn?: { playerId: string }; players?: Record<string, unknown> };
  seq?: number;
  stateHash?: string;
  ok?: false;
  code?: string;
}

/** Creates a room, seats the guest, and returns both sockets subscribed and the match live. */
async function liveMatch(): Promise<{
  matchId: string;
  hostSocket: Socket;
  guestSocket: Socket;
  hostPlayerId: string;
  seq: number;
  stateHash: string;
}> {
  const created = await request(app.server)
    .post("/matches")
    .set("Authorization", `Bearer ${host.token}`)
    .send({ boardVersionId, settings: { name: unique("Friday ") } });
  expect(created.status).toBe(201);
  const { matchId, roomCode } = created.body as { matchId: string; roomCode: string };

  const joined = await request(app.server)
    .post("/matches/join")
    .set("Authorization", `Bearer ${guest.token}`)
    .send({ roomCode });
  expect(joined.status).toBe(200);

  const hostSocket = connect(host.token);
  const guestSocket = connect(guest.token);
  // Pre-start there is no state, so the subscribe ack refuses with E_MATCH_NOT_LIVE and the lobby
  // snapshot arrives as `lobby:updated` instead.
  await hostSocket.emitWithAck("match:subscribe", { matchId });
  await guestSocket.emitWithAck("match:subscribe", { matchId });

  const started = once<{ seq: number; stateHash: string; state: { turn: { playerId: string } } }>(hostSocket, "match:state");
  const ack = (await hostSocket.emitWithAck("lobby:start", { matchId })) as { ok: boolean };
  expect(ack.ok).toBe(true);
  const snapshot = await started;

  return {
    matchId,
    hostSocket,
    guestSocket,
    hostPlayerId: snapshot.state.turn.playerId,
    seq: snapshot.seq,
    stateHash: snapshot.stateHash,
  };
}

beforeAll(async () => {
  app = await buildApp(parseEnv(testEnv()), { authRateLimitPerMinute: 10_000 });
  await app.ready();
  await migrateUp(app.pg);
  baseUrl = await app.listen({ host: "127.0.0.1", port: 0 });

  host = await signUp("sch_");
  guest = await signUp("scg_");
  watcher = await signUp("scw_");

  const published = await request(app.server)
    .post("/boards/publish")
    .set("Authorization", `Bearer ${host.token}`)
    .send(publishBody());
  expect(published.status).toBe(201);
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

// ─── 2 · the server refuses a malformed payload with the right error code ────────────────────────────

describe("the server refuses a malformed payload", () => {
  it("refuses match:subscribe with no matchId", async () => {
    const client = connect(host.token);
    await once(client, "hello");

    // docs/13: a payload that fails its schema is logged as E_SCHEMA_MISMATCH; the user sees
    // E_ACTION_ILLEGAL. The ack carries what the user sees.
    const ack = (await client.emitWithAck("match:subscribe", {})) as { ok: boolean; code: string };

    expect(ack).toEqual({ ok: false, code: "E_ACTION_ILLEGAL" });
  });

  it("refuses match:action with a negative seq and with no action kind", async () => {
    const { matchId, hostSocket } = await liveMatch();

    const negative = (await hostSocket.emitWithAck("match:action", { matchId, seq: -1, action: { kind: "ROLL" } })) as {
      code: string;
    };
    const kindless = (await hostSocket.emitWithAck("match:action", { matchId, seq: 0, action: {} })) as { code: string };

    expect(negative.code).toBe("E_ACTION_ILLEGAL");
    expect(kindless.code).toBe("E_ACTION_ILLEGAL");
  });

  it("refuses a stray field, so a reintroduced statePatch cannot ride along", async () => {
    const { matchId, hostSocket } = await liveMatch();

    const ack = (await hostSocket.emitWithAck("match:sync", { matchId, lastEventId: 4 })) as { ok: boolean; code: string };

    expect(ack).toEqual({ ok: false, code: "E_ACTION_ILLEGAL" });
  });

  it("refuses an action a player sends for someone else with E_FORBIDDEN_ACTOR", async () => {
    const { matchId, guestSocket } = await liveMatch();
    const snapshot = (await guestSocket.emitWithAck("match:sync", { matchId })) as StateAck;
    const turnPlayer = snapshot.state!.turn!.playerId;

    // The guest claims to act for the host, who is the turn player — so this cannot be refused as
    // "not your turn"; only the actor check can catch it.
    const ack = (await guestSocket.emitWithAck("match:action", {
      matchId,
      seq: 0,
      action: { kind: "ROLL", by: turnPlayer, atMs: 1 },
    })) as { code: string };

    expect(ack.code).toBe("E_FORBIDDEN_ACTOR");
  });

  it("refuses an out-of-turn action with E_NOT_YOUR_TURN", async () => {
    const { matchId, guestSocket } = await liveMatch();
    const snapshot = (await guestSocket.emitWithAck("match:sync", { matchId })) as StateAck;
    const guestPlayerId = Object.keys(snapshot.state!.players!).find((id) => id !== snapshot.state!.turn!.playerId)!;

    const ack = (await guestSocket.emitWithAck("match:action", {
      matchId,
      seq: 0,
      action: { kind: "ROLL", by: guestPlayerId, atMs: 1 },
    })) as { code: string };

    expect(ack.code).toBe("E_NOT_YOUR_TURN");
  });
});

// ─── 4 · ordering: the snapshot arrives before its event cards ───────────────────────────────────────

describe("the snapshot arrives before its event cards", () => {
  it("emits match:state before turn:started when the match starts", async () => {
    const created = await request(app.server)
      .post("/matches")
      .set("Authorization", `Bearer ${host.token}`)
      .send({ boardVersionId, settings: { name: unique("Order ") } });
    const { matchId, roomCode } = created.body as { matchId: string; roomCode: string };
    await request(app.server).post("/matches/join").set("Authorization", `Bearer ${guest.token}`).send({ roomCode });

    const hostSocket = connect(host.token);
    await hostSocket.emitWithAck("match:subscribe", { matchId });
    const order = recordOrder(hostSocket, ["match:state", "turn:started"]);

    const arrived = once(hostSocket, "turn:started");
    await hostSocket.emitWithAck("lobby:start", { matchId });
    await arrived;

    expect(order).toEqual(["match:state", "turn:started"]);
  });

  it("emits match:applied before the card an applied action produced", async () => {
    const { hostSocket, guestSocket } = await liveMatch();
    const order = recordOrder(hostSocket, ["match:applied", "player:presence"]);

    // A disconnect is applied through the engine like any other action, so it produces a snapshot and
    // then a card — which is the ordering rule with no dependence on what the dice did.
    const presence = once(hostSocket, "player:presence");
    guestSocket.disconnect();
    await presence;

    expect(order).toEqual(["match:applied", "player:presence"]);
  });
});

// ─── 5 · idempotency: the same action twice produces one state change ────────────────────────────────

describe("idempotency", () => {
  it("applies a redelivered action once and re-acks the original seq", async () => {
    const { matchId, hostSocket, hostPlayerId } = await liveMatch();
    let appliedCount = 0;
    hostSocket.on("match:applied", () => {
      appliedCount += 1;
    });

    const action = { kind: "ROLL", by: hostPlayerId, atMs: 1 };
    const first = (await hostSocket.emitWithAck("match:action", { matchId, seq: 0, action })) as { ok: boolean; seq: number };
    const repeat = (await hostSocket.emitWithAck("match:action", { matchId, seq: 0, action })) as { ok: boolean; seq: number };

    expect(first).toEqual({ ok: true, seq: 1 });
    // The same answer, and no second application: the seq did not move.
    expect(repeat).toEqual({ ok: true, seq: 1 });

    const after = (await hostSocket.emitWithAck("match:sync", { matchId })) as StateAck;
    expect(after.seq).toBe(1);
    expect(appliedCount).toBe(1);
  });
});

// ─── 6 · redaction: a spectator receives no hidden field ─────────────────────────────────────────────

describe("spectator redaction", () => {
  it("sends a spectator a state with no holdCards and no offers, in the ack and on every update", async () => {
    const { matchId, hostSocket, hostPlayerId } = await liveMatch();

    const spectator = connect(watcher.token);
    const ack = (await spectator.emitWithAck("match:subscribe", { matchId })) as StateAck;

    // Asserted on the raw received payload, as the skill requires: the fields are absent, not empty.
    const raw = JSON.stringify(ack.state);
    expect(raw).not.toContain("holdCards");
    expect(raw).not.toContain("offers");
    for (const player of Object.values(ack.state!.players as Record<string, object>)) {
      expect("holdCards" in player).toBe(false);
    }
    // Public information a spectator does need (`1h`: cash, tiles, the turn) is still there.
    expect(ack.state).toHaveProperty("turn");
    expect(ack.state).toHaveProperty("tiles");

    // And on an update: a spectator gets a redacted snapshot, never the events a member replays.
    const update = once<{ state: unknown }>(spectator, "match:state");
    let appliedToSpectator = 0;
    spectator.on("match:applied", () => {
      appliedToSpectator += 1;
    });
    await hostSocket.emitWithAck("match:action", { matchId, seq: 0, action: { kind: "ROLL", by: hostPlayerId, atMs: 1 } });
    const next = await update;

    expect(JSON.stringify(next.state)).not.toContain("holdCards");
    expect(appliedToSpectator).toBe(0);
  });
});

// ─── 7 · resync equivalence ─────────────────────────────────────────────────────────────────────────

describe("resync", () => {
  it("gives a reconnecting client the same state as one that never disconnected", async () => {
    const { matchId, hostSocket, guestSocket, hostPlayerId } = await liveMatch();

    // The guest drops mid-flow and misses what follows.
    guestSocket.disconnect();
    await once(hostSocket, "match:applied");

    await hostSocket.emitWithAck("match:action", { matchId, seq: 1, action: { kind: "ROLL", by: hostPlayerId, atMs: 1 } });

    const rejoined = connect(guest.token);
    const resynced = (await rejoined.emitWithAck("match:subscribe", { matchId })) as StateAck;
    const never = (await hostSocket.emitWithAck("match:sync", { matchId })) as StateAck;

    expect(resynced.stateHash).toBe(never.stateHash);
    expect(resynced.seq).toBe(never.seq);
  });

  it("is idempotent: two syncs in a row give the same state", async () => {
    const { matchId, hostSocket } = await liveMatch();

    const first = (await hostSocket.emitWithAck("match:sync", { matchId })) as StateAck;
    const second = (await hostSocket.emitWithAck("match:sync", { matchId })) as StateAck;

    expect(second.stateHash).toBe(first.stateHash);
    expect(second.seq).toBe(first.seq);
    expect(second.state).toEqual(first.state);
  });
});

// ─── 8 · a stale seq still yields a correct full snapshot ────────────────────────────────────────────

describe("a stale seq", () => {
  it("refuses the action with E_STALE_SEQ and pushes the full state", async () => {
    const { matchId, hostSocket, hostPlayerId, seq } = await liveMatch();

    const pushed = once<StateAck>(hostSocket, "match:state");
    const ack = (await hostSocket.emitWithAck("match:action", {
      matchId,
      // Far ahead of the server, which is the shape a client that replayed its own optimism arrives in.
      seq: seq + 99,
      action: { kind: "ROLL", by: hostPlayerId, atMs: 1 },
    })) as { ok: boolean; code: string };
    const snapshot = await pushed;

    expect(ack).toEqual({ ok: false, code: "E_STALE_SEQ" });
    // The snapshot is the server's, not the client's belief — and it is complete, not a patch.
    expect(snapshot.seq).toBe(seq);
    expect(snapshot.stateHash).toMatch(/^[0-9a-f]{8}$/);
    expect(snapshot.state).toHaveProperty("players");
  });

  it("answers a subscribe from a socket that never had a state with the whole state", async () => {
    const { matchId, hostSocket, hostPlayerId } = await liveMatch();
    await hostSocket.emitWithAck("match:action", { matchId, seq: 0, action: { kind: "ROLL", by: hostPlayerId, atMs: 1 } });

    // A second socket for the same seat: it holds no seq at all, which is the stalest a client can be.
    const late = connect(host.token);
    const ack = (await late.emitWithAck("match:subscribe", { matchId })) as StateAck;

    expect(ack.seq).toBe(1);
    expect(ack.state).toHaveProperty("log");
  });
});
