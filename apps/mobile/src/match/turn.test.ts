// The client turn loop (task E3), against docs/flows/turn.md, docs/06 "Turn", docs/07 §Socket.IO's
// "Ordering and reconciliation" and the socket-contract skill.
//
// The loop is pure: a state value and functions over it, so every branch of the flow — including the
// two that only a server can cause, a refusal and a hash divergence — is a unit test rather than
// something that needs a socket.

import { apply, type Action, type MatchState } from "@royal-navy/game-engine";
import { __debug } from "@royal-navy/game-engine";

import { ARUN, clone, debtPending, midgame, NAVEEN } from "../screens/match/testFixtures";
import {
  actionsForIntent,
  applyApplied,
  beginAction,
  confirmAck,
  isPredictable,
  refuse,
  replaceState,
  startLoop,
  visibleState,
} from "./turn";

const AT_MS = 1_000;

/** Arun has the turn in the fixture; this hands it to Naveen, the viewer in these tests. */
function myTurn(): MatchState {
  const state = clone(midgame());
  state.turn = { playerId: NAVEEN, stage: "preRoll", doublesThisTurn: 0, dice: null, deadlineMs: null };
  return state;
}

function hashOf(state: MatchState): string {
  return __debug.hash(state);
}

describe("intents become engine actions (docs/flows/turn.md steps 1–7)", () => {
  it("roll becomes ROLL, by the actor, carrying the time it was sent", () => {
    expect(actionsForIntent("roll", myTurn(), NAVEEN, AT_MS)).toEqual([{ kind: "ROLL", by: NAVEEN, atMs: AT_MS }]);
  });

  it("end turn becomes END_TURN", () => {
    expect(actionsForIntent("endTurn", myTurn(), NAVEEN, AT_MS)).toEqual([
      { kind: "END_TURN", by: NAVEEN, atMs: AT_MS },
    ]);
  });

  it("roll again is END_TURN then ROLL, because that is how the engine grants the extra roll", () => {
    // docs/flows/turn.md step 6, and docs/06's `postRoll → preRoll` guard: the turn ends, the same
    // player comes back to preRoll. One press, two actions, in this order.
    const state = clone(midgame());
    state.turn = { playerId: NAVEEN, stage: "postRoll", doublesThisTurn: 1, dice: [4, 4], deadlineMs: null };
    expect(actionsForIntent("rollAgain", state, NAVEEN, AT_MS)).toEqual([
      { kind: "END_TURN", by: NAVEEN, atMs: AT_MS },
      { kind: "ROLL", by: NAVEEN, atMs: AT_MS },
    ]);
  });

  it("buy becomes BUY for the tile the actor stands on", () => {
    const state = myTurn();
    state.turn.stage = "decision";
    state.players[NAVEEN]!.position = 3;
    state.tiles[3]!.ownerId = null;
    expect(actionsForIntent("buy", state, NAVEEN, AT_MS)).toEqual([
      { kind: "BUY", by: NAVEEN, tileIndex: 3, atMs: AT_MS },
    ]);
  });

  it("auction becomes PASS_BUY, which is what opens the lot", () => {
    const state = myTurn();
    state.turn.stage = "decision";
    state.players[NAVEEN]!.position = 3;
    expect(actionsForIntent("auction", state, NAVEEN, AT_MS)).toEqual([
      { kind: "PASS_BUY", by: NAVEEN, tileIndex: 3, atMs: AT_MS },
    ]);
  });

  it("pay becomes PAY_DEBT for the oldest open debt", () => {
    expect(actionsForIntent("pay", debtPending(), NAVEEN, AT_MS)).toEqual([
      { kind: "PAY_DEBT", by: NAVEEN, debtId: "debt-1", atMs: AT_MS },
    ]);
  });

  it("none sends nothing", () => {
    expect(actionsForIntent("none", myTurn(), NAVEEN, AT_MS)).toEqual([]);
  });

  it("sends nothing for a viewer with no seat", () => {
    expect(actionsForIntent("roll", myTurn(), null, AT_MS)).toEqual([]);
  });
});

