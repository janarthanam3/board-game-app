// Match lifecycle (docs/06 "Match lifecycle", docs/flows/match-create-join.md) and its per-seat
// connection child (docs/06 "Reconnect", docs/flows/reconnect.md).

import { describe, expect, it } from "vitest";

import {
  CONNECTION_BLOCKING_KINDS,
  type ConnectionEvent,
  type ConnectionMachineState,
  isConnectionBlocking,
  isLifecycleBlocking,
  LIFECYCLE_BLOCKING_KINDS,
  type LifecycleEvent,
  type LifecycleMachineState,
  MAX_SEATS,
  persistedIn,
  RECONNECT_BACKOFF_SECONDS,
  RECONNECT_GRACE_MS,
  RECONNECT_MAX_ATTEMPTS,
  transitionConnection,
  transitionLifecycle,
  TURN_HOLD_MS,
  whoMayAct,
} from "../../src/machines/lifecycle";
import { describeIllegalPairs, describeResync, next } from "./support";

describe("match lifecycle", () => {
  const S = {
    draft: { kind: "draft" },
    lobby: { kind: "lobby", players: 2 },
    starting: { kind: "starting" },
    live: { kind: "live" },
    ending: { kind: "ending", reason: "roundCap" },
    ended: { kind: "ended" },
    abandoned: { kind: "abandoned" },
    closed: { kind: "closed" },
  } satisfies Record<string, LifecycleMachineState>;

  const E = {
    roomPublished: { kind: "roomPublished" },
    playerJoined: { kind: "playerJoined" },
    playerLeft: { kind: "playerLeft" },
    colourChanged: { kind: "colourChanged" },
    hostStarted: { kind: "hostStarted" },
    hostLeft: { kind: "hostLeft" },
    seeded: { kind: "seeded" },
    turnCycled: { kind: "turnCycled" },
    endConditionMet: { kind: "endConditionMet", reason: "roundCap" },
    allPastGrace: { kind: "allPastGrace" },
    standingsPersisted: { kind: "standingsPersisted" },
  } satisfies Record<string, LifecycleEvent>;

  describe("legal transitions", () => {
    it("draft + roomPublished -> lobby (host alone)", () => {
      expect(next(transitionLifecycle(S.draft, E.roomPublished))).toEqual({ kind: "lobby", players: 1 });
    });
    it("lobby + playerJoined -> lobby", () => {
      expect(next(transitionLifecycle(S.lobby, E.playerJoined))).toEqual({ kind: "lobby", players: 3 });
    });
    it("lobby + playerLeft -> lobby", () => {
      expect(next(transitionLifecycle(S.lobby, E.playerLeft))).toEqual({ kind: "lobby", players: 1 });
    });
    it("lobby + colourChanged -> lobby", () => {
      expect(next(transitionLifecycle(S.lobby, E.colourChanged))).toEqual(S.lobby);
    });
    it("lobby + hostStarted -> starting (≥ 2 players)", () => {
      expect(next(transitionLifecycle(S.lobby, E.hostStarted))).toEqual(S.starting);
    });
    it("lobby + hostLeft -> closed (3r room closed)", () => {
      expect(next(transitionLifecycle(S.lobby, E.hostLeft))).toEqual(S.closed);
    });
    it("starting + seeded -> live (seeds dealt, seat order fixed, round = 1)", () => {
      expect(next(transitionLifecycle(S.starting, E.seeded))).toEqual(S.live);
    });
    it("live + turnCycled -> live", () => {
      expect(next(transitionLifecycle(S.live, E.turnCycled))).toEqual(S.live);
    });
    it("live + endConditionMet(roundCap) -> ending", () => {
      expect(next(transitionLifecycle(S.live, E.endConditionMet))).toEqual(S.ending);
    });
    it("live + endConditionMet(insolvent) -> ending (< 2 solvent players)", () => {
      expect(next(transitionLifecycle(S.live, { kind: "endConditionMet", reason: "insolvent" }))).toEqual({ kind: "ending", reason: "insolvent" });
    });
    it("live + allPastGrace -> abandoned", () => {
      expect(next(transitionLifecycle(S.live, E.allPastGrace))).toEqual(S.abandoned);
    });
    it("ending + standingsPersisted -> ended", () => {
      expect(next(transitionLifecycle(S.ending, E.standingsPersisted))).toEqual(S.ended);
    });
  });

  describe("guards", () => {
    it("lobby + hostStarted is refused with fewer than 2 players", () => {
      expect(transitionLifecycle({ kind: "lobby", players: 1 }, E.hostStarted)).toEqual({ ok: false, reason: expect.stringContaining("2 players") });
    });
    it("lobby + playerJoined is refused when the room is full (E_ROOM_FULL)", () => {
      expect(MAX_SEATS).toBe(6);
      expect(transitionLifecycle({ kind: "lobby", players: 6 }, E.playerJoined)).toEqual({ ok: false, reason: expect.stringContaining("E_ROOM_FULL") });
    });
    it("lobby + playerLeft never drops below the host", () => {
      expect(transitionLifecycle({ kind: "lobby", players: 1 }, E.playerLeft).ok).toBe(false);
    });
  });

  describe("who may act / persisted (docs/06 lifecycle table)", () => {
    it.each([
      [S.draft, "host", "redis"],
      [S.lobby, "hostAndPlayers", "redisAndRoomCode"],
      [S.starting, "nobody", "redis"],
      [S.live, "actorAndBidders", "redisWithLog"],
      [S.ending, "nobody", "redis"],
      [S.ended, "nobody", "postgres"],
      [S.abandoned, "nobody", "postgresAbandoned"],
      [S.closed, "nobody", "none"],
    ] as const)("$kind", (state, actors, store) => {
      expect(whoMayAct(state)).toBe(actors);
      expect(persistedIn(state)).toBe(store);
    });
  });

  describe("blocking states", () => {
    it("starting and ending are server transitions nobody may act in or leave", () => {
      expect(LIFECYCLE_BLOCKING_KINDS).toEqual(["starting", "ending"]);
      expect(isLifecycleBlocking(S.starting)).toBe(true);
      expect(isLifecycleBlocking(S.lobby)).toBe(false);
    });
  });

  describe("exhaustiveness", () => {
    it("an event outside the union reaches the never check and throws", () => {
      const bogus = { kind: "PAUSE" } as unknown as LifecycleEvent;
      expect(() => transitionLifecycle(S.live, bogus)).toThrow(/unhandled machine case/);
    });
  });

  describe("illegal pairs", () => {
    const legal = new Set([
      "draft -> roomPublished",
      "lobby -> playerJoined",
      "lobby -> playerLeft",
      "lobby -> colourChanged",
      "lobby -> hostStarted",
      "lobby -> hostLeft",
      "starting -> seeded",
      "live -> turnCycled",
      "live -> endConditionMet",
      "live -> allPastGrace",
      "ending -> standingsPersisted",
    ]);
    describeIllegalPairs(Object.values(S), Object.values(E), legal, transitionLifecycle);
  });

  describe("resync", () => {
    describeResync(Object.values(S), E.turnCycled, transitionLifecycle);
  });
});

