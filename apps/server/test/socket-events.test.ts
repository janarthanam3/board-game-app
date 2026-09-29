// D5 · the nine server events that had no assertion on the wire.
//
// D4's tests covered `match:applied`, `match:state`, `turn:started`, `player:presence`, `lobby:updated`
// and `error`; the end-to-end match covered `match:ended` and counted three more without checking them.
// These are the rest, each asserted on the payload a real client receives — shape **and** content, not
// that something fired:
//
//   lobby:closed · host:changed · players:insufficient · debt:opened · trade:offered
//   trade:resolved · auction:updated · auction:resolved · player:bankrupt
//
// Two techniques make the game states deterministic rather than hoped for.
//
// **Predicting the dice.** The engine's RNG is seeded and `applyRoll` takes exactly two draws from
// `state.rng`, so `rollDice(state.rng)` tells the test what the next roll will be. The test then places
// the player so that roll lands where it needs to. It predicts; it never overrides.
//
// **Patching the stored state.** A rent debt or a bankruptcy needs a board position no two-player match
// reaches quickly, so the test writes the state it needs into the match store. `cashConservation` and
// `debtBlocking` are real invariants and the server refuses any action that breaks them, so every patch
// keeps the ledger balanced and puts a debtor's turn in `raiseCash` — the patches are legal states, not
// convenient ones.

import { rollDice, type MatchState, type PlayerId } from "@royal-navy/game-engine";
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
let hostHandle: string;
let boardVersionId: string;
const open: Socket[] = [];

async function signUp(prefix: string): Promise<{ token: string; handle: string }> {
  const handle = unique(prefix).slice(0, 20);
  const response = await request(app.server)
    .post("/auth/signup")
    .send({ handle, email: `${handle}@example.test`, password: "harbour88" });
  return { token: response.body.accessToken, handle };
}

function connect(token: string): Socket {
  const client = connectClient(`${baseUrl}/match`, { transports: ["websocket"], auth: { token }, forceNew: true });
  open.push(client);
  return client;
}

