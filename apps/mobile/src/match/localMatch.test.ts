// The local authority (task E3), against the offline-local-mode skill: a local match is the same
// engine with a local driver instead of a socket, so the turn loop must not be able to tell.

import { type Action, type MatchState } from "@royal-navy/game-engine";

import { clone, midgame, NAVEEN } from "../screens/match/testFixtures";
import { createLocalAuthority, playLocally } from "./localMatch";
import { actionsForIntent, applyApplied, beginAction, confirmAck, startLoop, visibleState } from "./turn";

const AT_MS = 1_000;

function myTurn(): MatchState {
  const state = clone(midgame());
  state.turn = { playerId: NAVEEN, stage: "preRoll", doublesThisTurn: 0, dice: null, deadlineMs: null };
  return state;
}

describe("the local authority", () => {
  it("starts at the seq a fresh match has applied nothing from", () => {
    const authority = createLocalAuthority(myTurn());
    expect(authority.snapshot().seq).toBe(0);
  });

  it("applies an action and answers with the ack and the applied payload the socket would send", () => {
    const authority = createLocalAuthority(myTurn());
    const roll: Action = { kind: "ROLL", by: NAVEEN, atMs: AT_MS };

    const outcome = authority.send(roll, 0);

    expect(outcome.ack).toEqual({ ok: true, seq: 1 });
    expect(outcome.applied?.seq).toBe(1);
    expect(outcome.applied?.action).toBe(roll);
    expect(outcome.applied?.stateHash).toBe(authority.snapshot().stateHash);
    expect(outcome.applied?.events.length).toBeGreaterThan(0);
  });

  it("refuses an action the rules forbid, and changes nothing", () => {
    const authority = createLocalAuthority(midgame()); // Arun's turn, not Naveen's
    const before = authority.snapshot();

    const outcome = authority.send({ kind: "ROLL", by: NAVEEN, atMs: AT_MS }, 0);

    expect(outcome.ack.ok).toBe(false);
    expect(outcome.applied).toBeUndefined();
    expect(authority.snapshot().stateHash).toBe(before.stateHash);
    expect(authority.snapshot().seq).toBe(0);
  });

  it("refuses a stale seq the way the server does", () => {
    const authority = createLocalAuthority(myTurn());
    expect(authority.send({ kind: "ROLL", by: NAVEEN, atMs: AT_MS }, 5).ack).toEqual({
      ok: false,
      code: "E_STALE_SEQ",
    });
  });
});

