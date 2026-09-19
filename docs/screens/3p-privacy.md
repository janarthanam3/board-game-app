# 3p · Privacy

> Generated from `Royal Navy 1080 v2.dc.html` — option 3p, screen "Privacy" (Session 9 export) · 19 September 2026.

## 1. Purpose and navigation position

Legal documents, data export, blocked players, and the two visibility switches. Route
`/settings/privacy`, pushed from `3f` and reachable by the deep link
`royalnavy://settings/privacy` (required for the Play Store data-deletion listing). Back returns to
`/settings`.

## 2. Layout map

Frame 360 × 780, padding 17, flex-column, gap 13, scrolling column.

```
┌──────────────────────────────────────────────────┐
│ ‹  Privacy                                      │
│    What we keep and what you can take           │
│ ── DOCUMENTS ─────────────────────────────────  │
│ Privacy policy                               ›  │
│ How your data is used                           │
│ Terms of service                             ›  │
│ Last updated June 2026                          │
│ ── YOUR DATA ─────────────────────────────────  │
│ Download my data                             ›  │
│ Match history, boards and profile as a file     │
│ Blocked players             3 blocked        ›  │
│ ── VISIBILITY ────────────────────────────────  │
│ Show me on the leaderboard             [toggle] │
│ Off means your rank is private                  │
│ Let strangers add me as a friend       [toggle] │
│ From room codes and recent matches              │
└──────────────────────────────────────────────────┘
```

## 3. Element inventory

| # | Element | Component | Size / anchor | Tokens |
| --- | --- | --- | --- | --- |
| 1 | Frame | `ScreenFrame` | 360×780, padding 17, gap 13 | standard screen tokens |
| 2 | Header | `ScreenHeader` | caret + title + subtitle | title `700 19px` `#FFFFFF` = `Privacy`; subtitle `600 12px` `rgba(198,220,255,0.8)` = `What we keep and what you can take` |
| 3 | Section label | `SectionLabel` | gap 8 to hairline | `800 11px` `.12em` `rgba(198,220,255,0.8)`; copies `DOCUMENTS`, `YOUR DATA`, `VISIBILITY` |
| 4 | Document row | `NavRow` ×2 | radius 17, padding 11/12, caret 16dp | card tokens; label `600 14px` `rgba(198,220,255,0.95)`; meta `600 12px` `rgba(198,220,255,0.8)` |
| 5 | Download row | `NavRow` | as #4 | label `Download my data`; meta `Match history, boards and profile as a file` |
| 6 | Blocked players row | `NavRow` | as #4 | label `Blocked players`; value `600 13px` `#5FC0FF` = `3 blocked` |
| 7 | Visibility toggle row | `ToggleRow` ×2 | as #4 with a 44×26 switch | label `600 14px`; hint `600 12px` `rgba(198,220,255,0.8)`; on-track `rgba(122,219,37,.45)` knob `#7ADB25`, off-track `rgba(8,26,64,.5)` |

### Row copy (verbatim)

| Label | Meta / hint |
| --- | --- |
| `Privacy policy` | `How your data is used` |
| `Terms of service` | `Last updated June 2026` |
| `Download my data` | `Match history, boards and profile as a file` |
| `Blocked players` | value `<n> blocked` |
| `Show me on the leaderboard` | `Off means your rank is private` |
| `Let strangers add me as a friend` | `From room codes and recent matches` |

## 4. States

| State | Behaviour |
| --- | --- |
| default | Both visibility toggles on |
| loading | The blocked count renders as a 60 × 12dp skeleton bar until `GET /me/privacy` resolves; everything else paints immediately |
| export requested | The Download row's meta becomes `Preparing your file…` with a 16dp spinner replacing the caret; the row is disabled |
| export ready | Meta becomes `Ready — tap to save`; tapping opens the Android share sheet with the `.json` file |
| export failed | Meta becomes `Couldn't prepare the file.` in `#FF9A93`; tapping retries |
| empty (no blocks) | The Blocked players row value reads `None` and the row still navigates |
| offline | Documents open from the bundled offline copies; Download and Blocked players are 45% opacity with the hint `Needs a connection`; toggles queue and sync on reconnect |
| error | Toggle failure reverts the switch and shows the toast `Couldn't save that setting.` |
| first-run / spectating / reconnecting / disconnected | No difference |

## 5. Interactions

| Trigger | Validation | Server | Result |
| --- | --- | --- | --- |
| `Privacy policy` | — | — | in-app web view of the bundled document, with an "open in browser" action |
| `Terms of service` | — | — | same |
| `Download my data` | one export at a time | `POST /me/export` then poll `GET /me/export/:id` every 2000ms, up to 60000ms | share sheet with `royal-navy-data-<date>.json` |
| `Blocked players` | — | `GET /me/blocks` | push the blocked list; each row has an `Unblock` action which calls `DELETE /me/blocks/:userId` |
| `Show me on the leaderboard` | — | `PATCH /me/privacy { leaderboardVisible }` | off removes the player from all leaderboard scopes within one refresh |
| `Let strangers add me as a friend` | — | `PATCH /me/privacy { openToRequests }` | off makes `POST /friends/requests` from non-contacts fail with `E_NOT_ACCEPTING_REQUESTS` |
| Back | — | — | pop to `/settings` |

## 6. Data contract

`GET /me/privacy` → `{ leaderboardVisible, openToRequests, blockedCount, termsUpdatedAt }`.
`POST /me/export`, `GET /me/export/:id`, `GET /me/blocks`, `DELETE /me/blocks/:userId`,
`PATCH /me/privacy`. No socket subscriptions.

## 7. Responsive

- 360dp as designed; the column scrolls.
- Tablet: capped at 560dp centred.
- Landscape: single scrolling column.
- Font scale 130%: hints wrap to two lines; rows grow to 64dp; nothing truncates.

## 8. Accessibility

- Toggles: `accessibilityRole="switch"`, the hint line supplied as `accessibilityHint`.
- The export row announces its progress through `accessibilityLiveRegion="polite"`.
- Document rows announce `, opens a document`.
- Contrast: `#5FC0FF` on card = 6.2:1; hints on card = 6.0:1 — pass.

## 9. Animation

| What | Duration | Easing |
| --- | --- | --- |
| Toggle knob | 160ms | `cubic-bezier(0.2,0.8,0.2,1)` |
| Export spinner | continuous while polling | `linear` |
| Row press | 90ms | `ease-out` |

## 10. Acceptance criteria

1. Sections read `DOCUMENTS`, `YOUR DATA`, `VISIBILITY` in that order.
2. All six row labels and their metas match §3 verbatim.
3. The blocked count row shows `<n> blocked`, or `None` at zero.
4. Export produces a JSON file containing match history, boards and profile, delivered through the
   Android share sheet.
5. Only one export can be in flight; the row is disabled while preparing.
6. Turning off leaderboard visibility removes the player from every scope on the next fetch.
7. Turning off stranger requests makes new requests from non-contacts fail with
   `E_NOT_ACCEPTING_REQUESTS`.
8. Documents are readable offline from bundled copies.
9. A failed toggle reverts and toasts.
10. The deep link `royalnavy://settings/privacy` lands here after sign-in.