describe("what may be predicted (docs/07 §Ordering 3)", () => {
  it("a roll is never predicted — the client renders the animation and waits", () => {
    expect(isPredictable({ kind: "ROLL", by: NAVEEN, atMs: AT_MS })).toBe(false);
  });

  it("a chosen roll is not predicted either: the engine still draws from the seeded RNG", () => {
    expect(isPredictable({ kind: "CHOOSE_DICE", by: NAVEEN, total: 7, atMs: AT_MS })).toBe(false);
  });

  it("everything else is predictable", () => {
    const actions: Action[] = [
      { kind: "BUY", by: NAVEEN, tileIndex: 3, atMs: AT_MS },
      { kind: "END_TURN", by: NAVEEN, atMs: AT_MS },
      { kind: "PAY_DEBT", by: NAVEEN, debtId: "debt-1", atMs: AT_MS },
      { kind: "MORTGAGE", by: NAVEEN, tileIndexes: [1], atMs: AT_MS },
    ];
    for (const action of actions) {
      expect(isPredictable(action)).toBe(true);
    }
  });
});

describe("the optimistic apply", () => {
  it("renders the prediction while the action is in flight", () => {
    const state = myTurn();
    state.turn.stage = "decision";
    state.players[NAVEEN]!.position = 3;
    state.tiles[3]!.ownerId = null;
    const loop = startLoop(state, 7);
    const buy: Action = { kind: "BUY", by: NAVEEN, tileIndex: 3, atMs: AT_MS };

    const next = beginAction(loop, buy);

    // The deed is the viewer's in the visible state, and still nobody's in the confirmed one.
    expect(visibleState(next.loop).tiles[3]?.ownerId).toBe(NAVEEN);
    expect(next.loop.confirmed.state.tiles[3]?.ownerId).toBeNull();
    // And it is sent with the seq the client believes in (docs/07 §Ordering 2).
    expect(next.send).toEqual({ action: buy, seq: 7 });
  });

  it("predicts nothing for a roll, and says it is waiting on one", () => {
    const loop = startLoop(myTurn(), 7);
    const next = beginAction(loop, { kind: "ROLL", by: NAVEEN, atMs: AT_MS });

    expect(next.loop.predicted).toBeNull();
    expect(next.loop.awaitingRandom).toBe(true);
    expect(visibleState(next.loop)).toBe(next.loop.confirmed.state);
  });

  it("refuses to predict an action the engine would reject, and sends nothing", () => {
    // Rolling off-turn: the engine's own validator says no, so there is nothing to render and
    // nothing to ask the server for.
    const loop = startLoop(midgame(), 7); // Arun's turn
    const next = beginAction(loop, { kind: "ROLL", by: NAVEEN, atMs: AT_MS });

    expect(next.send).toBeNull();
    expect(next.loop.refusal?.code).toBe("E_ACTION_ILLEGAL");
    expect(next.loop.predicted).toBeNull();
  });
});

describe("a refusal rolls the prediction back (§11 AC10, docs/flows/turn.md failure branches)", () => {
  it("drops the prediction and keeps the confirmed state, with the code for the toast", () => {
    const state = myTurn();
    state.turn.stage = "decision";
    state.players[NAVEEN]!.position = 3;
    state.tiles[3]!.ownerId = null;
    const sent = beginAction(startLoop(state, 7), { kind: "BUY", by: NAVEEN, tileIndex: 3, atMs: AT_MS });
    expect(visibleState(sent.loop).tiles[3]?.ownerId).toBe(NAVEEN);

    const rolledBack = refuse(sent.loop, "E_TILE_OWNED", "Someone already owns that tile.");

    expect(rolledBack.predicted).toBeNull();
    expect(rolledBack.inFlight).toBeNull();
    expect(visibleState(rolledBack).tiles[3]?.ownerId).toBeNull();
    expect(rolledBack.refusal).toEqual({ code: "E_TILE_OWNED", message: "Someone already owns that tile." });
    // No partial state is kept: the visible state is the confirmed one, object for object.
    expect(visibleState(rolledBack)).toBe(rolledBack.confirmed.state);
  });

  it("clears a stale refusal when the next action goes out", () => {
    const refused = refuse(startLoop(myTurn(), 7), "E_NOT_YOUR_TURN", "It's not your turn.");
    const next = beginAction(refused, { kind: "ROLL", by: NAVEEN, atMs: AT_MS });
    expect(next.loop.refusal).toBeNull();
  });
});

