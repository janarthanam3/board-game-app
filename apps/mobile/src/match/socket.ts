// The socket transport for the turn loop (task E3), against docs/07-api-contract.md §Socket.IO and the
// socket-contract skill.
//
// It carries the loop's actions to the server and the server's answers back, and it does three things
// the skill insists on and nothing more:
//
//   · every inbound payload is parsed with the **shared** schema before a handler sees it, and a
//     payload that fails is logged with the event name and the failing path — never swallowed, never
//     allowed to reach the match screen (`decodeServerEvent` is the same function the server uses in
//     the other direction);
//   · a reconnect **resyncs** rather than replaying anything queued;
//   · nothing is redacted here and no timer is extended here, because neither is the client's to do.
//
// The socket itself is injected as `SocketLike`, so every path below is tested without a network. The
// documented reconnect behaviour — the backoff, the 45 s hold and `3k` — is **H1**'s, not this module's.

import type { Action } from "@royal-navy/game-engine";
import {
  type AppliedPayload,
  decodeServerEvent,
  type StatePayload,
} from "@royal-navy/shared";
import { io } from "socket.io-client";

import type { ActionAck } from "./turn";

/** The part of a Socket.IO client this module uses, so a test can supply its own. */
export interface SocketLike {
  on: (event: string, listener: (...args: unknown[]) => void) => void;
  emit: (event: string, payload: unknown, ack?: (response: unknown) => void) => void;
  disconnect: () => void;
  readonly connected: boolean;
}

/** What the transport hands to the caller. Each one is already parsed against its shared schema. */
export interface MatchSocketHandlers {
  /** `match:applied` — the action to re-derive with, its events, and the hash to check. */
  onApplied: (payload: AppliedPayload) => void;
  /** `match:state` — a full snapshot, which replaces everything. */
  onState: (payload: StatePayload) => void;
  /** An `error` event: docs/13's code and its copy. */
  onError: (payload: { code: string; message: string }) => void;
  /** `turn:started`. The deadline is the server's; the client counts down and never extends it. */
  onTurnStarted?: (payload: { playerId: string; deadlineMs: number | null }) => void;
  /** `player:presence`, for the HUD's player strip and H1's overlays. */
  onPresence?: (payload: { playerId: string; connected: boolean }) => void;
  /** `match:ended`, which sends the player to `2b`. */
  onEnded?: (payload: unknown) => void;
  /** A payload that failed its schema, or an event the contract does not describe. */
  onUndecodable: (report: { event: string; path: string; message: string }) => void;
}

export interface MatchSocket {
  /** `match:subscribe`, whose ack is the first snapshot. */
  subscribe: () => Promise<StateAck>;
  /** `match:action`. The ack is the contract's `{ ok: true, seq }` or `{ ok: false, code }`. */
  send: (action: Action, seq: number) => Promise<ActionAck>;
  /** `match:sync` — what a seq gap, a hash divergence or a reconnect asks for. */
  sync: () => Promise<StateAck>;
  close: () => void;
}

export type StateAck = { ok: true; payload: StatePayload } | { ok: false; code: string };

/** Every ack is given this long before the caller is told the server did not answer. */
export const ACK_TIMEOUT_MS = 10_000;

/**
 * Wires a socket to the handlers and returns the three calls the loop needs.
 *
 * The dispatch table is the contract's server→client list. An event with no entry here is not ignored
 * quietly: it goes to `onUndecodable`, because an event the contract does not describe is either a
 * server that has drifted or a client that is out of date, and both want a log line.
 */
