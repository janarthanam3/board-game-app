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
    await once(client, "connect");

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
//
// The skill: "A spectator socket must never be sent `hand`, `pendingTrades` or `privatePrompts` for any
// player." `1h` §4 says it in the player's words, and §"Acceptance" item 5: "Cards in hand and pending
// trades are never present in the spectator payload."
//
// Asserting that the *key names* are absent is not enough on its own: a payload could carry a hand under
// another name and still pass. So the match is seeded with a hold card and a pending offer that have
// distinctive, unguessable ids, and the assertions are that **those values** are nowhere in what the
// spectator received — the denial, not the shape.
//
// The member case is pinned in the same test, and it is the opposite: a seated player receives every
// other player's hand and every pending offer. That is deliberate and it is not a bug in this layer —
// see the `design-concerns.md` entry "D4: re-deriving makes per-member redaction impossible". It is
// asserted here so that the day someone decides hands should be private between players, this test
// fails and points at the reason.

/** A card id and an offer id no other part of the state could contain by accident. */
const PLANTED_CARD_ID = "planted-card-zzq7";
const PLANTED_OFFER_ID = "planted-offer-zzq7";

/**
 * Deals `holder` a hold card and opens an offer from `holder` to the other seat, by writing the stored
 * state directly.
 *
 * Direct, rather than by playing to a state where the engine deals one: what is under test is the
 * redaction boundary, and a seeded state reaches it in one step with values chosen to be unmistakable.
 */
async function plantSecrets(matchId: string, holder: string): Promise<{ other: string }> {
  const stored = await app.matchStore.load(matchId);
  if (!stored) {
    throw new Error("plantSecrets: no stored match");
  }
  const other = Object.keys(stored.state.players).find((id) => id !== holder)!;

  stored.state.players[holder]!.holdCards.push({
    id: PLANTED_CARD_ID,
    effect: { kind: "jailPass" },
    uses: 1,
    expires: "never",
    tradeable: true,
    grantedRound: 1,
  });
  stored.state.offers.push({
    id: PLANTED_OFFER_ID,
    from: holder,
    to: other,
    give: { cash: 4242, tileIndexes: [1], holdCardIds: [] },
    get: { cash: 0, tileIndexes: [2], holdCardIds: [] },
    createdAtMs: 1,
    expiresAtMs: 99_999_999,
  });
  await app.matchStore.save(matchId, stored);
  return { other };
}

describe("spectator redaction", () => {
  it("denies a spectator another player's hand and a pending offer, by value", async () => {
    const { matchId, hostPlayerId } = await liveMatch();
    await plantSecrets(matchId, hostPlayerId);

    const spectator = connect(watcher.token);
    const ack = (await spectator.emitWithAck("match:subscribe", { matchId })) as StateAck;
    const raw = JSON.stringify(ack.state);

    // The denial, asserted on the raw received payload: the planted card and offer are not in it under
    // any name, at any depth, in any form.
    expect(raw).not.toContain(PLANTED_CARD_ID);
    expect(raw).not.toContain(PLANTED_OFFER_ID);
    // Nor the offer's terms, which `1h` §4 hides alongside the offer itself ("Pending trade offers and
    // their terms").
    expect(raw).not.toContain("4242");

    // And the containers are absent rather than emptied: an empty `holdCards: []` would still be a field
    // the spectator received, and a client could not tell an empty hand from a hidden one.
    expect(raw).not.toContain("holdCards");
    expect(raw).not.toContain("offers");
    expect("offers" in (ack.state as object)).toBe(false);
    for (const player of Object.values(ack.state!.players as Record<string, object>)) {
      expect("holdCards" in player).toBe(false);
    }

    // `1h` §4's "Visible" column still arrives: board, ownership, cash, turn order.
    expect(ack.state).toHaveProperty("turn");
    expect(ack.state).toHaveProperty("tiles");
    for (const player of Object.values(ack.state!.players as Record<string, { cash: unknown }>)) {
      expect(typeof player.cash).toBe("number");
    }
  });

  it("denies a spectator the hand on every later update, not only on subscribe", async () => {
    const { matchId, hostSocket, hostPlayerId } = await liveMatch();
    await plantSecrets(matchId, hostPlayerId);

    const spectator = connect(watcher.token);
    await spectator.emitWithAck("match:subscribe", { matchId });

    const update = once<{ state: unknown }>(spectator, "match:state");
    let appliedToSpectator = 0;
    spectator.on("match:applied", () => {
      appliedToSpectator += 1;
    });
    await hostSocket.emitWithAck("match:action", { matchId, seq: 0, action: { kind: "ROLL", by: hostPlayerId, atMs: 1 } });
    const next = await update;

    const raw = JSON.stringify(next.state);
    expect(raw).not.toContain(PLANTED_CARD_ID);
    expect(raw).not.toContain(PLANTED_OFFER_ID);
    expect(raw).not.toContain("holdCards");
    // A spectator never receives `match:applied`, because its events are what a member replays — and
    // replaying them is exactly how a hand would arrive by the back door.
    expect(appliedToSpectator).toBe(0);
  });

  it("denies a spectator the hand over REST too, not only over the socket", async () => {
    const { matchId, hostPlayerId } = await liveMatch();
    await plantSecrets(matchId, hostPlayerId);

    // `GET /matches/:id` is a second door onto the same state; redaction that only guarded the socket
    // would be no redaction at all.
    const response = await request(app.server).get(`/matches/${matchId}`).set("Authorization", `Bearer ${watcher.token}`);

    expect(response.status).toBe(200);
    expect(JSON.stringify(response.body.state)).not.toContain(PLANTED_CARD_ID);
    expect(JSON.stringify(response.body.state)).not.toContain(PLANTED_OFFER_ID);
  });

  it("gives a seated player every other player's hand and every pending offer — pinned, not endorsed", async () => {
    const { matchId, guestSocket, hostPlayerId } = await liveMatch();
    await plantSecrets(matchId, hostPlayerId);

    // The guest is not the card's owner and is the *recipient* of the offer, not its author.
    const ack = (await guestSocket.emitWithAck("match:sync", { matchId })) as StateAck;
    const raw = JSON.stringify(ack.state);

    // This is what ships. Every member re-derives the same state from the same events, so there is no
    // per-member redaction available without breaking that — design-concerns.md,
    // "D4: re-deriving makes per-member redaction impossible". No document asks for hands to be private
    // between players, and `1p` §4 needs a counterparty's tradeable hold cards visible to build a deal;
    // but nothing says a *third* player should see an offer between two others, which is what the last
    // assertion records.
    expect(raw).toContain(PLANTED_CARD_ID);
    expect(raw).toContain(PLANTED_OFFER_ID);
    expect(raw).toContain("4242");
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
