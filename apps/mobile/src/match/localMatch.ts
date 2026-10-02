// The local authority: pass-and-play and solo (task E3, the offline-local-mode skill).
//
// Rule 1 of that skill: "The engine does not know about the network. A local match is the same engine
// with a local driver instead of a socket." So this is the server's own answer, computed on the device
// — the same acks and the same `match:applied` shape the socket would have sent, which means the turn
// loop above runs one code path whether or not there is a connection.
//
// What it deliberately does not do: no queueing, no retries and no network of any kind (rule 7, "No
// silent queueing"). A refused action is refused now.

import { type Action, apply, __debug, type MatchEvent, type MatchState, validate } from "@royal-navy/game-engine";

import { applyApplied, beginAction, confirmAck, type ActionAck, type TurnLoop } from "./turn";

/** The authority's answer: the ack the client would have got, and what it would then have received. */
export interface LocalOutcome {
  ack: ActionAck;
  /** The `match:applied` payload, when the action was applied. Absent on a refusal. */
  applied?: { seq: number; action: Action; events: MatchEvent[]; stateHash: string };
}

export interface LocalSnapshot {
  seq: number;
  state: MatchState;
  stateHash: string;
}

export interface LocalAuthority {
  /** What the client believes, for `startLoop` and for a resync. */
  snapshot: () => LocalSnapshot;
  /** Applies an action exactly as the server's handler would, including its refusals. */
  send: (action: Action, seq: number) => LocalOutcome;
}

/**
 * A match whose authority is this device. `seq` starts where the socket's does — 0 for a match that
 * has applied nothing — so a local match and an online one are indistinguishable to the loop.
 */
export function createLocalAuthority(initial: MatchState, startingSeq = 0): LocalAuthority {
  let state = initial;
  let seq = startingSeq;

  return {
    snapshot: () => ({ seq, state, stateHash: __debug.hash(state) }),

    send: (action, clientSeq) => {
      // The server refuses a stale seq and answers with the full state; locally the only way to be
      // stale is a bug in the caller, and the honest answer is the same one.
      if (clientSeq !== seq) {
        return { ack: { ok: false, code: "E_STALE_SEQ" } };
      }
      const verdict = validate(state, action);
      if (!verdict.ok) {
        // docs/13: the player sees E_ACTION_ILLEGAL for every engine refusal; the engine's own code
        // is the detail behind it, which is what the server logs rather than sends.
        return { ack: { ok: false, code: verdict.code } };
      }

      const result = apply(state, action);
      state = result.state;
      seq += 1;
      return {
        ack: { ok: true, seq },
        applied: { seq, action, events: result.events, stateHash: __debug.hash(state) },
      };
    },
  };
}

/**
 * Drives actions through the loop and a local authority, in order, and returns where the loop ends up.
 *
 * Why in order rather than all at once: `rollAgain` is `END_TURN` then `ROLL` (docs/flows/turn.md step
 * 6), and the second is only legal once the first has been applied — which is exactly the sequencing a
 * socket would impose by answering one action before the next is sent.
 *
 * An action the authority refuses stops the sequence: the loop carries the refusal, and nothing after
 * it is sent, because it was composed against a state that no longer holds.
 */
export function playLocally(loop: TurnLoop, authority: LocalAuthority, actions: readonly Action[]): TurnLoop {
  let current = loop;
  for (const action of actions) {
    const sent = beginAction(current, action);
    current = sent.loop;
    if (sent.send === null) {
      return current;
    }
    const outcome = authority.send(sent.send.action, sent.send.seq);
    current = confirmAck(current, outcome.ack).loop;
    if (!outcome.applied) {
      return current;
    }
    const applied = applyApplied(current, outcome.applied);
    current = applied.loop;
    if (applied.needsSync) {
      // Locally there is no sync to ask for: the authority is on this device, so its snapshot is
      // taken directly. This cannot happen without a bug, and silently carrying on would hide it.
      return { ...current, refusal: { code: "E_ENGINE_PANIC", message: "" } };
    }
  }
  return current;
}
