# 3g · Friends

> Generated from `Royal Navy 1080 v2.dc.html` — option 3g, screens "Friends / default", "empty", "error" (Session 9 export) · 19 September 2026.

## 1. Purpose and navigation position

Friend list with invite and spectate actions. Route `/lobby/[matchId]/friends`, opened from the
**lobby's** "Invite friends" action (`1b`) — not from the profile group. Back returns to the lobby.

## 2. Layout map

Frame 360 × 780, padding 17, flex-column, gap 13.

```
┌──────────────────────────────────────────────────┐
│ ‹  Friends                                      │
│ [ 🔍 Search by name or @handle ]                │
│ [ Online 3 | All 12 | Requests 2 ]  segmented   │
│ ┌ dv-scroll · flex:1 · overflow-y auto · gap 9 ┐ │
│ │ [img] Aarav    In a match · Rd 8    [Watch]  │ │
│ │ [img] Meera    Online               [Invite] │ │
│ │ [img] Rohit    Online               [Invite] │ │
│ │ [img] Sana     Last seen 2h ago     [Invite] │ │
│ │ [img] Kabir    Last seen yesterday  [Invite] │ │
│ └───────────────────────────────────────────────┘│
└──────────────────────────────────────────────────┘
```

## 3. Element inventory

| # | Element | Component | Size / anchor | Tokens |
| --- | --- | --- | --- | --- |
| 1 | Frame | `ScreenFrame` | 360×780, padding 17, gap 13 | standard screen tokens |
| 2 | Header | `ScreenHeader` | caret + title | `700 22px` `#FFFFFF` = `Friends` |
| 3 | Search field | `Input.search` | full width, height 46, radius 17 | border 1dp `rgba(126,180,255,0.27)`; `ph-magnifying-glass` 16dp `rgba(198,220,255,0.8)`; placeholder `600 14px` `rgba(198,220,255,.6)` = `Search by name or @handle` |
| 4 | Tab filter | `Segmented` | three halves, radius 17 | active bg `rgba(95,192,255,.16)` text `#5FC0FF`; labels `Online <n>`, `All <n>`, `Requests <n>` — the count is part of the label |
| 5 | Scroll region | `ScrollView` (`dv-scroll`) | `flex:1`, gap 9 | — |
| 6 | Friend row | `FriendRow` | full width, min-height 60, radius 17, padding 10/12, gap 11 | card tokens |
| 7 | Avatar | `ImageSlot` | 36×36, radius 12 | dashed 1dp `rgba(126,180,255,.45)`, caption `img` |
| 8 | Name | `Text` | `flex:1` | `700 15px` `#FFFFFF` |
| 9 | Presence | `Text` | under the name | `600 12px`; `Online` in `#7ADB25`, `In a match · Rd <n>` in `#5FC0FF`, `Last seen …` in `rgba(198,220,255,0.8)` |
| 10 | Action button | `Button.small` | min-height 36, hit slop to 44, radius 13, padding 8/12 | `Invite`: bg `rgba(95,192,255,.18)`, border 1dp `rgba(95,192,255,.45)`, `700 13px` `#5FC0FF`. `Watch`: bg `rgba(255,200,74,.18)`, border 1dp `rgba(255,200,74,.45)`, `700 13px` `#FFC84A` |
| 11 | Empty state | `EmptyState` | centred, gap 11 | glyph `ph-users-three` 44dp `rgba(126,180,255,.45)`; title `700 17px` `#FFFFFF` = `No friends yet`; body `600 13px` `rgba(198,220,255,0.8)` = `Add players by handle, or invite from a finished match.`; action `Button.primaryGold` = `Invite a friend` |
| 12 | Error state | `ErrorState` | centred, gap 11 | glyph `ph-warning-circle` 40dp `#F0524A`; title `700 17px` `#FFFFFF` = `Couldn't load friends`; body `600 13px` `rgba(198,220,255,0.8)` = `Request failed (500). Your list is cached from 4 min ago.`; primary `Button.primaryGold` = `Try again`; secondary `Button.ghost` = `Show cached list` |

### Rows as drawn

`Aarav — In a match · Rd 8 — Watch` · `Meera — Online — Invite` · `Rohit — Online — Invite` ·
`Sana — Last seen 2h ago — Invite` · `Kabir — Last seen yesterday — Invite`