export function openMatchSocket(
  socket: SocketLike,
  matchId: string,
  handlers: MatchSocketHandlers,
): MatchSocket {
  const route = (event: string) => (...args: unknown[]) => {
    const verdict = decodeServerEvent(event, args[0]);
    if (!verdict.ok) {
      handlers.onUndecodable({ event: verdict.event, path: verdict.path, message: verdict.message });
      return;
    }
    switch (event) {
      case "match:applied":
        return handlers.onApplied(verdict.payload as AppliedPayload);
      case "match:state":
        return handlers.onState(verdict.payload as StatePayload);
      case "error":
        return handlers.onError(verdict.payload as { code: string; message: string });
      case "turn:started":
        return handlers.onTurnStarted?.(verdict.payload as { playerId: string; deadlineMs: number | null });
      case "player:presence":
        return handlers.onPresence?.(verdict.payload as { playerId: string; connected: boolean });
      case "match:ended":
        return handlers.onEnded?.(verdict.payload);
    }
  };

  for (const event of ["match:applied", "match:state", "error", "turn:started", "player:presence", "match:ended"]) {
    socket.on(event, route(event));
  }

  // A reconnect takes the server's state whole: docs/07 §Ordering 4, "After reconnect the client always
  // takes the server's full state, discarding local prediction", and the skill's "A reconnecting client
  // must not replay queued actions — it resyncs instead." Nothing queued is resent, here or anywhere.
  socket.on("connect", () => {
    void requestState(socket, "match:sync", matchId).then((ack) => {
      if (ack.ok) {
        handlers.onState(ack.payload);
      }
    });
  });

  return {
    subscribe: () => requestState(socket, "match:subscribe", matchId),
    sync: () => requestState(socket, "match:sync", matchId),
    send: (action, seq) => requestAction(socket, matchId, action, seq),
    close: () => socket.disconnect(),
  };
}

/**
 * Opens the real client: `docs/07` §Socket.IO's namespace and handshake — "Namespace `/match`.
 * Handshake: `auth: { token }`".
 *
 * Websocket only, as the server's own tests connect: React Native has no reason to long-poll, and a
 * polling fallback would hide a connection that is actually broken. The documented reconnect
 * behaviour — the backoff, the 45 s hold, `3k` — is **H1**'s, so this sets none of it and leaves
 * socket.io's defaults in place until H1 states them.
 *
 * The one function here that a unit test cannot cover, because it is the network call itself. The
 * logic it feeds is covered through `SocketLike`.
 */
export function connectMatchSocket(url: string, token: string): SocketLike {
  return io(`${url}/match`, { transports: ["websocket"], auth: { token } }) as unknown as SocketLike;
}

/** Where the server is, from the env Expo inlines (`docs/09`; `EXPO_PUBLIC_*` only). */
export function socketUrlFromEnv(): string | null {
  const url = process.env["EXPO_PUBLIC_SOCKET_URL"];
  return typeof url === "string" && url.length > 0 ? url : null;
}

/** `match:subscribe` and `match:sync` share one ack shape: a snapshot, or a refusal with a code. */
function requestState(socket: SocketLike, event: "match:subscribe" | "match:sync", matchId: string): Promise<StateAck> {
  return ackOf(socket, event, { matchId }, (raw) => {
    if (isRefusal(raw)) {
      return { ok: false, code: raw.code };
    }
    const verdict = decodeServerEvent("match:state", raw);
    // The ack carries the same three fields `match:state` does, so it is validated by that schema
    // rather than a second copy of it.
    return verdict.ok
      ? { ok: true, payload: verdict.payload as StatePayload }
      : { ok: false, code: "E_SCHEMA_MISMATCH" };
  });
}

function requestAction(socket: SocketLike, matchId: string, action: Action, seq: number): Promise<ActionAck> {
  return ackOf(socket, "match:action", { matchId, seq, action }, (raw) => {
    if (isRefusal(raw)) {
      return { ok: false, code: raw.code };
    }
    const accepted = raw as { ok?: unknown; seq?: unknown };
    return accepted.ok === true && typeof accepted.seq === "number"
      ? { ok: true, seq: accepted.seq }
      : { ok: false, code: "E_SCHEMA_MISMATCH" };
  });
}

function isRefusal(raw: unknown): raw is { ok: false; code: string } {
  const candidate = raw as { ok?: unknown; code?: unknown };
  return candidate?.ok === false && typeof candidate.code === "string";
}

/**
 * Emits with an ack, and resolves with a refusal rather than hanging if the server never answers.
 * A dropped ack must not leave a turn stuck behind a spinner for ever.
 */
function ackOf<T>(socket: SocketLike, event: string, payload: unknown, read: (raw: unknown) => T): Promise<T> {
  return new Promise<T>((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        // docs/13's copy for a match the client cannot reach right now.
        resolve(read({ ok: false, code: "E_MATCH_UNAVAILABLE" }));
      }
    }, ACK_TIMEOUT_MS);

    socket.emit(event, payload, (raw: unknown) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve(read(raw));
    });
  });
}