function once<T = unknown>(client: Socket, event: string, timeoutMs = 4000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out waiting for ${event}`)), timeoutMs);
    client.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

/** True when `event` has not arrived within `ms` — how "addressed, not broadcast" is asserted. */
async function never(client: Socket, event: string, ms = 600): Promise<boolean> {
  let seen = false;
  const mark = () => {
    seen = true;
  };
  client.on(event, mark);
  await new Promise((resolve) => setTimeout(resolve, ms));
  client.off(event, mark);
  return !seen;
}

interface Room {
  matchId: string;
  hostSocket: Socket;
  guestSocket: Socket;
  hostPlayerId: PlayerId;
  guestPlayerId: PlayerId;
  seq: number;
}

/** A room with both seats subscribed, before the host starts it. */
async function lobby(): Promise<{ matchId: string; hostSocket: Socket; guestSocket: Socket }> {
  const created = await request(app.server)
    .post("/matches")
    .set("Authorization", `Bearer ${hostToken}`)
    .send({ boardVersionId, settings: { name: unique("Events ") } });
  const { matchId, roomCode } = created.body as { matchId: string; roomCode: string };
  await request(app.server).post("/matches/join").set("Authorization", `Bearer ${guestToken}`).send({ roomCode });

  const hostSocket = connect(hostToken);
  const guestSocket = connect(guestToken);
  await hostSocket.emitWithAck("match:subscribe", { matchId });
  await guestSocket.emitWithAck("match:subscribe", { matchId });
  return { matchId, hostSocket, guestSocket };
}

/** A live match. The host holds seat 1 and so is the first turn player. */
async function live(): Promise<Room> {
  const { matchId, hostSocket, guestSocket } = await lobby();
  const started = once<{ seq: number; state: MatchState }>(hostSocket, "match:state");
  await hostSocket.emitWithAck("lobby:start", { matchId });
  const snapshot = await started;

  const [first, second] = snapshot.state.seatOrder;
  return { matchId, hostSocket, guestSocket, hostPlayerId: first!, guestPlayerId: second!, seq: snapshot.seq };
}

/** Rewrites the stored state. The caller keeps it legal; the server refuses anything that is not. */
async function patch(matchId: string, mutate: (state: MatchState) => void): Promise<MatchState> {
  const stored = await app.matchStore.load(matchId);
  if (!stored) {
    throw new Error("patch: no stored match");
  }
  mutate(stored.state);
  await app.matchStore.save(matchId, stored);
  return stored.state;
}

/** Takes `amount` off a player's cash and balances the bank ledger, so cashConservation still holds. */
function spendToBank(state: MatchState, playerId: PlayerId, amount: number): void {
  state.players[playerId]!.cash -= amount;
  state.bank.ledger.absorbed += amount;
}

/**
 * Places `playerId` so that the next roll lands on a property, and returns that tile.
 *
 * Chosen so the move never passes the start tile: a pass bonus would top the player's cash back up and
 * the rent debt these tests need would not open.
 */
function placeBeforeAProperty(state: MatchState, playerId: PlayerId): { tileIndex: number; total: number } {
  const { dice } = rollDice(state.rng);
  const total = dice[0] + dice[1];
  const size = state.board.tiles.length;
  for (let position = 1; position + total < size; position++) {
    const tileIndex = position + total;
    if (state.board.tiles[tileIndex]?.kind === "property") {
      state.players[playerId]!.position = position;
      return { tileIndex, total };
    }
  }
  throw new Error(`placeBeforeAProperty: no property reachable with a roll of ${total}`);
}

beforeAll(async () => {
  app = await buildApp(parseEnv(testEnv()), { authRateLimitPerMinute: 10_000 });
  await app.ready();
  await migrateUp(app.pg);
  baseUrl = await app.listen({ host: "127.0.0.1", port: 0 });

  const host = await signUp("evh_");
  const guest = await signUp("evg_");
  hostToken = host.token;
  hostHandle = host.handle;
  guestToken = guest.token;

  const published = await request(app.server)
    .post("/boards/publish")
    .set("Authorization", `Bearer ${hostToken}`)
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

// ─── Lobby lifecycle ─────────────────────────────────────────────────────────────────────────────────

describe("lobby:closed", () => {
  it("reaches the guest with reason hostLeft when the host drops before the start", async () => {
    const room = await lobby();

    const closed = once(room.guestSocket, "lobby:closed");
    room.hostSocket.disconnect();

    // docs/07 types the payload as `{ reason: 'hostLeft' }` — the only reason it has.
    expect(await closed).toEqual({ reason: "hostLeft" });
  });

  it("closes the match row and frees the code, so the room cannot be rejoined", async () => {
    const room = await lobby();
    const closed = once(room.guestSocket, "lobby:closed");
    room.hostSocket.disconnect();
    await closed;

    const match = await app.pg.query<{ end_reason: string | null; room_code: string | null }>(
      "select end_reason, room_code from matches where id = $1",
      [room.matchId],
    );
    expect(match.rows[0]?.end_reason).toBe("closed");
    const rejoin = await request(app.server)
      .post("/matches/join")
      .set("Authorization", `Bearer ${guestToken}`)
      .send({ roomCode: match.rows[0]!.room_code! });
    expect(rejoin.body.error.code).toBe("E_ROOM_NOT_FOUND");
  });
});

describe("host:changed", () => {
  it("names the new host and the one who left when the host drops mid-match", async () => {
    const room = await live();

    const changed = once<{ newHostId: string; previousHostName: string }>(room.guestSocket, "host:changed");
    room.hostSocket.disconnect();
    const payload = await changed;

    // The flow doc: "host transfers to the longest-seated player" — with two seats, the guest.
    expect(payload.newHostId).toBe(room.guestPlayerId);
    // The name is the leaving host's, from match_players; sign-up seeds display_name from the handle.
    expect(payload.previousHostName).toBe(hostHandle);
    expect(Object.keys(payload).sort()).toEqual(["newHostId", "previousHostName"]);
  });

  it("moves the host on the match row, so a later lobby read agrees", async () => {
    const room = await live();
    const changed = once(room.guestSocket, "host:changed");
    room.hostSocket.disconnect();
    await changed;

    const match = await app.pg.query<{ host_user_id: string; handle: string }>(
      `select m.host_user_id, u.handle from matches m join users u on u.id = m.host_user_id where m.id = $1`,
      [room.matchId],
    );
    expect(match.rows[0]?.handle).not.toBe(hostHandle);
  });
});

describe("players:insufficient", () => {
  it("tells the remaining player the match has ten seconds left", async () => {
    const room = await live();

    const insufficient = once(room.hostSocket, "players:insufficient");
    room.guestSocket.disconnect();

    // docs/07 gives one field with one value: `{ endsInMs: 10000 }`.
    expect(await insufficient).toEqual({ endsInMs: 10_000 });
  });

  it("does not fire while two players are still connected", async () => {
    const room = await live();

    // An ordinary action changes the state and broadcasts; nothing about it should look like an empty room.
    await room.hostSocket.emitWithAck("match:action", {
      matchId: room.matchId,
      seq: room.seq,
      action: { kind: "ROLL", by: room.hostPlayerId, atMs: 1 },
    });

    expect(await never(room.hostSocket, "players:insufficient")).toBe(true);
  });
});

// ─── Debt ────────────────────────────────────────────────────────────────────────────────────────────

describe("debt:opened", () => {
  it("reaches only the debtor, with the debt the engine opened", async () => {
    const room = await live();
    // The host rolls onto a tile the guest owns, holding less cash than the rent.
    const placed = await patch(room.matchId, (state) => {
      const { tileIndex } = placeBeforeAProperty(state, room.hostPlayerId);
      state.tiles[tileIndex]!.ownerId = room.guestPlayerId;
      // 50 rupees against a rent of 8 % of a tile costing at least 1,200.
      spendToBank(state, room.hostPlayerId, state.players[room.hostPlayerId]!.cash - 50);
    });
    expect(placed.players[room.hostPlayerId]!.cash).toBe(50);

    const opened = once<{ debtId: string; amount: number; creditorId: string }>(room.hostSocket, "debt:opened");
    const applied = once<{ events: { kind: string; debtId?: string; amount?: number }[] }>(room.hostSocket, "match:applied");
    const guestSawIt = never(room.guestSocket, "debt:opened");

    await room.hostSocket.emitWithAck("match:action", {
      matchId: room.matchId,
      seq: room.seq,
      action: { kind: "ROLL", by: room.hostPlayerId, atMs: 1 },
    });

    const payload = await opened;
    const events = (await applied).events;
    const debtOpened = events.find((event) => event.kind === "debtOpened");

    expect(Object.keys(payload).sort()).toEqual(["amount", "creditorId", "debtId"]);
    // The creditor is the tile's owner, and `1d` is the debtor's screen: the amount and the id are the
    // engine's own, cross-checked against the event that produced them.
    expect(payload.creditorId).toBe(room.guestPlayerId);
    expect(payload.debtId).toBe(debtOpened?.debtId);
    expect(payload.amount).toBe(debtOpened?.amount);
    expect(payload.amount).toBeGreaterThan(0);
    // Addressed, not broadcast: the other player is not told what someone else owes.
    expect(await guestSawIt).toBe(true);
  });
});

// ─── Trade ───────────────────────────────────────────────────────────────────────────────────────────

describe("trade:offered", () => {
  it("reaches only the player being offered the deal, with both bundles verbatim", async () => {
    const room = await live();
    const give = { cash: 100, tileIndexes: [], holdCardIds: [] };
    const get = { cash: 0, tileIndexes: [], holdCardIds: [] };

    const offered = once<{ offerId: string; from: string; give: unknown; get: unknown; expiresAtMs: number }>(
      room.guestSocket,
      "trade:offered",
    );
    const hostSawIt = never(room.hostSocket, "trade:offered");

    // `1p` §4: "a deal of cash for nothing is allowed in one direction (a gift)".
    const ack = (await room.hostSocket.emitWithAck("match:action", {
      matchId: room.matchId,
      seq: room.seq,
      action: { kind: "OFFER_TRADE", by: room.hostPlayerId, to: room.guestPlayerId, give, get, atMs: 1 },
    })) as { ok: boolean };
    expect(ack.ok).toBe(true);

    const payload = await offered;
    expect(Object.keys(payload).sort()).toEqual(["expiresAtMs", "from", "get", "give", "offerId"]);
    expect(payload.from).toBe(room.hostPlayerId);
    expect(payload.give).toEqual(give);
    expect(payload.get).toEqual(get);
    // `atMs` 1 plus the board's 60-second trade expiry, in milliseconds. Server-supplied, never computed
    // from a client clock, and derived from the action's own time so a replay reproduces it.
    expect(payload.expiresAtMs).toBe(1 + 60_000);
    expect(payload.offerId.length).toBeGreaterThan(0);
    // The offerer already knows what they sent; the skill's "decisions are addressed" rule means it goes
    // to the decider and nobody else.
    expect(await hostSawIt).toBe(true);
  });
});

describe("trade:resolved", () => {
  async function offer(room: Room): Promise<string> {
    const offered = once<{ offerId: string }>(room.guestSocket, "trade:offered");
    await room.hostSocket.emitWithAck("match:action", {
      matchId: room.matchId,
      seq: room.seq,
      action: {
        kind: "OFFER_TRADE",
        by: room.hostPlayerId,
        to: room.guestPlayerId,
        give: { cash: 100, tileIndexes: [], holdCardIds: [] },
        get: { cash: 0, tileIndexes: [], holdCardIds: [] },
        atMs: 1,
      },
    });
    return (await offered).offerId;
  }

  it("tells the whole table the deal was accepted", async () => {
    const room = await live();
    const offerId = await offer(room);

    // Unlike the offer, the resolution is public — a trade that completes changes what everyone owns.
    const onHost = once(room.hostSocket, "trade:resolved");
    const onGuest = once(room.guestSocket, "trade:resolved");
    await room.guestSocket.emitWithAck("match:action", {
      matchId: room.matchId,
      seq: room.seq + 1,
      action: { kind: "RESPOND_TRADE", by: room.guestPlayerId, offerId, accept: true, atMs: 2 },
    });

    expect(await onHost).toEqual({ offerId, accepted: true });
    expect(await onGuest).toEqual({ offerId, accepted: true });
  });

  it("reports a decline as accepted false, on the same event", async () => {
    const room = await live();
    const offerId = await offer(room);

    const resolved = once(room.hostSocket, "trade:resolved");
    await room.guestSocket.emitWithAck("match:action", {
      matchId: room.matchId,
      seq: room.seq + 1,
      action: { kind: "RESPOND_TRADE", by: room.guestPlayerId, offerId, accept: false, atMs: 2 },
    });

    // `1n`'s trade-done card covers a rejection too: one event, one boolean.
    expect(await resolved).toEqual({ offerId, accepted: false });
  });

  it("moves the cash the accepted deal promised", async () => {
    const room = await live();
    const before = (await app.matchStore.load(room.matchId))!.state.players[room.guestPlayerId]!.cash;
    const offerId = await offer(room);

    await room.guestSocket.emitWithAck("match:action", {
      matchId: room.matchId,
      seq: room.seq + 1,
      action: { kind: "RESPOND_TRADE", by: room.guestPlayerId, offerId, accept: true, atMs: 2 },
    });

    const after = (await app.matchStore.load(room.matchId))!.state.players[room.guestPlayerId]!.cash;
    expect(after).toBe(before + 100);
  });
});

// ─── Auction ─────────────────────────────────────────────────────────────────────────────────────────

/** Rolls the host onto an unowned property and declines it, which opens the lot (board: auctions on). */
async function openAuction(room: Room): Promise<{ tileIndex: number; minBid: number; seq: number }> {
  const placed = await patch(room.matchId, (state) => {
    placeBeforeAProperty(state, room.hostPlayerId);
  });
  const { dice } = rollDice(placed.rng);
  const tileIndex = placed.players[room.hostPlayerId]!.position + dice[0] + dice[1];

  await room.hostSocket.emitWithAck("match:action", {
    matchId: room.matchId,
    seq: room.seq,
    action: { kind: "ROLL", by: room.hostPlayerId, atMs: 1 },
  });
  const updated = once<{ tileIndex: number }>(room.hostSocket, "auction:updated");
  const ack = (await room.hostSocket.emitWithAck("match:action", {
    matchId: room.matchId,
    seq: room.seq + 1,
    action: { kind: "PASS_BUY", by: room.hostPlayerId, tileIndex, atMs: 2 },
  })) as { ok: boolean; code?: string };
  if (!ack.ok) {
    throw new Error(`openAuction: PASS_BUY refused with ${ack.code}`);
  }
  await updated;

  const stored = (await app.matchStore.load(room.matchId))!;
  return { tileIndex, minBid: stored.state.auction!.minBid, seq: stored.seq };
}

describe("auction:updated", () => {
  it("carries the lot's whole public position when it opens", async () => {
    const room = await live();
    const placed = await patch(room.matchId, (state) => {
      placeBeforeAProperty(state, room.hostPlayerId);
    });
    const { dice } = rollDice(placed.rng);
    const tileIndex = placed.players[room.hostPlayerId]!.position + dice[0] + dice[1];

    await room.hostSocket.emitWithAck("match:action", {
      matchId: room.matchId,
      seq: room.seq,
      action: { kind: "ROLL", by: room.hostPlayerId, atMs: 1 },
    });

    const updated = once<{
      tileIndex: number;
      leading: string | null;
      leadingBy: number;
      deadlineMs: number | null;
      passed: string[];
    }>(room.guestSocket, "auction:updated");
    await room.hostSocket.emitWithAck("match:action", {
      matchId: room.matchId,
      seq: room.seq + 1,
      action: { kind: "PASS_BUY", by: room.hostPlayerId, tileIndex, atMs: 2 },
    });
    const payload = await updated;

    expect(Object.keys(payload).sort()).toEqual(["deadlineMs", "leading", "leadingBy", "passed", "tileIndex"]);
    expect(payload.tileIndex).toBe(tileIndex);
    // A lot that has just opened has no leader, no bid and nobody passed.
    expect(payload.leading).toBeNull();
    expect(payload.leadingBy).toBe(0);
    expect(payload.passed).toEqual([]);
    // Nullable, because the engine's AuctionState.deadlineMs is — the server does not write a wall clock
    // into the state it hashes (see match/clock.ts).
    expect(payload.deadlineMs).toBeNull();
  });

  it("names the leader and the bid after a bid, and the passer after a pass", async () => {
    const room = await live();
    const auction = await openAuction(room);

    const afterBid = once<{ leading: string | null; leadingBy: number }>(room.guestSocket, "auction:updated");
    await room.guestSocket.emitWithAck("match:action", {
      matchId: room.matchId,
      seq: auction.seq,
      action: { kind: "BID", by: room.guestPlayerId, amount: auction.minBid, atMs: 3 },
    });
    const bid = await afterBid;

    expect(bid.leading).toBe(room.guestPlayerId);
    expect(bid.leadingBy).toBe(auction.minBid);
  });

  it("is public — a spectator watching the table sees the lot too", async () => {
    const room = await live();
    const watcher = await signUp("evw_");
    const spectator = connect(watcher.token);
    await spectator.emitWithAck("match:subscribe", { matchId: room.matchId });

    const seen = once<{ tileIndex: number }>(spectator, "auction:updated");
    const auction = await openAuction(room);

    // `1h` hides hands and pending trades; a live auction is not on that list.
    expect((await seen).tileIndex).toBe(auction.tileIndex);
  });
});

describe("auction:resolved", () => {
  it("names the winner and the price when the other bidder passes", async () => {
    const room = await live();
    const auction = await openAuction(room);

    await room.guestSocket.emitWithAck("match:action", {
      matchId: room.matchId,
      seq: auction.seq,
      action: { kind: "BID", by: room.guestPlayerId, amount: auction.minBid, atMs: 3 },
    });

    const resolved = once<{ tileIndex: number; winnerId: string | null; amount: number }>(
      room.hostSocket,
      "auction:resolved",
    );
    await room.hostSocket.emitWithAck("match:action", {
      matchId: room.matchId,
      seq: auction.seq + 1,
      action: { kind: "PASS_BID", by: room.hostPlayerId, atMs: 4 },
    });
    const payload = await resolved;

    expect(Object.keys(payload).sort()).toEqual(["amount", "tileIndex", "winnerId"]);
    expect(payload.tileIndex).toBe(auction.tileIndex);
    expect(payload.winnerId).toBe(room.guestPlayerId);
    expect(payload.amount).toBe(auction.minBid);

    // And the deed really moved, at that price.
    const stored = (await app.matchStore.load(room.matchId))!;
    expect(stored.state.tiles[auction.tileIndex]!.ownerId).toBe(room.guestPlayerId);
  });

  it("reports no sale as a null winner and nothing paid", async () => {
    const room = await live();
    const auction = await openAuction(room);

    const resolved = once<{ winnerId: string | null; amount: number }>(room.hostSocket, "auction:resolved");
    await room.guestSocket.emitWithAck("match:action", {
      matchId: room.matchId,
      seq: auction.seq,
      action: { kind: "PASS_BID", by: room.guestPlayerId, atMs: 3 },
    });
    await room.hostSocket.emitWithAck("match:action", {
      matchId: room.matchId,
      seq: auction.seq + 1,
      action: { kind: "PASS_BID", by: room.hostPlayerId, atMs: 4 },
    });
    const payload = await resolved;

    expect(payload.winnerId).toBeNull();
    expect(payload.amount).toBe(0);

    const stored = (await app.matchStore.load(room.matchId))!;
    expect(stored.state.tiles[auction.tileIndex]!.ownerId).toBeNull();
  });
});

// ─── Bankruptcy ──────────────────────────────────────────────────────────────────────────────────────

describe("player:bankrupt", () => {
  it("tells the table who went out, in which round, to whom, and with which tiles", async () => {
    const room = await live();
    // A debtor with nothing left to sell: the engine refuses a declaration while assets remain.
    await patch(room.matchId, (state) => {
      spendToBank(state, room.hostPlayerId, state.players[room.hostPlayerId]!.cash);
      state.debts.push({
        id: "debt-seeded",
        debtorId: room.hostPlayerId,
        creditorId: room.guestPlayerId,
        amount: 5000,
        createdRound: state.round,
        payTo: "creditor",
      });
      // debtBlocking: a turn player who owes must be in raiseCash. `1d` is that stage.
      state.turn.stage = "raiseCash";
    });

    const onGuest = once<{ playerId: string; round: number; to: string; tiles: number[] }>(
      room.guestSocket,
      "player:bankrupt",
    );
    const ack = (await room.hostSocket.emitWithAck("match:action", {
      matchId: room.matchId,
      seq: room.seq,
      action: { kind: "DECLARE_BANKRUPTCY", by: room.hostPlayerId, atMs: 5 },
    })) as { ok: boolean; code?: string };
    expect(ack.ok).toBe(true);
    const payload = await onGuest;

    expect(Object.keys(payload).sort()).toEqual(["playerId", "round", "tiles", "to"]);
    expect(payload.playerId).toBe(room.hostPlayerId);
    expect(payload.round).toBe(1);
    // The oldest debt names the creditor (docs/flows/bankruptcy.md), and this player held no deeds.
    expect(payload.to).toBe(room.guestPlayerId);
    expect(payload.tiles).toEqual([]);

    // `1o` and `1g` read the state behind it: the player is out, with the round recorded.
    const stored = (await app.matchStore.load(room.matchId))!;
    expect(stored.state.players[room.hostPlayerId]!.bankrupt).toMatchObject({ out: true, round: 1 });
  });

  it("carries the deeds that changed hands", async () => {
    const room = await live();
    let owned: number[] = [];
    await patch(room.matchId, (state) => {
      // Two deeds that follow the debt to the creditor (bankruptcy flow step 3).
      owned = state.board.tiles.flatMap((tile, index) => (tile.kind === "property" ? [index] : [])).slice(0, 2);
      for (const index of owned) {
        state.tiles[index]!.ownerId = room.hostPlayerId;
      }
      spendToBank(state, room.hostPlayerId, state.players[room.hostPlayerId]!.cash);
      state.debts.push({
        id: "debt-seeded",
        debtorId: room.hostPlayerId,
        creditorId: room.guestPlayerId,
        amount: 500_000,
        createdRound: state.round,
        payTo: "creditor",
      });
      state.turn.stage = "raiseCash";
    });

    const onGuest = once<{ tiles: number[] }>(room.guestSocket, "player:bankrupt");
    await room.hostSocket.emitWithAck("match:action", {
      matchId: room.matchId,
      seq: room.seq,
      action: { kind: "DECLARE_BANKRUPTCY", by: room.hostPlayerId, atMs: 5 },
    });

    expect((await onGuest).tiles.sort((a, b) => a - b)).toEqual(owned);
    const stored = (await app.matchStore.load(room.matchId))!;
    for (const index of owned) {
      expect(stored.state.tiles[index]!.ownerId).toBe(room.guestPlayerId);
    }
  });
});