describe("connection (per seat)", () => {
  const S = {
    connected: { kind: "connected" },
    disconnected: { kind: "disconnected", sinceMs: 100_000 },
    reconnecting: { kind: "reconnecting", sinceMs: 100_000, attempt: 1 },
    manual: { kind: "manual", sinceMs: 100_000 },
    graceExpired: { kind: "graceExpired" },
    endedWhileAway: { kind: "endedWhileAway" },
  } satisfies Record<string, ConnectionMachineState>;

  const E = {
    socketClosed: { kind: "socketClosed", atMs: 100_000 },
    attemptStarted: { kind: "attemptStarted" },
    attemptFailed: { kind: "attemptFailed" },
    syncAccepted: { kind: "syncAccepted" },
    retryPressed: { kind: "retryPressed" },
    graceElapsed: { kind: "graceElapsed", atMs: 190_000 },
    lateRejoin: { kind: "lateRejoin" },
    matchEndedMeanwhile: { kind: "matchEndedMeanwhile" },
  } satisfies Record<string, ConnectionEvent>;

  it("carries the documented parameters", () => {
    expect(RECONNECT_BACKOFF_SECONDS).toEqual([1, 2, 4, 8, 16]);
    expect(RECONNECT_MAX_ATTEMPTS).toBe(5);
    expect(RECONNECT_GRACE_MS).toBe(90_000);
    expect(TURN_HOLD_MS).toBe(45_000);
  });

  describe("legal transitions", () => {
    it("connected + socketClosed -> disconnected", () => {
      expect(next(transitionConnection(S.connected, E.socketClosed))).toEqual(S.disconnected);
    });
    it("disconnected + attemptStarted -> reconnecting (attempt 1, backoff 1 s)", () => {
      expect(next(transitionConnection(S.disconnected, E.attemptStarted))).toEqual(S.reconnecting);
    });
    it("reconnecting + attemptFailed -> reconnecting (next attempt, next backoff)", () => {
      expect(next(transitionConnection(S.reconnecting, E.attemptFailed))).toEqual({ ...S.reconnecting, attempt: 2 });
    });
    it("reconnecting + attemptFailed -> manual after the fifth failure", () => {
      expect(next(transitionConnection({ ...S.reconnecting, attempt: 5 }, E.attemptFailed))).toEqual(S.manual);
    });
    it("reconnecting + syncAccepted -> connected (match:sync accepted)", () => {
      expect(next(transitionConnection(S.reconnecting, E.syncAccepted))).toEqual(S.connected);
    });
    it("manual + retryPressed -> reconnecting (backoff resets to 1 s)", () => {
      expect(next(transitionConnection(S.manual, E.retryPressed))).toEqual(S.reconnecting);
    });
    it("disconnected + graceElapsed -> graceExpired (90 s without a socket)", () => {
      expect(next(transitionConnection(S.disconnected, E.graceElapsed))).toEqual(S.graceExpired);
    });
    it("graceExpired + lateRejoin -> connected", () => {
      expect(next(transitionConnection(S.graceExpired, E.lateRejoin))).toEqual(S.connected);
    });
    it("graceExpired + matchEndedMeanwhile -> endedWhileAway (3r)", () => {
      expect(next(transitionConnection(S.graceExpired, E.matchEndedMeanwhile))).toEqual(S.endedWhileAway);
    });
  });

  describe("timers", () => {
    it("disconnected + graceElapsed before 90 s is an explicit no-op with time remaining", () => {
      expect(transitionConnection(S.disconnected, { kind: "graceElapsed", atMs: 189_999 })).toEqual({ ok: false, reason: expect.stringContaining("time remains") });
    });
    it("grace expires at exactly 90 s", () => {
      expect(transitionConnection(S.disconnected, { kind: "graceElapsed", atMs: 190_000 }).ok).toBe(true);
    });
  });

  describe("blocking states (3k blocks every action while the socket is down)", () => {
    it("declares disconnected, reconnecting, manual and graceExpired as blocking", () => {
      expect(CONNECTION_BLOCKING_KINDS).toEqual(["disconnected", "reconnecting", "manual", "graceExpired"]);
      expect(isConnectionBlocking(S.connected)).toBe(false);
      expect(isConnectionBlocking(S.reconnecting)).toBe(true);
      expect(isConnectionBlocking(S.endedWhileAway)).toBe(false);
    });
  });

  describe("exhaustiveness", () => {
    it("an event outside the union reaches the never check and throws", () => {
      const bogus = { kind: "PING" } as unknown as ConnectionEvent;
      expect(() => transitionConnection(S.connected, bogus)).toThrow(/unhandled machine case/);
    });
  });

  describe("illegal pairs", () => {
    const legal = new Set([
      "connected -> socketClosed",
      "disconnected -> attemptStarted",
      "disconnected -> graceElapsed",
      "reconnecting -> attemptFailed",
      "reconnecting -> syncAccepted",
      "manual -> retryPressed",
      "graceExpired -> lateRejoin",
      "graceExpired -> matchEndedMeanwhile",
    ]);
    describeIllegalPairs(Object.values(S), Object.values(E), legal, transitionConnection);
  });

  describe("resync (reconnect.md invariant 5: repeated resyncs produce the same state)", () => {
    describeResync(Object.values(S), E.syncAccepted, transitionConnection);
  });
});
