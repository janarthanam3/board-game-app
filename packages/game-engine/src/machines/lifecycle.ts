// Match lifecycle machine — docs/06-state-machines.md "Match lifecycle" and
// docs/flows/match-create-join.md — plus its per-seat child, the connection machine from
// docs/06 "Reconnect" and docs/flows/reconnect.md. The child is here because the parent's
// `live → abandoned` arrow ("every player past reconnect grace") is decided by the children.

import { assertNever, ignore, move, type Transition } from "./core";

// ─── Match lifecycle ────────────────────────────────────────────────────────────

/** Seats per room (rulebook: 2–6 players; `3j` "6 of 6 seats taken."). */
export const MAX_SEATS = 6;

export type EndReason = "roundCap" | "insolvent";

export type LifecycleMachineState =
  | { kind: "draft" }
  | { kind: "lobby"; players: number }
  | { kind: "starting" }
  | { kind: "live" }
  | { kind: "ending"; reason: EndReason }
  | { kind: "ended" }
  | { kind: "abandoned" }
  | { kind: "closed" };

export type LifecycleEvent =
  | { kind: "roomPublished" }
  | { kind: "playerJoined" }
  | { kind: "playerLeft" }
  | { kind: "colourChanged" }
  | { kind: "hostStarted" }
  | { kind: "hostLeft" }
  | { kind: "seeded" }
  | { kind: "turnCycled" }
  | { kind: "endConditionMet"; reason: EndReason }
  | { kind: "allPastGrace" }
  | { kind: "standingsPersisted" };

/** docs/06 lifecycle table, "Who may act" column. */
export type LifecycleActors = "host" | "hostAndPlayers" | "nobody" | "actorAndBidders";

/** docs/06 lifecycle table, "Persisted" column. */
export type LifecycleStore = "redis" | "redisAndRoomCode" | "redisWithLog" | "postgres" | "postgresAbandoned" | "none";

export function whoMayAct(state: LifecycleMachineState): LifecycleActors {
  switch (state.kind) {
    case "draft":
      return "host";
    case "lobby":
      return "hostAndPlayers";
    case "live":
      return "actorAndBidders";
    case "starting":
    case "ending":
    case "ended":
    case "abandoned":
    case "closed":
      return "nobody";
    default:
      return assertNever(state);
  }
}

export function persistedIn(state: LifecycleMachineState): LifecycleStore {
  switch (state.kind) {
    case "draft":
    case "starting":
    case "ending":
      return "redis";
    case "lobby":
      return "redisAndRoomCode";
    case "live":
      return "redisWithLog";
    case "ended":
      return "postgres";
    case "abandoned":
      return "postgresAbandoned";
    case "closed":
      return "none";
    default:
      return assertNever(state);
  }
}

/** Server-only transitions: nobody may act, and no screen can be left until they finish. */
export const LIFECYCLE_BLOCKING_KINDS: readonly LifecycleMachineState["kind"][] = ["starting", "ending"];

export function isLifecycleBlocking(state: LifecycleMachineState): boolean {
  return LIFECYCLE_BLOCKING_KINDS.includes(state.kind);
}

export function transitionLifecycle(state: LifecycleMachineState, event: LifecycleEvent): Transition<LifecycleMachineState> {
  switch (event.kind) {
    case "roomPublished":
      if (state.kind !== "draft") return ignore(state, event);
      // The host is the first seat.
      return move({ kind: "lobby", players: 1 });

    case "playerJoined":
      if (state.kind !== "lobby") return ignore(state, event);
      if (state.players >= MAX_SEATS) return ignore(state, event, "E_ROOM_FULL");
      return move({ kind: "lobby", players: state.players + 1 });

    case "playerLeft":
      if (state.kind !== "lobby") return ignore(state, event);
      // The host leaving is `hostLeft`, not a seat count change.
      if (state.players <= 1) return ignore(state, event, "only the host is seated");
      return move({ kind: "lobby", players: state.players - 1 });

    case "colourChanged":
      if (state.kind !== "lobby") return ignore(state, event);
      return move(state);

    case "hostStarted":
      if (state.kind !== "lobby") return ignore(state, event);
      if (state.players < 2) return ignore(state, event, "needs at least 2 players");
      return move({ kind: "starting" });

    case "hostLeft":
      if (state.kind !== "lobby") return ignore(state, event);
      return move({ kind: "closed" });

    case "seeded":
      if (state.kind !== "starting") return ignore(state, event);
      return move({ kind: "live" });

    case "turnCycled":
      if (state.kind !== "live") return ignore(state, event);
      return move(state);

    case "endConditionMet":
      if (state.kind !== "live") return ignore(state, event);
      return move({ kind: "ending", reason: event.reason });

    case "allPastGrace":
      if (state.kind !== "live") return ignore(state, event);
      return move({ kind: "abandoned" });

    case "standingsPersisted":
      if (state.kind !== "ending") return ignore(state, event);
      return move({ kind: "ended" });

    default:
      return assertNever(event);
  }
}

