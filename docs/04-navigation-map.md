# 04 · Navigation map

> Generated from `Royal Navy 1080 v2.dc.html` — 49 options / 93 screens (Session 9 export) · 19 September 2026.

expo-router, file-based. One stack per group. Android hardware back is wired to every screen's
documented back behaviour — never left to the default.

## Route table

`Opt` is the design option id; `docs/screens/<opt>-*.md` is the screen's spec.

| Route | Opt | Params | Guard | Back goes to |
| --- | --- | --- | --- | --- |
| `/splash` | 3a | — | — | exits app |
| `/onboarding` | 3b | — | first run only | exits app |
| `/auth` | 1a | `mode=landing\|signin` | unauthenticated only | exits app |
| `/modes` | 3c | — | auth | exits app (root of the app) |
| `/modes/solo` | 3c2 | — | auth | `/modes` |
| `/modes/pass-and-play` | 3c3 | — | auth | `/modes` |
| `/modes/pass-and-play/handover` | 3c3 | `matchId`, `playerId` | local match | blocked (cover) |
| `/profile` | 3e | — | auth | `/modes` |
| `/profile/history` | 3h | — | auth | `/profile` |
| `/profile/leaderboard` | 3d | — | auth | `/profile` |
| `/settings` | 3f | — | auth | `/profile` |
| `/settings/account` | 3o | — | auth | `/settings` |
| `/settings/privacy` | 3p | — | auth | `/settings` |
| `/create` | 1w2 | — | auth | `/modes` |
| `/create/boards` | 2a2 | `filter=all\|pending\|completed` | auth | `/create` |
| `/create/boards/[boardId]` | 2a | `boardId`, `zoom?` | owner | `/create/boards` |
| `/create/boards/[boardId]/settings` | 2a | `boardId` | owner | builder |
| `/create/boards/[boardId]/rules` | 2a | `boardId` | owner | board settings |
| `/create/boards/[boardId]/slot/[slotIndex]` | 2a | `boardId`, `slotIndex` | owner | builder |
| `/create/boards/[boardId]/size` | 2a5 | `boardId` | owner | board settings |
| `/create/boards/[boardId]/analytics` | 3u | `boardId` | owner + published | builder |
| `/create/tiles` | 1x, 3n | `boardId?` | auth | `/create` |
| `/create/tiles/[tileId]` | 1x | `tileId` or `new` | owner | tiles list |
| `/create/tiles/[tileId]/art` | 1x | `tileId` | owner | tile editor |
| `/create/decks` | 1y, 3n | — | auth | `/create` |
| `/create/decks/[deckId]` | 1y | `deckId` or `new` | owner | decks list |
| `/create/rules` | 1z, 3n | — | auth | `/create` |
| `/create/rules/[ruleId]` | 1z | `ruleId` or `new` | owner | rules list |
| `/catalogue` | 1e | `q?`, `sort?` | auth | caller (`/create` or `/host`) |
| `/catalogue/[boardVersionId]` | 1f | `boardVersionId` | auth | `/catalogue` |
| `/catalogue/[boardVersionId]/rules` | 1f | `boardVersionId` | auth | board detail |
| `/host` | 1b | `boardVersionId?` | auth | `/modes` |
| `/lobby/[matchId]` | 1b | `matchId` | member | leave-match dialog |
| `/lobby/[matchId]/rules` | 3l | `matchId` | member | lobby |
| `/lobby/[matchId]/friends` | 3g | `matchId` | member | lobby |
| `/match/[matchId]` | 1c | `matchId` | member | pause sheet |
| `/match/[matchId]/actions` | 1v | `matchId` | actor's turn | match (sheet) |
| `/match/[matchId]/trade` | 1p | `matchId`, `withPlayerId?` | actor's turn | actions sheet |
| `/match/[matchId]/mortgage` | 1q | `matchId` | actor's turn | actions sheet |
| `/match/[matchId]/redeem` | 1r | `matchId` | actor's turn | actions sheet |
| `/match/[matchId]/build` | 1u | `matchId` | actor's turn | actions sheet |
| `/match/[matchId]/sell` | 1w | `matchId` | actor's turn | actions sheet |
| `/match/[matchId]/auction` | 1s, 1t | `matchId`, `tileIndex?` | auction live | match |
| `/match/[matchId]/raise-cash` | 1d | `matchId`, `route=mortgage\|sell\|trade`, `debtId` | owes > cash | blocked until resolved or bankrupt |
| `/match/[matchId]/property/[tileIndex]` | 1j | `matchId`, `tileIndex` | member | match |
| `/match/[matchId]/log` | 2c | `matchId`, `filter?` | member | caller |
| `/match/[matchId]/how-to-play` | 3m | `matchId` | member | pause sheet |
| `/match/[matchId]/out` | 1g | `matchId` | bankrupt | blocked (replaces HUD) |
| `/match/[matchId]/spectate` | 1h | `matchId` | spectator | `/profile/friends` or `/modes` |
| `/result/[matchId]` | 2b | `matchId`, `playerId?` | member | `/modes` |

