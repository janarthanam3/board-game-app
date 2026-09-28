// D5 · the gate's third criterion: "a scripted two-client match runs end to end over the real socket".
//
// Two real Socket.IO clients, a real Postgres and a real Redis, a board published through the real
// publish route, and a match played to its round cap one `match:action` at a time. Nothing is stubbed
// and nothing reaches into the engine to move the match along — every action goes over the wire and is
// accepted or refused by the server, exactly as a device would send it.
//
// What it proves that the D4 tests do not: that the whole phase composes. Publish (D3) produces a
// document that create (D4) can seat players on, that the engine can start, that survives a few hundred
// actions without an invariant break, and that ends with a `match:ended` carrying the result `2b` reads.
//
// It also proves the re-derive contract on live data: the client replays the events from every
// `match:applied` through its own engine build and compares the engine's hash to the server's, on every
// single action. A divergence anywhere fails the test at the action that caused it.

import {
  apply,
  legalActions,
  hash,
  type Action,
  type ActionKind,
  type MatchEvent,
  type MatchState,
  type PlayerId,
} from "@royal-navy/game-engine";
import type { FastifyInstance } from "fastify";
import request from "supertest";
import { io as connectClient, type Socket } from "socket.io-client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { parseEnv } from "../src/config/env.js";
import { migrateUp } from "../src/db/migrate.js";
import { publishBody, unique } from "./fixtures.js";
import { testEnv } from "./helpers.js";

let app: FastifyInstance;
let baseUrl: string;
let hostToken: string;
let guestToken: string;
let boardVersionId: string;
const open: Socket[] = [];

/** Enough for a two-player match to reach the board's round cap of 20; a run that needs more is stuck. */
const MAX_ACTIONS = 1200;

async function signUp(prefix: string): Promise<string> {
  const handle = unique(prefix).slice(0, 20);
  const response = await request(app.server)
    .post("/auth/signup")
    .send({ handle, email: `${handle}@example.test`, password: "harbour88" });
  return response.body.accessToken;
}

function connect(token: string): Socket {
  const client = connectClient(`${baseUrl}/match`, { transports: ["websocket"], auth: { token }, forceNew: true });
  open.push(client);
  return client;
}

/**
 * A concrete action of `kind` for `playerId`, with arguments read from the state.
 *
 * `legalActions` answers in kinds; the arguments are the part a real client fills in from what it is
 * looking at, so this is the smallest stand-in for a player: buy the tile you are standing on, bid one
 * above the leader, settle the oldest debt.
 */
function concrete(state: MatchState, playerId: PlayerId, kind: ActionKind, atMs: number): Action | null {
  const player = state.players[playerId];
  if (!player) {
    return null;
  }
  const by = playerId;
  switch (kind) {
    case "ROLL":
      return { kind, by, atMs };
    case "BUY":
    case "PASS_BUY":
      return { kind, by, tileIndex: player.position, atMs };
    case "BID":
      return state.auction ? { kind, by, amount: Math.max(state.auction.minBid, state.auction.leadingBid + 1), atMs } : null;
    case "PASS_BID":
      return { kind, by, atMs };
    case "PAY_DEBT": {
      const debt = state.debts.find((candidate) => candidate.debtorId === playerId);
      return debt ? { kind, by, debtId: debt.id, atMs } : null;
    }
    case "DECLARE_BANKRUPTCY":
      return { kind, by, atMs };
    case "PAY_BAIL":
      return { kind, by, atMs };
    case "END_TURN":
      return { kind, by, atMs };
    // Raising cash. Without these the driver can stall: a debtor who cannot pay is refused PAY_DEBT, and
    // the engine refuses DECLARE_BANKRUPTCY while they still hold something to sell — so the only legal
    // move is one of these two, and the match seed decides whether that ever comes up.
    case "MORTGAGE": {
      const tileIndex = state.tiles.findIndex(
        (tile, index) => tile.ownerId === by && !tile.mortgaged && tile.houses === 0 && !tile.hotel && index >= 0,
      );
      return tileIndex === -1 ? null : { kind, by, tileIndexes: [tileIndex], atMs };
    }
    case "SELL": {
      const withHotel = state.tiles.findIndex((tile) => tile.ownerId === by && tile.hotel);
      if (withHotel !== -1) {
        return { kind, by, tileIndex: withHotel, what: "hotel", atMs };
      }
      const withHouse = state.tiles.findIndex((tile) => tile.ownerId === by && tile.houses > 0);
      if (withHouse !== -1) {
        return { kind, by, tileIndex: withHouse, what: "house", atMs };
      }
      const owned = state.tiles.findIndex((tile) => tile.ownerId === by && !tile.mortgaged);
      return owned === -1 ? null : { kind, by, tileIndex: owned, what: "property", atMs };
    }
    // Deliberately not driven: the builders and the card screens are Phase E and F work, and a driver
    // that traded or built would be testing its own choices rather than the socket.
    default:
      return null;
  }
}