// ─── Connection (one per seat) ──────────────────────────────────────────────────

/** docs/06 "Reconnect": backoff 1, 2, 4, 8, 16 s; 5 attempts; 90 s grace; 45 s turn hold. */
export const RECONNECT_BACKOFF_SECONDS = [1, 2, 4, 8, 16] as const;
export const RECONNECT_MAX_ATTEMPTS = 5;
export const RECONNECT_GRACE_MS = 90_000;
export const TURN_HOLD_MS = 45_000;

export type ConnectionMachineState =
  | { kind: "connected" }
  | { kind: "disconnected"; sinceMs: number }
  | { kind: "reconnecting"; sinceMs: number; attempt: number }
  | { kind: "manual"; sinceMs: number }
  | { kind: "graceExpired" }
  | { kind: "endedWhileAway" };

export type ConnectionEvent =
  | { kind: "socketClosed"; atMs: number }
  | { kind: "attemptStarted" }
  | { kind: "attemptFailed" }
  | { kind: "syncAccepted" }
  | { kind: "retryPressed" }
  | { kind: "graceElapsed"; atMs: number }
  | { kind: "lateRejoin" }
  | { kind: "matchEndedMeanwhile" };

/** While the socket is down the client shows `3k` and blocks every action. */
export const CONNECTION_BLOCKING_KINDS: readonly ConnectionMachineState["kind"][] = [
  "disconnected",
  "reconnecting",
  "manual",
  "graceExpired",
];

export function isConnectionBlocking(state: ConnectionMachineState): boolean {
  return CONNECTION_BLOCKING_KINDS.includes(state.kind);
}

export function transitionConnection(state: ConnectionMachineState, event: ConnectionEvent): Transition<ConnectionMachineState> {
  switch (event.kind) {
    case "socketClosed":
      if (state.kind !== "connected") return ignore(state, event);
      return move({ kind: "disconnected", sinceMs: event.atMs });

    case "attemptStarted":
      if (state.kind !== "disconnected") return ignore(state, event);
      return move({ kind: "reconnecting", sinceMs: state.sinceMs, attempt: 1 });

    case "attemptFailed":
      if (state.kind !== "reconnecting") return ignore(state, event);
      if (state.attempt >= RECONNECT_MAX_ATTEMPTS) return move({ kind: "manual", sinceMs: state.sinceMs });
      return move({ ...state, attempt: state.attempt + 1 });

    case "syncAccepted":
      if (state.kind !== "reconnecting") return ignore(state, event);
      return move({ kind: "connected" });

    case "retryPressed":
      if (state.kind !== "manual") return ignore(state, event);
      // "Foreground resume / Retry now: attempt immediately, backoff resets to 1 s."
      return move({ kind: "reconnecting", sinceMs: state.sinceMs, attempt: 1 });

    case "graceElapsed":
      if (state.kind !== "disconnected") return ignore(state, event);
      if (event.atMs - state.sinceMs < RECONNECT_GRACE_MS) return ignore(state, event, "time remains");
      return move({ kind: "graceExpired" });

    case "lateRejoin":
      if (state.kind !== "graceExpired") return ignore(state, event);
      return move({ kind: "connected" });

    case "matchEndedMeanwhile":
      if (state.kind !== "graceExpired") return ignore(state, event);
      return move({ kind: "endedWhileAway" });

    default:
      return assertNever(event);
  }
}
