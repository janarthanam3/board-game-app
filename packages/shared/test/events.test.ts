// The socket-contract skill's first test: "Schema round-trip: encode, decode, deep-equal." One schema
// serves both sides, so this is where the contract's payload shapes are pinned — docs/07 §Socket.IO.

import { describe, expect, it } from "vitest";

import {
  actionPayloadSchema,
  appliedPayloadSchema,
  CLIENT_EVENTS,
  decodeClientEvent,
  decodeServerEvent,
  errorPayloadSchema,
  lobbyUpdatedPayloadSchema,
  matchRoom,
  SERVER_EVENTS,
  spectatorRoom,
  SPECTATOR_REDACTED_FIELDS,
  subscribePayloadSchema,
  turnStartedPayloadSchema,
} from "../src/events/match";

const MATCH = "01M3H43VTNPYC3ZWE190AFH4VJ";
const PLAYER = "01M3H43VV7S7G6RE1G1V2KZX1Y";

describe("every event in docs/07 §Socket.IO has a schema", () => {
  it("names the seven client events", () => {
    expect(Object.keys(CLIENT_EVENTS).sort()).toEqual(
      [
        "lobby:kick",
        "lobby:setColour",
        "lobby:start",
        "match:action",
        "match:subscribe",
        "match:sync",
        "presence:ping",
      ].sort(),
    );
  });

  it("names the seventeen server events", () => {
    expect(Object.keys(SERVER_EVENTS).sort()).toEqual(
      [
        "auction:resolved",
        "auction:updated",
        "board:versionChanged",
        "debt:opened",
        "error",
        "host:changed",
        "lobby:closed",
        "lobby:updated",
        "match:applied",
        "match:ended",
        "match:state",
        "player:bankrupt",
        "player:presence",
        "players:insufficient",
        "trade:offered",
        "trade:resolved",
        "turn:started",
      ].sort(),
    );
  });
});

describe("round-trip: encode, decode, deep-equal", () => {
  it("match:action survives JSON", () => {
    const payload = {
      matchId: MATCH,
      seq: 7,
      action: { kind: "ROLL", by: PLAYER, atMs: 1_700_000_000_000 },
    };

    const decoded = actionPayloadSchema.parse(JSON.parse(JSON.stringify(payload)));
    expect(decoded).toEqual(payload);
  });

  it("match:applied carries the action, the events and a state hash, never a patch", () => {
    const payload = {
      seq: 8,
      action: { kind: "ROLL", by: PLAYER, atMs: 1_700_000_000_000 },
      events: [{ kind: "diceRolled", dice: [3, 4], doubles: false }],
      stateHash: "1a2b3c4d",
    };

    const decoded = appliedPayloadSchema.parse(JSON.parse(JSON.stringify(payload)));
    expect(decoded).toEqual(payload);
  });

  it("refuses a match:applied with no action — the field the client re-derives with", () => {
    // OQ-45: the engine reduces actions, not events, so a payload without one cannot be re-derived from
    // and the client would be left holding a state it has no way to advance.
    const verdict = appliedPayloadSchema.safeParse({
      seq: 8,
      events: [{ kind: "diceRolled" }],
      stateHash: "1a2b3c4d",
    });

    expect(verdict.success).toBe(false);
    if (!verdict.success) {
      expect(verdict.error.issues[0]?.path).toEqual(["action"]);
    }
  });

  it("accepts a server action, which no client sent", () => {
    // A disconnect or a timer expiry is applied by the server and re-derived by every client the same
    // way. It carries no `by`, so a schema that required one would refuse a payload the server emits.
    const decoded = appliedPayloadSchema.parse({
      seq: 9,
      action: { kind: "PLAYER_DISCONNECTED", playerId: PLAYER, atMs: 1 },
      events: [{ kind: "playerDisconnected", playerId: PLAYER }],
      stateHash: "1a2b3c4d",
    });

    expect(decoded.action.kind).toBe("PLAYER_DISCONNECTED");
  });

  it("refuses a match:applied that carries a state patch", () => {
    // The client re-derives by applying the action through the same engine build, so a patch has no
    // meaning here and must not be accepted quietly: CLAUDE.md's shared-engine mandate supersedes
    // docs/07's statePatch, and a silently ignored field is how a wire format drifts back.
    const verdict = appliedPayloadSchema.safeParse({
      seq: 8,
      action: { kind: "ROLL", by: PLAYER, atMs: 1 },
      events: [],
      stateHash: "1a2b3c4d",
      statePatch: [{ op: "replace", path: "/turn/stage", value: "postRoll" }],
    });

    expect(verdict.success).toBe(false);
  });

  it("refuses a hash that is not the engine's eight hex digits", () => {
    for (const stateHash of ["", "xyz", "1A2B3C4D", "1a2b3c4", "1a2b3c4d5"]) {
      const payload = { seq: 1, action: { kind: "ROLL", by: PLAYER, atMs: 1 }, events: [], stateHash };
      expect(appliedPayloadSchema.safeParse(payload).success).toBe(false);
    }
  });

  it("lobby:updated survives JSON", () => {
    const payload = {
      players: [
        { playerId: PLAYER, userId: PLAYER, name: "Naveen", colour: "gold", seat: 1, connected: true },
        { playerId: MATCH, userId: null, name: "Bot", colour: "blue", seat: 2, connected: true },
      ],
      hostId: PLAYER,
      board: { boardVersionId: MATCH, name: "Chennai Edition", version: 2 },
      settings: { turnTimerSeconds: 30 },
    };

    expect(lobbyUpdatedPayloadSchema.parse(JSON.parse(JSON.stringify(payload)))).toEqual(payload);
  });

  it("turn:started carries an absolute deadline, not a duration", () => {
    const payload = { playerId: PLAYER, deadlineMs: 1_700_000_030_000 };

    expect(turnStartedPayloadSchema.parse(payload)).toEqual(payload);
  });
});