describe("match:applied — the client re-derives (OQ-45)", () => {
  it("applies the action to the confirmed state and takes the new seq", () => {
    const state = myTurn();
    const loop = startLoop(state, 7);
    const action: Action = { kind: "ROLL", by: NAVEEN, atMs: AT_MS };
    const expected = apply(state, action).state;

    const next = applyApplied(loop, { seq: 8, action, events: [], stateHash: hashOf(expected) });

    expect(next.loop.confirmed.seq).toBe(8);
    expect(hashOf(next.loop.confirmed.state)).toBe(hashOf(expected));
    expect(next.needsSync).toBe(false);
    // The prediction and the in-flight action are spent.
    expect(next.loop.predicted).toBeNull();
    expect(next.loop.awaitingRandom).toBe(false);
  });

  it("asks for a sync when the hash does not match, rather than diverging quietly", () => {
    const loop = startLoop(myTurn(), 7);
    const action: Action = { kind: "ROLL", by: NAVEEN, atMs: AT_MS };

    const next = applyApplied(loop, { seq: 8, action, events: [], stateHash: "deadbeef" });

    expect(next.needsSync).toBe(true);
  });

  it("asks for a sync on a seq gap (docs/07 §Ordering 1)", () => {
    const loop = startLoop(myTurn(), 7);
    const action: Action = { kind: "ROLL", by: NAVEEN, atMs: AT_MS };

    const next = applyApplied(loop, { seq: 9, action, events: [], stateHash: "deadbeef" });

    expect(next.needsSync).toBe(true);
    // And it does not guess: the confirmed state is untouched until the sync arrives.
    expect(next.loop.confirmed.seq).toBe(7);
  });

  it("asks for a sync when the action cannot be applied at all", () => {
    // A server action for a state the client cannot reach — the honest answer is to resync.
    const loop = startLoop(midgame(), 7);
    const illegal: Action = { kind: "BUY", by: NAVEEN, tileIndex: 0, atMs: AT_MS };

    const next = applyApplied(loop, { seq: 8, action: illegal, events: [], stateHash: "deadbeef" });

    expect(next.needsSync).toBe(true);
    expect(next.loop.confirmed.seq).toBe(7);
  });

  it("carries the events through for the notification cards, without using them for state", () => {
    const state = myTurn();
    const loop = startLoop(state, 7);
    const action: Action = { kind: "ROLL", by: NAVEEN, atMs: AT_MS };
    const real = apply(state, action);

    const next = applyApplied(loop, { seq: 8, action, events: real.events, stateHash: hashOf(real.state) });

    expect(next.events).toEqual(real.events);
  });
});

describe("match:state — the snapshot wins wholesale", () => {
  it("replaces the state, the seq, the prediction and the in-flight action", () => {
    const sent = beginAction(startLoop(myTurn(), 7), { kind: "ROLL", by: NAVEEN, atMs: AT_MS });
    const server = clone(midgame()); // a different state entirely: Arun's turn

    const next = replaceState(sent.loop, { seq: 12, state: server, stateHash: hashOf(server) });

    expect(next.confirmed.seq).toBe(12);
    expect(next.confirmed.state.turn.playerId).toBe(ARUN);
    expect(next.predicted).toBeNull();
    expect(next.inFlight).toBeNull();
    expect(next.awaitingRandom).toBe(false);
  });

  it("is idempotent: twice in a row is the same state", () => {
    const loop = startLoop(myTurn(), 7);
    const server = clone(midgame());
    const payload = { seq: 12, state: server, stateHash: hashOf(server) };

    const once = replaceState(loop, payload);
    const twice = replaceState(once, payload);

    expect(hashOf(twice.confirmed.state)).toBe(hashOf(once.confirmed.state));
    expect(twice.confirmed.seq).toBe(once.confirmed.seq);
  });

  it("refuses a snapshot whose own hash does not describe it", () => {
    const loop = startLoop(myTurn(), 7);
    const next = replaceState(loop, { seq: 12, state: clone(midgame()), stateHash: "deadbeef" });

    // The snapshot is not trusted, and the loop says so rather than holding a state nobody vouches for.
    expect(next.confirmed.seq).toBe(7);
    expect(next.refusal?.code).toBe("E_STALE_SEQ");
  });
});

