// The socket transport (task E3), against docs/07 §Socket.IO and the socket-contract skill's
// client-side obligations: parse every inbound payload with the shared schema, refuse a malformed one
// without crashing, resync on reconnect rather than replaying, and never hang on a lost ack.

import { __debug, type Action } from "@royal-navy/game-engine";

import { midgame, NAVEEN } from "../screens/match/testFixtures";
import { ACK_TIMEOUT_MS, type MatchSocketHandlers, openMatchSocket, type SocketLike } from "./socket";

const MATCH_ID = "m-midgame-4p";
const AT_MS = 1_000;
const ROLL: Action = { kind: "ROLL", by: NAVEEN, atMs: AT_MS };

/** A socket that records what was emitted and lets a test answer acks and fire server events. */
function fakeSocket() {
  const listeners = new Map<string, (...args: unknown[]) => void>();
  const sent: { event: string; payload: unknown; ack?: (response: unknown) => void }[] = [];
  let connected = true;

  const socket: SocketLike = {
    on: (event, listener) => {
      listeners.set(event, listener);
    },
    emit: (event, payload, ack) => {
      sent.push({ event, payload, ...(ack ? { ack } : {}) });
    },
    disconnect: () => {
      connected = false;
    },
    get connected() {
      return connected;
    },
  };

  return {
    socket,
    sent,
    /** Answers the ack of the last matching emit. */
    answer: (event: string, response: unknown) => {
      const call = [...sent].reverse().find((entry) => entry.event === event);
      call?.ack?.(response);
    },
    /** Fires a server→client event at the transport. */
    fire: (event: string, payload: unknown) => listeners.get(event)?.(payload),
    isConnected: () => connected,
  };
}

/** Named fields rather than a string-keyed record, so indexing one is typed rather than possibly absent. */
interface Calls {
  applied: unknown[];
  state: unknown[];
  error: unknown[];
  turnStarted: unknown[];
  presence: unknown[];
  ended: unknown[];
  undecodable: { event: string; path: string; message: string }[];
}

function handlers(): MatchSocketHandlers & { calls: Calls } {
  const calls: Calls = {
    applied: [],
    state: [],
    error: [],
    turnStarted: [],
    presence: [],
    ended: [],
    undecodable: [],
  };
  return {
    calls,
    onApplied: (payload) => calls.applied.push(payload),
    onState: (payload) => calls.state.push(payload),
    onError: (payload) => calls.error.push(payload),
    onTurnStarted: (payload) => calls.turnStarted.push(payload),
    onPresence: (payload) => calls.presence.push(payload),
    onEnded: (payload) => calls.ended.push(payload),
    onUndecodable: (report) => calls.undecodable.push(report),
  };
}

function snapshot() {
  const state = midgame();
  return { seq: 4, state, stateHash: __debug.hash(state) };
}

describe("inbound events are parsed with the shared schema first", () => {
  it("hands match:applied to the loop once it parses", () => {
    const fake = fakeSocket();
    const sink = handlers();
    openMatchSocket(fake.socket, MATCH_ID, sink);

    const payload = { seq: 5, action: ROLL, events: [{ kind: "diceRolled" }], stateHash: "abcdef12" };
    fake.fire("match:applied", payload);

    expect(sink.calls.applied).toEqual([payload]);
    expect(sink.calls.undecodable).toEqual([]);
  });

  it("refuses a malformed payload without calling the handler, naming the event and the path", () => {
    const fake = fakeSocket();
    const sink = handlers();
    openMatchSocket(fake.socket, MATCH_ID, sink);

    // `stateHash` must be eight hex digits; this one is not, which is exactly the kind of drift the
    // client has to survive rather than render.
    fake.fire("match:applied", { seq: 5, action: ROLL, events: [], stateHash: "nope" });

    expect(sink.calls.applied).toEqual([]);
    expect(sink.calls.undecodable).toHaveLength(1);
    expect(sink.calls.undecodable[0]).toMatchObject({ event: "match:applied", path: "stateHash" });
  });

  it("refuses a statePatch, so a superseded wire format cannot creep back (OQ-45)", () => {
    const fake = fakeSocket();
    const sink = handlers();
    openMatchSocket(fake.socket, MATCH_ID, sink);

    fake.fire("match:applied", { seq: 5, action: ROLL, events: [], stateHash: "abcdef12", statePatch: [] });

    expect(sink.calls.applied).toEqual([]);
    expect(sink.calls.undecodable).toHaveLength(1);
  });

  it("passes a snapshot, a turn, a presence change and an error to their handlers", () => {
    const fake = fakeSocket();
    const sink = handlers();
    openMatchSocket(fake.socket, MATCH_ID, sink);

    fake.fire("match:state", snapshot());
    fake.fire("turn:started", { playerId: NAVEEN, deadlineMs: null });
    fake.fire("player:presence", { playerId: NAVEEN, connected: false });
    fake.fire("error", { code: "E_NOT_YOUR_TURN", message: "It's not your turn." });

    expect(sink.calls.state).toHaveLength(1);
    expect(sink.calls.turnStarted).toEqual([{ playerId: NAVEEN, deadlineMs: null }]);
    expect(sink.calls.presence).toEqual([{ playerId: NAVEEN, connected: false }]);
    expect(sink.calls.error).toEqual([{ code: "E_NOT_YOUR_TURN", message: "It's not your turn." }]);
  });

  it("treats an event the contract does not describe as undecodable, not as noise to ignore", () => {
    const fake = fakeSocket();
    const sink = handlers();
    openMatchSocket(fake.socket, MATCH_ID, sink);

    // Registered by this module, but given a payload the schema does not know.
    fake.fire("match:state", { seq: 1 });

    expect(sink.calls.state).toEqual([]);
    expect(sink.calls.undecodable).toHaveLength(1);
  });
});