/**
 * The order the driver tries kinds in. Debts and auctions first, because both block the turn: a match
 * where nobody settles or nobody passes never advances, and the run would hit MAX_ACTIONS instead of the
 * round cap.
 */
const PRIORITY: ActionKind[] = [
  "PAY_DEBT",
  "DECLARE_BANKRUPTCY",
  "PASS_BID",
  "BUY",
  "PASS_BUY",
  "PAY_BAIL",
  "ROLL",
  "END_TURN",
];

/**
 * The raise-cash routes, tried **only while the player owes something** (`1d`).
 *
 * They are not in PRIORITY because mortgaging is legal whenever a player owns an unmortgaged tile, so a
 * driver that preferred it would mortgage the whole board on turn one and the match would be a
 * degenerate one. They matter because the engine refuses `DECLARE_BANKRUPTCY` while a debtor still holds
 * something to sell: without them a debtor who cannot pay from cash has no legal move at all, and whether
 * that comes up is decided by the match seed — which is random per run, so it was intermittent.
 */
const RAISE_CASH: ActionKind[] = ["MORTGAGE", "SELL"];

function kindsFor(state: MatchState, playerId: PlayerId): ActionKind[] {
  const owes = state.debts.some((debt) => debt.debtorId === playerId);
  return owes ? [PRIORITY[0]!, ...RAISE_CASH, ...PRIORITY.slice(1)] : PRIORITY;
}

