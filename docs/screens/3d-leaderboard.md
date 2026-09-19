# 3d · Leaderboard

> Generated from `Royal Navy 1080 v2.dc.html` — option 3d, screens "Leaderboard / default", "empty", "loading" (Session 9 export) · 19 September 2026.

## 1. Purpose and navigation position

Ranked standings across three scopes. Route `/profile/leaderboard`, pushed from `3e`. Back returns
to `/profile`.

## 2. Layout map

Frame 360 × 780, padding 17, flex-column, gap 13.

```
┌──────────────────────────────────────────────────┐
│ ‹  Leaderboard                                  │
│ [ Weekly | All-time | Friends ]  segmented      │
│ ┌ dv-scroll · flex:1 · overflow-y auto · gap 8 ┐ │
│ │ 1  [img]  Aarav                      42800   │ │
│ │ 2  [img]  Meera                      39150   │ │
│ │ 3  [img]  Naveen                     36400   │ │
│ │ 4  [img]  You                        31200   │ │ ← highlighted
│ │ 5  [img]  Rohit                      28900   │ │
│ │ 6  [img]  Sana                       26100   │ │
│ │ 7  [img]  Kabir                      24350   │ │
│ └───────────────────────────────────────────────┘│
│ "Resets Monday 00:00 IST"  centred footnote      │
└──────────────────────────────────────────────────┘
```

## 3. Element inventory

| # | Element | Component | Size / anchor | Tokens |
| --- | --- | --- | --- | --- |
| 1 | Frame | `ScreenFrame` | 360×780, padding 17, gap 13 | standard screen tokens |
| 2 | Header | `ScreenHeader` | caret + title | `700 22px` `#FFFFFF` = `Leaderboard` |
| 3 | Scope filter | `Segmented` | three halves, radius 17 | active bg `rgba(95,192,255,.16)` text `#5FC0FF`; labels `Weekly`, `All-time`, `Friends` |
| 4 | Scroll region | `ScrollView` (`dv-scroll`) | `flex:1`, gap 8 | — |
| 5 | Rank row | `RankRow` | full width, min-height 52, radius 17, padding 9/12, gap 11 | card tokens |
| 6 | Rank number | `Text` | fixed 22dp column, right-aligned | `800 15px`; ranks 1–3 `#FFC84A`, rank ≥ 4 `rgba(198,220,255,0.8)` |
| 7 | Avatar | `ImageSlot` | 32×32, radius 11 | dashed 1dp `rgba(126,180,255,.45)`, caption `img` |
| 8 | Name | `Text` | `flex:1` | `700 15px` `#FFFFFF` |
| 9 | Score | `Text` | right | `800 15px` `#FFC84A`, rendered as a plain integer as drawn (`42800`) — no `₹`, no grouping |
| 10 | Self row treatment | `RankRow.self` | as #5 | border becomes 1dp `rgba(95,192,255,.45)`, fill `rgba(95,192,255,.10)`, name reads `You` |
| 11 | Footnote | `Text` | centred, `flex:none` | `600 12px` `rgba(198,220,255,0.75)` = `Resets Monday 00:00 IST` |
| 12 | Skeleton row | `RankRow.skeleton` | seven rows | bars `rgba(126,180,255,.16)` radius 8 |
| 13 | Empty state | `EmptyState` | centred in the scroll region | glyph `ph-trophy` 44dp `rgba(126,180,255,.45)`; title `700 17px` `#FFFFFF` = `No ranked games yet`; body `600 13px` `rgba(198,220,255,0.8)` = `Finish a match to claim a place on the board.`; action `Button.primaryGold` = `Find a game` |

### Rows as drawn

`1 Aarav 42800` · `2 Meera 39150` · `3 Naveen 36400` · `4 You 31200` · `5 Rohit 28900` ·
`6 Sana 26100` · `7 Kabir 24350`

## 4. States

| State | Behaviour |
| --- | --- |
| default | Top 50 for the scope; the player's own row is highlighted (#10). If the player is outside the top 50, their row is pinned to the bottom of the scroll region above the footnote, separated by a 1dp `rgba(126,180,255,.18)` hairline |
| loading | Header + segmented intact, seven skeleton rows, footnote hidden |
| empty | Element 13; the footnote stays visible on the `Weekly` scope only |
| error | Error card at the top of the scroll region with `Retry` |
| offline | Cached scope renders with a `600 12px` `#FF9A93` line above the footnote: `Offline — standings may be out of date.` |
| first-run | Empty state |
| disabled / spectating / reconnecting | Not applicable |

## 5. Interactions

| Trigger | Result |
| --- | --- |
| Scope tap | Refetch `GET /leaderboard?scope=weekly\|alltime\|friends`; scroll resets to top; the footnote text changes to `Resets Monday 00:00 IST` (weekly), is hidden (all-time), or reads `Friends you've added` (friends) |
| Row tap | push the public profile for that player; the `You` row pushes `/profile` |
| Pull to refresh | reload the current scope |
| `Find a game` (empty) | `router.replace('/modes')` |
| Back | pop to `/profile` |

## 6. Data contract

`GET /leaderboard?scope=<scope>` → `{ entries: [{ rank, userId, displayName, avatarUrl, score, isSelf }], selfEntry, resetsAt }`.
Scores are the season's best net worth in whole rupees. No socket subscriptions; the board is polled
only on mount and on pull to refresh.

## 7. Responsive

- 360dp as designed. Tablet: content capped at 560dp centred.
- Landscape: the scroll region keeps one column; the footnote stays pinned below it.
- Font scale 130%: rows grow to 62dp; long names truncate with an ellipsis, scores never do.

## 8. Accessibility

- Each row: `Rank 4, You, 31,200 points` — the self row adds `, your position`.
- Scope control is a `tablist`.
- The pinned self row announces `Your position, outside the top 50` when pinned.
- Contrast: `#FFC84A` on card = 7.5:1; the self-row tint keeps name contrast ≥ 7:1 — pass.

## 9. Animation

| What | Duration | Easing |
| --- | --- | --- |
| Scope change (cross-fade) | 180ms | `ease-out` |
| Skeleton → content | 200ms | `ease-out` |
| Self-row highlight pulse on first paint (border opacity 0.45 → 0.8 → 0.45) | 900ms, once | `ease-in-out` |

## 10. Acceptance criteria

1. Scope labels are `Weekly`, `All-time`, `Friends`, defaulting to `Weekly`.
2. Ranks 1–3 render gold; ranks 4 and below render muted.
3. The player's own row is highlighted and labelled `You`.
4. A player outside the top 50 gets a pinned bottom row separated by a hairline.
5. Scores render as plain integers, matching the design (no currency symbol on this screen).
6. The weekly footnote reads `Resets Monday 00:00 IST` exactly.
7. The empty state shows the exact title, body and `Find a game` action.
8. Loading shows seven skeleton rows and hides the footnote.
9. Switching scope resets scroll to the top.
10. At 130% font scale every score stays fully visible.