describe("match:subscribe and match:sync", () => {
  it("subscribes for the match and returns the snapshot its ack carries", async () => {
    const fake = fakeSocket();
    const transport = openMatchSocket(fake.socket, MATCH_ID, handlers());

    const pending = transport.subscribe();
    expect(fake.sent[0]).toMatchObject({ event: "match:subscribe", payload: { matchId: MATCH_ID } });
    fake.answer("match:subscribe", snapshot());

    const ack = await pending;
    expect(ack.ok).toBe(true);
    expect(ack.ok && ack.payload.seq).toBe(4);
  });

  it("returns the server's code when a subscribe is refused", async () => {
    const fake = fakeSocket();
    const transport = openMatchSocket(fake.socket, MATCH_ID, handlers());

    const pending = transport.subscribe();
    fake.answer("match:subscribe", { ok: false, code: "E_NOT_IN_MATCH" });

    expect(await pending).toEqual({ ok: false, code: "E_NOT_IN_MATCH" });
  });

  it("refuses an ack that does not match the snapshot schema", async () => {
    const fake = fakeSocket();
    const transport = openMatchSocket(fake.socket, MATCH_ID, handlers());

    const pending = transport.sync();
    fake.answer("match:sync", { seq: 4, state: midgame(), stateHash: "not-a-hash" });

    expect(await pending).toEqual({ ok: false, code: "E_SCHEMA_MISMATCH" });
  });
});

describe("match:action", () => {
  it("sends the action with the client's seq and the match id (docs/07 §Ordering 2)", async () => {
    const fake = fakeSocket();
    const transport = openMatchSocket(fake.socket, MATCH_ID, handlers());

    const pending = transport.send(ROLL, 7);
    expect(fake.sent[0]).toMatchObject({ event: "match:action", payload: { matchId: MATCH_ID, seq: 7, action: ROLL } });
    fake.answer("match:action", { ok: true, seq: 8 });

    expect(await pending).toEqual({ ok: true, seq: 8 });
  });

  it("passes a refusal's code straight through for the loop to roll back on", async () => {
    const fake = fakeSocket();
    const transport = openMatchSocket(fake.socket, MATCH_ID, handlers());

    const pending = transport.send(ROLL, 7);
    fake.answer("match:action", { ok: false, code: "E_NOT_YOUR_TURN" });

    expect(await pending).toEqual({ ok: false, code: "E_NOT_YOUR_TURN" });
  });

  it("does not hang when the ack never arrives", async () => {
    const fake = fakeSocket();
    const transport = openMatchSocket(fake.socket, MATCH_ID, handlers());

    const pending = transport.send(ROLL, 7);
    jest.advanceTimersByTime(ACK_TIMEOUT_MS);

    // A lost ack must not leave the turn behind a spinner for ever.
    expect(await pending).toEqual({ ok: false, code: "E_MATCH_UNAVAILABLE" });
  });

  it("ignores an ack that arrives after the timeout has already answered", async () => {
    const fake = fakeSocket();
    const transport = openMatchSocket(fake.socket, MATCH_ID, handlers());

    const pending = transport.send(ROLL, 7);
    jest.advanceTimersByTime(ACK_TIMEOUT_MS);
    fake.answer("match:action", { ok: true, seq: 8 });

    expect(await pending).toEqual({ ok: false, code: "E_MATCH_UNAVAILABLE" });
  });
});

describe("reconnect resyncs, and never replays", () => {
  it("asks for the full state on connect and hands it to the loop", async () => {
    const fake = fakeSocket();
    const sink = handlers();
    openMatchSocket(fake.socket, MATCH_ID, sink);

    fake.fire("connect", undefined);
    expect(fake.sent.at(-1)).toMatchObject({ event: "match:sync", payload: { matchId: MATCH_ID } });
    fake.answer("match:sync", snapshot());
    await Promise.resolve();
    await Promise.resolve();

    expect(sink.calls.state).toHaveLength(1);
  });

  it("sends no action of its own on connect — nothing queued is replayed", () => {
    const fake = fakeSocket();
    openMatchSocket(fake.socket, MATCH_ID, handlers());

    fake.fire("connect", undefined);

    expect(fake.sent.filter((call) => call.event === "match:action")).toEqual([]);
  });
});

describe("close", () => {
  it("disconnects the socket", () => {
    const fake = fakeSocket();
    const transport = openMatchSocket(fake.socket, MATCH_ID, handlers());

    transport.close();

    expect(fake.isConnected()).toBe(false);
  });
});
