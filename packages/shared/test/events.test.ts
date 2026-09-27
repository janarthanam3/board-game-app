// The socket-contract skill's first test: "Schema round-trip: encode, decode, deep-equal." One schema
// serves both sides, so this is where the contract's payload shapes are pinned — docs/07 §Socket.IO.

import { describe, expect, it } from "vitest";

import {
  actionPayloadSchema,
  appliedPayloadSchema,
  CLIENT_EVENTS,
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

  it("match:applied survives JSON, patch operations included", () => {
    const payload = {
      seq: 8,
      events: [{ kind: "diceRolled", dice: [3, 4], doubles: false }],
      statePatch: [
        { op: "replace" as const, path: "/turn/stage", value: "postRoll" },
        { op: "remove" as const, path: "/offers/0" },
      ],
    };

    const decoded = appliedPayloadSchema.parse(JSON.parse(JSON.stringify(payload)));
    expect(decoded).toEqual(payload);
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