describe("the ack (docs/07: { ok: true, seq } or { ok: false, code })", () => {
  it("an accepted action keeps the prediction until match:applied arrives", () => {
    const state = myTurn();
    state.turn.stage = "decision";
    state.players[NAVEEN]!.position = 3;
    state.tiles[3]!.ownerId = null;
    const sent = beginAction(startLoop(state, 7), { kind: "BUY", by: NAVEEN, tileIndex: 3, atMs: AT_MS });

    const acked = confirmAck(sent.loop, { ok: true, seq: 8 });

    expect(acked.loop.predicted).not.toBeNull();
    expect(acked.needsSync).toBe(false);
  });

  it("E_STALE_SEQ asks for nothing: the server has already sent the full state", () => {
    const sent = beginAction(startLoop(myTurn(), 7), { kind: "ROLL", by: NAVEEN, atMs: AT_MS });

    const acked = confirmAck(sent.loop, { ok: false, code: "E_STALE_SEQ" });

    // docs/13: "(silent)" — no toast, and the snapshot the server pushed alongside it does the work.
    expect(acked.loop.refusal).toBeNull();
    expect(acked.loop.predicted).toBeNull();
  });

  it("any other refusal rolls back and keeps the code for the toast", () => {
    const sent = beginAction(startLoop(myTurn(), 7), { kind: "ROLL", by: NAVEEN, atMs: AT_MS });

    const acked = confirmAck(sent.loop, { ok: false, code: "E_NOT_YOUR_TURN" });

    expect(acked.loop.refusal?.code).toBe("E_NOT_YOUR_TURN");
    expect(acked.loop.predicted).toBeNull();
    expect(acked.loop.awaitingRandom).toBe(false);
  });
});

describe("doubles and end turn, end to end through the loop", () => {
  it("a double comes back to the same player at preRoll, and the loop renders it", () => {
    // Driven entirely by the engine: the loop only re-derives what the authority applied.
    let loop = startLoop(myTurn(), 7);
    let seq = 7;
    const roll: Action = { kind: "ROLL", by: NAVEEN, atMs: AT_MS };

    // The server's roll lands a double, so this walks the real engine rather than a contrived state.
    let state = loop.confirmed.state;
    let applied = apply(state, roll);
    while (applied.state.turn.dice?.[0] !== applied.state.turn.dice?.[1]) {
      // Re-seed and try again: the fixture's cursor decides the dice, and any seed will do here.
      state = { ...state, rng: { ...state.rng, cursor: state.rng.cursor + 1 } };
      applied = apply(state, roll);
    }
    loop = startLoop(state, seq);
    seq += 1;
    const afterRoll = applyApplied(loop, { seq, action: roll, events: applied.events, stateHash: hashOf(applied.state) });
    expect(afterRoll.needsSync).toBe(false);

    const rolled = afterRoll.loop.confirmed.state;
    expect(rolled.turn.dice?.[0]).toBe(rolled.turn.dice?.[1]);

    // Ending that turn hands it back to the same player, at preRoll (docs/06's postRoll → preRoll).
    const endTurn: Action = { kind: "END_TURN", by: NAVEEN, atMs: AT_MS };
    if (rolled.turn.stage === "postRoll") {
      const afterEnd = apply(rolled, endTurn);
      expect(afterEnd.state.turn.playerId).toBe(NAVEEN);
      expect(afterEnd.state.turn.stage).toBe("preRoll");
    }
  });

  it("a plain end turn passes the turn on", () => {
    const state = clone(midgame());
    state.turn = { playerId: NAVEEN, stage: "postRoll", doublesThisTurn: 0, dice: [2, 5], deadlineMs: null };
    const loop = startLoop(state, 7);
    const endTurn: Action = { kind: "END_TURN", by: NAVEEN, atMs: AT_MS };
    const expected = apply(state, endTurn);

    const next = applyApplied(loop, { seq: 8, action: endTurn, events: expected.events, stateHash: hashOf(expected.state) });

    expect(next.needsSync).toBe(false);
    expect(next.loop.confirmed.state.turn.playerId).not.toBe(NAVEEN);
  });
});
