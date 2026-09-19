# 3h · Match history

> Generated from `Royal Navy 1080 v2.dc.html` — option 3h, screens "History / default", "History / empty" (Session 9 export) · 19 September 2026.

## 1. Purpose and navigation position

Every finished match the player took part in, filterable by source. Route `/profile/history`, pushed
from `3e`. Back returns to `/profile`.

## 2. Layout map

Frame 360 × 780, padding 17, flex-column, gap 13.

```
┌──────────────────────────────────────────────────┐
│ ‹  Match history                                │
│ [ All | Online | Offline ]  segmented           │
│ ┌ dv-scroll · flex:1 · overflow-y auto · gap 9 ┐ │
│ │ Friday Night          1st of 6      ₹42,800  │ │
│ │ 12 Sep · 30 turns                            │ │
│ │ Office League         3rd of 4      ₹18,050  │ │
│ │ 10 Sep · 24 turns                            │ │
│ │ Pass and play         2nd of 3      ₹21,300  │ │
│ │ 8 Sep · 19 turns                             │ │
│ │ Random room           4th of 6      ₹9,400   │ │
│ │ 5 Sep · 41 turns                             │ │
│ │ Solo vs AI · Hard     1st of 4      ₹35,600  │ │
│ │ 3 Sep · 28 turns                             │ │
│ └───────────────────────────────────────────────┘│
└──────────────────────────────────────────────────┘
```

Empty state replaces the scroll region only — the header and the segmented control stay.

## 3. Element inventory

| # | Element | Component | Size / anchor | Tokens |
| --- | --- | --- | --- | --- |
| 1 | Frame | `ScreenFrame` | 360×780, padding 17, gap 13 | standard screen tokens |
| 2 | Header | `ScreenHeader` | caret 19dp + title | `700 22px` `#FFFFFF` = `Match history` |
| 3 | Filter | `Segmented` | full width, three halves, radius 17, border 1dp `rgba(126,180,255,0.27)` | active bg `rgba(95,192,255,.16)` text `#5FC0FF`; inactive `rgba(198,220,255,0.9)`; labels `All`, `Online`, `Offline` |
| 4 | Scroll region | `ScrollView` (`dv-scroll`) | `flex:1`, `overflow-y:auto`, gap 9 | — |
| 5 | History row | `MatchRow` | full width, radius 17, padding 11/12 | card tokens; name `700 15px` `#FFFFFF`; meta `600 12px` `rgba(198,220,255,0.8)`; placement `700 13px`; net worth `800 15px` `#FFC84A` |
| 6 | Placement badge | `Text` | right of the name | `#FFC84A` when `1st`, otherwise `rgba(198,220,255,0.95)` |
| 7 | Empty illustration | `EmptyState` | centred in the scroll region, gap 11 | glyph `ph-clock-counter-clockwise` 44dp `rgba(126,180,255,.45)` |
| 8 | Empty title | `Text` | — | `700 17px` `#FFFFFF` = `Nothing played yet` |
| 9 | Empty body | `Text` | centred, max 260dp | `600 13px` `rgba(198,220,255,0.8)` = `Finished matches show up here with standings and net worth.` |
| 10 | Empty action | `Button.primaryGold` | min-height 44, radius 16 | label `700 15px` `#3A2402` = `Start a game` |

### Rows as drawn

| Name | Placement | Meta | Net worth |
| --- | --- | --- | --- |
| `Friday Night` | `1st of 6` | `12 Sep · 30 turns` | `₹42,800` |
| `Office League` | `3rd of 4` | `10 Sep · 24 turns` | `₹18,050` |
| `Pass and play` | `2nd of 3` | `8 Sep · 19 turns` | `₹21,300` |
| `Random room` | `4th of 6` | `5 Sep · 41 turns` | `₹9,400` |
| `Solo vs AI · Hard` | `1st of 4` | `3 Sep · 28 turns` | `₹35,600` |

## 4. States

| State | Behaviour |
| --- | --- |
| default | Newest first; the list pages 20 at a time, infinite scroll |
| loading (first page) | Five skeleton rows inside the scroll region |
| loading (next page) | A 32dp row-height spinner at the list foot |
| empty (no matches at all) | Elements 7–10 |
| empty (filter has no results) | Same layout, title `No <filter> matches`, body `Try a different filter.`, **no** action button |
| error | Error card at the top of the scroll region with a `Retry` button; any already-loaded rows stay |
| offline | Cached pages render; the foot shows `600 12px` `rgba(198,220,255,0.8)`: `Offline — older matches aren't available.` |
| disabled / spectating / reconnecting | Not applicable |

## 5. Interactions

| Trigger | Result |
| --- | --- |
| Filter tap | Refetch with `source=all\|online\|offline`; the scroll position resets to the top |
| Row tap | push `/result/[matchId]` |
| Scroll to within 200dp of the foot | fetch the next page |
| Pull to refresh | reload page 1 in place |
| `Start a game` (empty) | `router.replace('/modes')` |
| Back / Android back | pop to `/profile` |

## 6. Data contract

`GET /me/matches?source=<filter>&cursor=<id>&limit=20` →
`{ items: [{ matchId, name, placement, playerCount, endedAt, turns, netWorth, source }], nextCursor }`.
Offline matches come from the local SQLite matches table and are merged client-side, sorted by
`endedAt` descending. No socket subscriptions.

## 7. Responsive

- 360dp as designed; the scroll region is the only scrolling element.
- Tablet: two-column list, gap 11, content capped at 720dp.
- Landscape: segmented control and list share the frame; the list keeps one column.
- Font scale 130%: rows grow to 84dp; the name truncates to one line with an ellipsis, the meta
  wraps.

## 8. Accessibility

- Each row is one button: `Friday Night, first of six, 12 September, 30 turns, net worth 42,800 rupees`.
- Segmented control is a `tablist`.
- The list has `accessibilityLabel="Match history, N results"`.
- Contrast: `#FFC84A` on card = 7.5:1 — pass.

## 9. Animation

| What | Duration | Easing |
| --- | --- | --- |
| Filter change (list cross-fade) | 180ms | `ease-out` |
| Row press | 90ms | `ease-out` |
| Next-page rows fade in | 160ms | `ease-out` |

## 10. Acceptance criteria

1. Filter labels are `All`, `Online`, `Offline`, defaulting to `All`.
2. Rows show name, placement `Nth of M`, date + turn count, and net worth, in the drawn positions.
3. A 1st placement renders gold; other placements do not.
4. The list pages at 20 and appends without a jump in scroll position.
5. The full-empty state shows the exact title and body copy in §3 plus `Start a game`.
6. A filter with no results shows no action button.
7. Offline shows cached rows and the offline foot line.
8. Tapping a row opens that match's result screen.
9. The scroll region is the only scroller; the header and filter never scroll away.
10. At 130% font scale every row's net worth stays fully visible.
