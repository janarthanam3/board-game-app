---
name: offline-local-mode
description: Keep pass-and-play, solo vs AI and the offline builders working. Use for any change to local match persistence, SQLite, the board builder, or any code path that assumes a socket or a signed-in user.
---

# Offline and local modes

## When this applies

Any change to `packages/game-engine` consumers on the device, local match persistence, the
builders, or any screen that currently assumes a connection. Also whenever you add a network call
to an existing screen.

## What must work with no connection, ever

| Area | Screens | Notes |
| --- | --- | --- |
| Pass and play | `3c3`, `1c`, all action screens, `2b` | Full match, 2–6 seats, one device |
| Solo vs AI | `3c2`, `1c`, all action screens, `2b` | Three tiers, fast mode |
| Board builder | `1w2`, `2a2`, `2a`, `2a5` | Authoring, validation, saving |
| Tiles, decks, rules | `1x`, `1y`, `1z`, `3n` | Including art collections and device uploads |
| Read-only rules | `3l`, `3m` | From the match or board in memory |
| Settings | `3f` | Local preferences only |
| Privacy documents | `3p` | Bundled offline copies |
| Splash → Play offline | `3a` → `3c` | The documented offline entry path |

Only these need a connection: hosting and joining, the catalogue, publishing and unpublishing,
analytics, leaderboard, friends, account and privacy actions, data export.

## Rules

1. **The engine does not know about the network.** `packages/game-engine` is pure and runs
   identically on the server and on the device. A local match is the same engine with a local
   driver instead of a socket.
2. **Local matches never leave the device** unless OQ-9 is answered otherwise. Do not add an upload
   path on assumption.
3. **Local boards never leave the device.** Only published versions are shareable, and local board
   ids are not deep-linkable.
4. **SQLite is the source of truth for local state**: boards, slots, tiles, decks, rules, local
   matches and their logs. Write after every committed action so a kill-and-relaunch resumes
   exactly — pass-and-play resumes *behind the handover cover*, on the correct seat.
5. **Degrade, never blank.** An offline screen shows cached content plus the documented notice
   line; it never shows an empty state or a spinner that never resolves. Each screen's spec §4
   names its exact offline behaviour and copy — use that copy.
6. **Disable with a reason.** A connection-dependent control stays visible at 45% opacity with the
   hint `Needs a connection` (or the screen's own documented wording). Never hide it.
7. **No silent queueing.** Actions that need a server are refused immediately with the error-catalog
   copy, not queued for later — with one exception: the two privacy visibility switches, which
   queue and sync on reconnect, as documented in `3p`.
8. **The reconnect overlay is online-only.** `3k` must never appear in pass-and-play or solo.
9. **No auth assumption.** Local modes work for a signed-in user whose token has expired. A 401 on
   a background call must not interrupt a local match.
10. **Seeded RNG in local mode too.** A local match stores its seed, so it is replayable and
    reproducible in a bug report.

## Before adding any network call to a screen

- [ ] Is this screen in the must-work-offline table above? If yes, the call is decorative — the
      screen must render fully without it.
- [ ] Does the spec's §4 describe an offline state for this screen? Implement that exact copy.
- [ ] Does failure block a local action? It must not.
- [ ] Does the call fire during a local match? It must not touch match state.

## Tests every local-mode change needs

- [ ] Airplane-mode test: the screen renders and its documented offline notice appears.
- [ ] A full pass-and-play match completes with the device offline.
- [ ] A full solo match completes with the device offline.
- [ ] Kill and relaunch mid-match resumes on the correct seat, behind the handover cover for
      pass-and-play.
- [ ] A board is authored, validated and saved offline, then publishes when connectivity returns.
- [ ] An expired token does not interrupt a local match.
- [ ] `3k` never mounts in a local match.
- [ ] Two runs of one seed in solo produce identical matches.

## Checklist

- [ ] No engine code imports a network module.
- [ ] Local writes happen after every committed action.
- [ ] Every disabled online control states why.
- [ ] Offline copy matches the screen spec word for word.