## 4. States

| State | Behaviour |
| --- | --- |
| default | Online first, then recently seen, then the rest — server-ordered; the client does not re-sort |
| loading | Five skeleton rows in the scroll region |
| empty (no friends) | Element 11 |
| empty (search miss) | Centred line `600 13px` `rgba(198,220,255,0.8)`: `No one matches "<query>".` |
| requests tab | Rows swap the action for two buttons, `Accept` (green tokens) and `Decline` (ghost); an empty tab shows `No pending requests.` |
| error | Element 12 — note the body carries the real status code and cache age |
| offline | Error state with body `You're offline. Your list is cached from <n> min ago.` and only `Show cached list` |
| invited | The row's action becomes a non-interactive `Invited` chip in `rgba(198,220,255,0.8)` for the rest of the session |
| disabled | `Invite` is disabled when the lobby is full; hint toast `The room is full.` |
| spectating / reconnecting / disconnected | Not applicable — the screen closes if the lobby disconnects |

## 5. Interactions

| Trigger | Validation | Server | Result |
| --- | --- | --- | --- |
| Type in search | debounce 250ms, min 2 characters | `GET /friends?q=` | filter the list in place |
| Tab change | — | `GET /friends?tab=` | reload the scroll region; scroll resets |
| `Invite` | lobby has a free seat | socket `lobby:invite { matchId, userId }` | row action becomes `Invited`; toast `Invite sent to <name>.` |
| `Watch` | the friend's match allows spectators | `GET /matches/:id/spectate` | push `/match/[matchId]/spectate` (`1h`); if refused, toast `E_SPECTATE_REFUSED` — `That match is private.` |
| `Accept` / `Decline` | — | `POST /friends/requests/:id/accept` / `/decline` | row removed with a 180ms collapse; the tab counts update |
| Long-press a row | — | — | open the report/block sheet (`3q`) |
| `Invite a friend` (empty) | — | — | open the Android share sheet with the room link `royalnavy://join/<CODE>` |
| `Try again` | — | refetch | — |
| `Show cached list` | — | — | render the cached list with a `600 12px` `#FF9A93` banner: `Showing a cached list.` |
| Back | — | — | pop to the lobby |

## 6. Data contract

`GET /friends?tab=<tab>&q=<query>` → `{ items: [{ userId, displayName, handle, avatarUrl, presence, matchId?, round? }], counts: { online, all, requests } }`.
Socket: subscribes to `friend:presence` (updates a row's presence line in place) and
`lobby:state` (to know whether a seat is free). Emits `lobby:invite`.

## 7. Responsive

- 360dp as designed; the scroll region is the only scroller.
- Tablet: two-column list, capped at 720dp.
- Landscape: search + tabs on one row, list beneath.
- Font scale 130%: rows grow to 76dp; names truncate to one line, presence wraps.

## 8. Accessibility

- Rows: `Aarav, in a match, round 8` with the action exposed as a separate button, `Watch Aarav's match`.
- Presence is never colour-only — the text always states it.
- Tabs are a `tablist` with counts read out (`Online, 3`).
- Search has `accessibilityLabel="Search friends by name or handle"`.
- Contrast: `#7ADB25` on card = 7.8:1; `#5FC0FF` on card = 6.2:1; `#FFC84A` on card = 7.5:1 — pass.

## 9. Animation

| What | Duration | Easing |
| --- | --- | --- |
| Row removal (height + opacity) | 180ms | `ease-in` |
| Invite → Invited swap | 140ms cross-fade | `ease-out` |
| Presence change | 200ms colour tween | `linear` |
| Tab change cross-fade | 180ms | `ease-out` |

## 10. Acceptance criteria

1. Tab labels include their counts, exactly `Online 3`, `All 12`, `Requests 2` with live numbers.
2. Rows in a match show `Watch`; all others show `Invite`.
3. `Invite` sends a lobby invite and permanently marks that row `Invited` for the session.
4. `Watch` reaches the spectator screen, or toasts when refused.
5. The error state prints the real HTTP status and the real cache age.
6. `Show cached list` renders cached rows with the cached banner.
7. Search needs two characters and debounces at 250ms.
8. Presence updates arrive over the socket without a refetch.
9. The empty state shows the exact copy in §3 plus `Invite a friend`.
10. Long-press opens the report/block sheet (`3q`).