## Overlays (not routes)

Rendered above the current route; Android back dismisses the topmost.

| Overlay | Opt | Fired by |
| --- | --- | --- |
| Pause sheet | 3i | HUD menu button |
| Leave-match dialog | 3j | Pause sheet → Leave match |
| Toast inventory | 3j | various (one at a time) |
| Reconnect overlay | 3k | socket disconnect |
| Notification cards | 1n | match events (subject to Settings → Event cards) |
| Bankrupt outcome card | 1o | a player's bankruptcy resolving |
| Player long-press sheet → report reason → toast | 3q | lobby or in-match player list |
| Host left / room closed / not enough players / ended while away | 3r | server events |
| Shrink-board confirm | 2a5 | board size change |
| Unpublish confirm | 2a | builder header unpublish |
| Delete-account confirm | 3o | Account → Delete account |

## Group order and the flows they serve

1. **Entry** — `3a` splash → `3b` onboarding (first run) → `1a` auth → `3c` game modes.
2. **Profile and social** — `3e` profile → `3h` history → `3d` leaderboard → `3f` settings
   (→ `3o`, `3p`). `3g` friends is reached from the **lobby**, not from profile.
3. **Builders** — `1w2` create hub → `2a2` boards list → `2a` builder (→ settings → rule lab →
   slot assign → `2a5` size) · `1x` tiles · `1y` decks · `1z` rules · `3n` empty states ·
   `3u` analytics.
4. **Host** — `1b` host setup → `1e` catalogue → `1f` board detail → `1b` lobby → `3g` friends.
5. **Play** — `1c` HUD, `1g` out, `1h` spectating, `1j` property card.
6. **In-match overlays** — `3i`, `3j`, `3k`, `3m`, `2c`, `3r`.
7. **Result** — `2b`.
8. **Play actions** — `1v` → `1p`, `1q`, `1r`, `1u`, `1w`, `1s`/`1t`.
9. **Notifications** — `1n`, `1o`.
10. **Raise cash** — `1d`.

## Guards

| Guard | Rule | Failure |
| --- | --- | --- |
| `auth` | Valid access token or a refresh that succeeds | redirect `/auth` |
| `first run` | `onboardingCompleted` false in secure store | skip `/onboarding` |
| `member` | Player is in `match.players` | redirect `/modes`, toast `E_NOT_IN_MATCH` |
| `actor's turn` | `state.turn.playerId === me` and no modal lock | actions sheet rows render disabled with a reason |
| `owner` | Local board owned by the signed-in account | redirect `/create/boards` |
| `owner + published` | Board has a published version | analytics route hidden |
| `auction live` | `state.auction !== null` | redirect `/match/[id]` |
| `owes > cash` | Player has a debt exceeding cash | route not reachable otherwise |
| `bankrupt` | Player eliminated | `/match/[id]` redirects here automatically |

## Back behaviour, explicitly

- **Blocking screens**: pass-and-play handover, raise cash (until paid or bankrupt), out of the
  match. Android back does nothing; the screen has its own exits.
- **Confirm-on-back**: lobby (leave dialog), tile/rule/deck editors with unsaved changes ("Discard
  changes?"), board settings with unsaved changes.
- **Sheets and dialogs**: back dismisses the topmost overlay only.
- **`/match/[matchId]`**: back opens the pause sheet (`3i`) — it never leaves the match.
- **`/result/[matchId]`**: back goes to `/modes`; the match cannot be re-entered.

## Deep links

Scheme `royalnavy://`. Only these four, all auth-guarded; an unauthenticated open stores the link
and replays it after sign-in.

| Link | Route | Notes |
| --- | --- | --- |
| `royalnavy://join/<CODE>` | `/lobby/[matchId]` | Code resolved via `POST /matches/join`; invalid → `/modes` with `E_ROOM_NOT_FOUND` |
| `royalnavy://board/<boardVersionId>` | `/catalogue/[boardVersionId]` | Unpublished → `/catalogue` with `E_BOARD_UNAVAILABLE` |
| `royalnavy://result/<matchId>` | `/result/[matchId]` | Member only |
| `royalnavy://settings/privacy` | `/settings/privacy` | For the Play Store data-deletion listing |

Board **local** ids are never deep-linkable — local boards never leave the device (D5).
