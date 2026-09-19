---
name: state-machine
description: Implement and change the five explicit state machines — turn, auction, trade, bankruptcy and match lifecycle. Use for any work on match flow control, and whenever you are tempted to add a boolean flag to match state.
---

# State machines

## When this applies

Any change to match flow control in `packages/game-engine` or `apps/mobile/src/match`. Also any
moment you find yourself writing `isAuctionOpen`, `hasRolled`, `waitingForTrade` or similar — that
is a state machine asking to exist.

## The five machines

All five are specified in `docs/06-state-machines.md`. They are explicit, exhaustive and tested per
transition.

| Machine | Owns | Specified in |
| --- | --- | --- |
| Turn | roll → move → resolve landing → optional actions → end turn, including doubles | `docs/06-state-machines.md` + `docs/flows/turn.md` |
| Auction | open → bidding → resolving → next lot → closed | `docs/flows/auction.md` |
| Trade | composing → offered → accepted / rejected / countered / expired | `docs/flows/trade.md` |
| Bankruptcy | debt → raise cash → settled / declared → resolution order → eliminated | `docs/flows/raise-cash.md`, `docs/flows/bankruptcy.md` |
| Match lifecycle | lobby → running → interrupted → ended | `docs/flows/match-create-join.md`, `docs/flows/reconnect.md` |

## Rules

1. **One discriminated union per machine.** State is `{ kind: 'awaitingRoll' } | { kind: 'moving', from, to } | …`, never a bag of booleans. Two booleans encode four states, of which usually only three are legal — the illegal fourth is the bug you will spend a day on.
2. **Transitions are a total function.** `transition(state, event)` handles every `(kind, event)`
   pair, with an exhaustive `switch` and a `never` check on the default. An unexpected event is
   an explicit, logged no-op with a reason — never a silent fall-through.
3. **The machine lives in the engine**, not in a component. React holds no flow state; it renders
   the current `kind`. A `useState` that tracks whose turn it is, or whether an auction is running,
   is a defect.
4. **The server owns the machine.** The client runs the same machine to predict, and is corrected
   by the next snapshot. Where they disagree, the server's state replaces the client's wholesale.
5. **Every transition is logged.** One match-log line per meaningful transition, server-generated.
6. **Timers are transitions, not side effects.** A turn-timer expiry is an event into the machine
   (`turnTimerExpired`), producing the documented default actions in order — never a callback that
   mutates state directly.
7. **Nested machines are explicit.** An auction inside a turn, or raise cash inside a bankruptcy,
   is a child machine whose completion is an event to its parent. Do not flatten them into one
   union with combinatorial kinds.
8. **Blocking states are marked.** `raiseCash`, `handover` and `eliminated` cannot be exited by
   Android back. The machine declares that; the UI reads it rather than hard-coding it.

## Adding or changing a state

Before writing code:

- [ ] Is this state in `docs/06-state-machines.md`? If not, is it implied by the design, or are you
      inventing flow? Inventing → `docs/OPEN-QUESTIONS.md`.
- [ ] What events can arrive in this state, including ones from other players and from a timer?
- [ ] What happens to each of those events if they arrive out of order, or twice?
- [ ] Can a disconnect happen here? What does resync restore to?
- [ ] Is it blocking? Can the player leave the match from it?

## Tests every machine change needs

- [ ] One test per legal transition, named `<from> + <event> -> <to>`.
- [ ] One test per illegal `(state, event)` pair asserting an explicit no-op with a reason.
- [ ] A test that the transition function is exhaustive (the `never` check compiles).
- [ ] Timer-expiry tests for each state that can hold a timer, asserting the documented default
      order.
- [ ] A disconnect-and-resync test from each state, asserting the restored state.
- [ ] A property test: from any reachable state, a random legal event sequence never reaches an
      invalid state and never breaks an engine invariant.

## Never

- Never add a flow boolean to match state.
- Never drive a transition from a React effect.
- Never let a client-side machine advance without server confirmation for anything that changes
  money, ownership or turn order.
- Never handle an unexpected event by ignoring it silently.