describe("a malformed payload is refused with the failing path", () => {
  it("refuses match:subscribe with no matchId", () => {
    const verdict = subscribePayloadSchema.safeParse({});

    expect(verdict.success).toBe(false);
    if (!verdict.success) {
      expect(verdict.error.issues[0]?.path).toEqual(["matchId"]);
    }
  });

  it("refuses an unknown key, so a stray field cannot ride along unnoticed", () => {
    const verdict = subscribePayloadSchema.safeParse({ matchId: MATCH, spectate: true });

    expect(verdict.success).toBe(false);
  });

  it("refuses a negative seq", () => {
    expect(actionPayloadSchema.safeParse({ matchId: MATCH, seq: -1, action: { kind: "ROLL" } }).success).toBe(false);
  });

  it("refuses an action with no kind", () => {
    expect(actionPayloadSchema.safeParse({ matchId: MATCH, seq: 0, action: {} }).success).toBe(false);
  });

  it("refuses an error payload with no code", () => {
    expect(errorPayloadSchema.safeParse({ message: "something" }).success).toBe(false);
  });
});

describe("rooms and redaction", () => {
  it("names a room per match and a separate one for spectators", () => {
    expect(matchRoom(MATCH)).toBe(`match:${MATCH}`);
    expect(spectatorRoom(MATCH)).toBe(`match:${MATCH}:spectators`);
    // The two must differ, or a spectator would receive members' payloads.
    expect(matchRoom(MATCH)).not.toBe(spectatorRoom(MATCH));
  });

  it("lists the three fields a spectator must never receive", () => {
    expect([...SPECTATOR_REDACTED_FIELDS]).toEqual(["holdCards", "pendingTrades", "privatePrompts"]);
  });
});

// ─── The client's half of the contract ─────────────────────────────────────────────────────────────
//
// The socket-contract skill's third test: "Client refuses a malformed payload without crashing the match
// screen." Both sides parse through `decodeClientEvent` / `decodeServerEvent`, so this is where that is
// pinned — the server's use of the same function over a real socket is proved in
// apps/server/test/socket-contract.test.ts.

describe("both sides decode through the same function", () => {
  it("returns a payload for a server event the contract describes", () => {
    const payload = { seq: 3, action: { kind: "ROLL", by: PLAYER, atMs: 1 }, events: [], stateHash: "0a1b2c3d" };

    const verdict = decodeServerEvent("match:applied", payload);

    expect(verdict.ok).toBe(true);
    if (verdict.ok) {
      expect(verdict.payload).toEqual(payload);
    }
  });

  it("refuses a malformed server payload with the event and the failing path, and never throws", () => {
    // What a match screen would otherwise crash on: a hash of the wrong shape arriving mid-match.
    const verdict = decodeServerEvent("match:applied", {
      seq: 3,
      action: { kind: "ROLL", by: PLAYER, atMs: 1 },
      events: [],
      stateHash: "nope",
    });

    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.event).toBe("match:applied");
      expect(verdict.path).toBe("stateHash");
      expect(verdict.message.length).toBeGreaterThan(0);
    }
  });

  it("refuses a payload that is not an object at all, with an empty path", () => {
    for (const payload of [null, undefined, 7, "ROLL", []]) {
      const verdict = decodeServerEvent("turn:started", payload);
      expect(verdict.ok).toBe(false);
    }
  });

  it("refuses an event the contract does not describe, rather than trusting it", () => {
    // `hello` was A3's scaffolding and was removed in D4 (OQ-12). It is named here on purpose: if a
    // server ever emits it again, a client is told there is no schema rather than handed a payload.
    const verdict = decodeServerEvent("hello", { namespace: "/match" });

    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.message).toContain("no schema");
    }
  });

  it("uses the client table for client events, so a direction cannot be confused", () => {
    // `match:applied` is a server event: decoding it as a client event must fail, or a server could be
    // fed a payload it never agreed to accept.
    expect(decodeClientEvent("match:applied", { seq: 1, events: [], stateHash: "0a1b2c3d" }).ok).toBe(false);
    expect(decodeClientEvent("match:subscribe", { matchId: MATCH }).ok).toBe(true);
  });
});