describe("a local match through the loop — one code path, no connection", () => {
  it("plays a roll end to end: send, ack, re-derive, and the loop agrees with the authority", () => {
    const authority = createLocalAuthority(myTurn());
    let loop = startLoop(authority.snapshot().state, authority.snapshot().seq);

    const sent = beginAction(loop, { kind: "ROLL", by: NAVEEN, atMs: AT_MS });
    expect(sent.send).not.toBeNull();
    // A roll is never predicted, so the board animates and the loop waits (docs/07 §Ordering 3).
    expect(sent.loop.awaitingRandom).toBe(true);

    const outcome = authority.send(sent.send!.action, sent.send!.seq);
    loop = confirmAck(sent.loop, outcome.ack).loop;
    const applied = applyApplied(loop, outcome.applied!);

    expect(applied.needsSync).toBe(false);
    expect(applied.loop.confirmed.seq).toBe(1);
    expect(applied.loop.awaitingRandom).toBe(false);
    // The two agree byte for byte, which is the whole point of sharing the engine build.
    expect(authority.snapshot().stateHash).toBe(
      createLocalAuthority(applied.loop.confirmed.state, 1).snapshot().stateHash,
    );
  });

  it("rolls a prediction back when the local authority refuses it", () => {
    // The loop's own validation normally catches this first, so the refusal is forced the way a
    // server race would cause it: the authority has moved on, the client has not.
    const authority = createLocalAuthority(myTurn());
    const loop = startLoop(authority.snapshot().state, authority.snapshot().seq);
    const sent = beginAction(loop, { kind: "END_TURN", by: NAVEEN, atMs: AT_MS });
    expect(sent.send).toBeNull(); // END_TURN from preRoll is illegal: refused before the wire

    // Now a legal one, refused by the authority because its seq has moved.
    const state = clone(myTurn());
    state.turn.stage = "postRoll";
    state.turn.dice = [2, 5];
    const authority2 = createLocalAuthority(state, 3);
    const loop2 = startLoop(state, 2); // the client is one behind
    const sent2 = beginAction(loop2, { kind: "END_TURN", by: NAVEEN, atMs: AT_MS });
    expect(visibleState(sent2.loop).turn.playerId).not.toBe(NAVEEN); // predicted: the turn passed

    const outcome = authority2.send(sent2.send!.action, sent2.send!.seq);
    const acked = confirmAck(sent2.loop, outcome.ack);

    expect(outcome.ack).toEqual({ ok: false, code: "E_STALE_SEQ" });
    // Rolled back to what it last knew, and silent, because docs/13 gives E_STALE_SEQ no copy.
    expect(visibleState(acked.loop).turn.playerId).toBe(NAVEEN);
    expect(acked.loop.refusal).toBeNull();
  });

  it("plays several turns in a row without drifting from the authority", () => {
    const authority = createLocalAuthority(myTurn());
    let loop = startLoop(authority.snapshot().state, authority.snapshot().seq);

    // Roll, then end the turn, four times over — whatever the dice do, the two states stay equal.
    for (let turn = 0; turn < 4; turn++) {
      for (const intent of ["ROLL", "END_TURN"] as const) {
        const actor = loop.confirmed.state.turn.playerId;
        const action = { kind: intent, by: actor, atMs: AT_MS } as Action;
        const sent = beginAction(loop, action);
        if (sent.send === null) {
          continue; // the stage does not allow it; the next intent will
        }
        const outcome = authority.send(sent.send.action, sent.send.seq);
        loop = confirmAck(sent.loop, outcome.ack).loop;
        if (outcome.applied) {
          const applied = applyApplied(loop, outcome.applied);
          expect(applied.needsSync).toBe(false);
          loop = applied.loop;
        }
      }
    }

    expect(loop.confirmed.seq).toBe(authority.snapshot().seq);
    expect(__hash(loop.confirmed.state)).toBe(authority.snapshot().stateHash);
  });
});

describe("playLocally — a sequence, in order", () => {
  it("plays rollAgain's two actions in order, which neither could do alone", () => {
    // END_TURN is only legal from postRoll, and the ROLL after it only once the turn has come back.
    const state = clone(myTurn());
    state.turn = { playerId: NAVEEN, stage: "postRoll", doublesThisTurn: 1, dice: [4, 4], deadlineMs: null };
    const authority = createLocalAuthority(state);
    const loop = startLoop(authority.snapshot().state, authority.snapshot().seq);

    const after = playLocally(loop, authority, actionsForIntent("rollAgain", state, NAVEEN, AT_MS));

    // Two actions applied, the same player still rolling, and the loop level with the authority.
    expect(after.confirmed.seq).toBe(2);
    expect(after.confirmed.state.turn.playerId).toBe(NAVEEN);
    expect(after.refusal).toBeNull();
    expect(after.confirmed.seq).toBe(authority.snapshot().seq);
  });

  it("stops at the first refusal and sends nothing after it", () => {
    const authority = createLocalAuthority(midgame()); // Arun's turn
    const loop = startLoop(authority.snapshot().state, authority.snapshot().seq);

    const after = playLocally(loop, authority, [
      { kind: "ROLL", by: NAVEEN, atMs: AT_MS },
      { kind: "END_TURN", by: NAVEEN, atMs: AT_MS },
    ]);

    expect(after.refusal).not.toBeNull();
    expect(authority.snapshot().seq).toBe(0);
  });
});

/** The engine's own hash, so the comparison is the one the contract uses. */
function __hash(state: MatchState): string {
  return createLocalAuthority(state).snapshot().stateHash;
}