beforeAll(async () => {
  app = await buildApp(parseEnv(testEnv()), { authRateLimitPerMinute: 10_000 });
  await app.ready();
  await migrateUp(app.pg);
  baseUrl = await app.listen({ host: "127.0.0.1", port: 0 });

  hostToken = await signUp("e2eh_");
  guestToken = await signUp("e2eg_");
  const published = await request(app.server)
    .post("/boards/publish")
    .set("Authorization", `Bearer ${hostToken}`)
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

describe("a scripted two-client match, end to end over the real socket", () => {
  it("is created over REST, started over the socket, played to its cap and ends with a result", async () => {
    // ── create and join, over REST ───────────────────────────────────────────────────────────────
    const created = await request(app.server)
      .post("/matches")
      .set("Authorization", `Bearer ${hostToken}`)
      .send({ boardVersionId, settings: { name: unique("End to end ") } });
    expect(created.status).toBe(201);
    const { matchId, roomCode } = created.body as { matchId: string; roomCode: string };

    const joined = await request(app.server)
      .post("/matches/join")
      .set("Authorization", `Bearer ${guestToken}`)
      .send({ roomCode });
    expect(joined.status).toBe(200);

    // ── subscribe both clients ───────────────────────────────────────────────────────────────────
    const hostSocket = connect(hostToken);
    const guestSocket = connect(guestToken);

    const hostLobby = new Promise((resolve) => hostSocket.once("lobby:updated", resolve));
    await hostSocket.emitWithAck("match:subscribe", { matchId });
    await guestSocket.emitWithAck("match:subscribe", { matchId });
    // The lobby snapshot is what `1b` renders before the host starts.
    expect(await hostLobby).toMatchObject({ players: expect.any(Array) });

    // The guest re-derives, which is the whole point of the contract (OQ-45, answered 28 September
    // 2026): it takes one snapshot, and from then on computes each state itself by applying the action
    // `match:applied` carries through its own engine build, then checks the engine's hash against the
    // server's. Never a patch, never a merge, and the events are used only for cards.
    //
    // This is the test that would have caught the gap OQ-45 records: before the action was carried, there
    // was nothing here to apply.
    let derived: MatchState | null = null;
    let lastAppliedSeq = -1;
    const divergences: string[] = [];
    const malformed: string[] = [];
    const cards: string[] = [];

    guestSocket.on("match:state", (payload: { state: MatchState; seq: number; stateHash: string }) => {
      derived = payload.state;
      lastAppliedSeq = payload.seq;
    });
    guestSocket.on("match:applied", (payload: { seq: number; action: Action; events: MatchEvent[]; stateHash: string }) => {
      if (!payload.action?.kind || !Array.isArray(payload.events) || !/^[0-9a-f]{8}$/.test(payload.stateHash)) {
        malformed.push(`seq ${payload.seq}`);
        return;
      }
      // Monotonic, one at a time: a gap is what makes a client call match:sync (docs/07's rule 1).
      if (lastAppliedSeq !== -1 && payload.seq !== lastAppliedSeq + 1) {
        malformed.push(`gap at ${payload.seq}`);
      }
      lastAppliedSeq = payload.seq;
      if (derived === null) {
        return;
      }
      derived = apply(derived, payload.action).state;
      if (hash(derived) !== payload.stateHash) {
        divergences.push(`seq ${payload.seq} after ${payload.action.kind}`);
      }
    });
    for (const card of ["turn:started", "auction:updated", "auction:resolved", "player:bankrupt"]) {
      guestSocket.on(card, () => cards.push(card));
    }

    // ── start ────────────────────────────────────────────────────────────────────────────────────
    const ended = new Promise<{ result: Record<string, unknown> }>((resolve, reject) => {
      hostSocket.once("match:ended", resolve);
      setTimeout(() => reject(new Error("the match never ended")), 60_000);
    });
    const live = new Promise((resolve) => hostSocket.once("match:state", resolve));
    const startAck = (await hostSocket.emitWithAck("lobby:start", { matchId })) as { ok: boolean };
    expect(startAck.ok).toBe(true);
    await live;

    // ── play ─────────────────────────────────────────────────────────────────────────────────────
    const sockets: Record<string, Socket> = {};
    let actions = 0;
    let finished = false;

    for (let step = 0; step < MAX_ACTIONS && !finished; step++) {
      const stored = await app.matchStore.load(matchId);
      if (!stored || stored.state.phase !== "live") {
        finished = true;
        break;
      }
      const state = stored.state;
      if (Object.keys(sockets).length === 0) {
        // Seat order is the engine's; seat 1 is the host, who created the room.
        sockets[state.seatOrder[0]!] = hostSocket;
        sockets[state.seatOrder[1]!] = guestSocket;
      }

      // Whoever can act, acts. Not "the turn player", because an auction and a debt are both answered by
      // someone whose turn it is not — which is the case docs/07's exemption list exists for.
      let acted = false;
      for (const playerId of state.seatOrder) {
        const legal = new Set(legalActions(state, playerId));
        const kind = kindsFor(state, playerId).find((candidate) => legal.has(candidate));
        if (kind === undefined) {
          continue;
        }
        const action = concrete(state, playerId, kind, Date.now());
        if (action === null) {
          continue;
        }
        const ack = (await sockets[playerId]!.emitWithAck("match:action", {
          matchId,
          seq: stored.seq,
          action,
        })) as { ok: boolean; code?: string };
        if (ack.ok) {
          actions += 1;
          acted = true;
          break;
        }
      }
      if (!acted) {
        // No player has a legal action and the match is still live: that is a stuck match, and saying so
        // is more useful than looping to the cap.
        throw new Error(`no legal action at seq ${stored.seq}, round ${state.round}, stage ${state.turn.stage}`);
      }
    }

    // ── the result ───────────────────────────────────────────────────────────────────────────────
    const { result } = await ended;

    expect(actions).toBeGreaterThan(20);
    expect(result).toMatchObject({
      matchId,
      endReason: expect.any(String),
      standings: expect.any(Array),
      stats: expect.any(Object),
    });
    expect((result.standings as unknown[]).length).toBe(2);
    // `2b`'s winner card: first place is the winner, and both seats are placed.
    expect((result.standings as { place: number }[]).map((row) => row.place)).toEqual([1, 2]);

    // Every `match:applied` of a real match was well formed and arrived in order, with no gap.
    expect(malformed).toEqual([]);
    expect(lastAppliedSeq).toBeGreaterThan(0);
    // The derived events fired too, so the ordering path was exercised rather than skipped.
    expect(cards.length).toBeGreaterThan(0);

    // **The re-derive contract, on live data.** The client computed every state itself from one snapshot
    // plus the actions, and agreed with the server's hash on every single one — a few hundred actions,
    // including the dice, so the seeded RNG agreed across both runs of the engine too.
    expect(divergences).toEqual([]);
    expect(derived).not.toBeNull();

    // And the state it arrived at is the server's, byte for byte.
    const synced = (await guestSocket.emitWithAck("match:sync", { matchId })) as
      | { state: MatchState; seq: number; stateHash: string }
      | { ok: false };
    if ("state" in synced) {
      expect(synced.stateHash).toBe(hash(synced.state));
      expect(synced.seq).toBe(lastAppliedSeq);
      expect(hash(derived!)).toBe(synced.stateHash);
    }

    // ── what the durable record says afterwards ──────────────────────────────────────────────────
    const row = await app.pg.query<{ ended_at: Date | null; end_reason: string | null }>(
      "select ended_at, end_reason from matches where id = $1",
      [matchId],
    );
    expect(row.rows[0]?.ended_at).not.toBeNull();
    expect(row.rows[0]?.end_reason).toBe("cap");

    const log = await request(app.server).get(`/matches/${matchId}/log`).set("Authorization", `Bearer ${hostToken}`);
    expect(log.status).toBe(200);
    expect((log.body.items as unknown[]).length).toBeGreaterThan(0);

    const resultRoute = await request(app.server)
      .get(`/matches/${matchId}/result`)
      .set("Authorization", `Bearer ${hostToken}`);
    expect(resultRoute.status).toBe(200);
    // The same result, whether it arrived on the socket or is read back over REST.
    expect(resultRoute.body.standings).toEqual(result.standings);
  }, 90_000);
});
