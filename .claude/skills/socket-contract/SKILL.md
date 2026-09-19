---
name: socket-contract
description: Keep the client and server in step on every Socket.IO event — payload shapes, ordering, rooms, spectator redaction, resync and error codes. Use for any change to apps/server/src/sockets, apps/mobile match networking, or docs/07-api-contract.md.
---

# Socket contract

## When this applies

Any change that adds, removes or alters a socket event, its payload, who receives it, or when it
fires. Also any client code that reads a socket payload field.

## The contract is the doc

`docs/07-api-contract.md` is the contract. It is a derived doc — it is regenerated from the design,
never patched to match code that drifted. If an event needs to change, the change must be traceable
to the design or to an answered open question, not to convenience.

Adding an event that the contract does not describe is inventing product behaviour. Stop and add
the question to `docs/OPEN-QUESTIONS.md`.

## Procedure

1. Read the contract's section for the event before touching it.
2. Define or update the payload as a **zod schema in `packages/shared`** — one schema, imported by
   both sides. Never two hand-written interfaces that happen to match.
3. Validate on **both** ends: the server parses every inbound client event, the client parses every
   inbound server event. A parse failure is logged with the event name and the failing path, never
   swallowed.
4. Write the ordering test before the implementation (see below).
5. Update `docs/13-error-catalog.md` if the change introduces a refusal reason.

## Direction and authority

| Direction | Naming | Authority |
| --- | --- | --- |
| Client → server | `match:action`, `auction:bid`, `lobby:ready` — imperative | A **request**. The server may refuse it |
| Server → client | `match:state`, `auction:state`, `lobby:state` — nouns | The **truth**. The client replaces its state; it never merges |

The client's optimistic apply is a rendering shortcut. When a server snapshot arrives it wins
wholesale, with no reconciliation logic and no field-level merge.

## Hard rules

- **Snapshots, not patches.** `match:state` carries the full state. There is no partial update
  event, no delta format, no "apply this one field" message.
- **Rooms:** `match:<matchId>` for members, `match:<matchId>:spectators` for spectators,
  `lobby:<matchId>` before start. Never broadcast globally.
- **Redaction is server-side.** A spectator socket must never be sent `hand`, `pendingTrades` or
  `privatePrompts` for any player. Do not filter on the client — the data must not arrive.
- **Decisions are addressed.** A decision card event goes only to the player who must decide, never
  broadcast with a "for you" flag.
- **Deadlines are server-supplied** as `secondsRemaining` (or an absolute server timestamp), never
  computed from a client clock. The client renders; it never extends a timer.
- **Every event carries `eventId` and `matchId`.** `eventId` is monotonic per match and is what
  `match:resync { lastEventId }` uses.
- **Resync is idempotent.** Two resyncs in a row produce the same state. Queued local input is
  discarded on resync.
- **Money on the wire is integer rupees.** Never a formatted string, never a float.
- **Refusals use error-catalog codes**, emitted as an `error` payload `{ code, message, eventId }`
  — never a thrown string, never a silent no-op.

## Ordering guarantees

Socket.IO preserves order per connection, not across reconnects. Therefore:

1. Every client action carries a client-generated `actionId`; the server ignores a duplicate
   `actionId` (at-least-once delivery must be safe).
2. The server emits the resulting snapshot **before** the derived event cards, so a card never
   describes a state the client has not yet received.
3. A reconnecting client must not replay queued actions — it resyncs instead.

## Tests every socket change needs

- [ ] Schema round-trip: encode, decode, deep-equal.
- [ ] Server refuses a malformed payload with the right error code.
- [ ] Client refuses a malformed payload without crashing the match screen.
- [ ] Ordering: snapshot arrives before its event cards.
- [ ] Idempotency: the same `actionId` twice produces one state change.
- [ ] Redaction: a spectator socket receives no hidden field (assert on the raw received payload).
- [ ] Resync: disconnect mid-flow, resync, state matches a client that never disconnected.
- [ ] Reconnect with a stale `lastEventId` still yields a correct full snapshot.

## Checklist before you call a socket change done

- [ ] One shared zod schema, used by both sides.
- [ ] `docs/07-api-contract.md` matches the implementation exactly.
- [ ] New refusals are in `docs/13-error-catalog.md` with user-facing copy.
- [ ] The eight tests above pass.
- [ ] No client-side timer extension, no client-side redaction, no delta payloads.
