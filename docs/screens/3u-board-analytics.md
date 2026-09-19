# 3u · Board analytics

> Generated from `Royal Navy 1080 v2.dc.html` — option 3u, screens "Board analytics", "Board analytics — balance" (Session 9 export) · 19 September 2026.

## 1. Purpose and navigation position

How a published board actually plays. Route `/create/boards/[boardId]/analytics`, guarded by
`owner + published` — the route does not exist for unpublished boards. Reached from the board
builder header. Back returns to the builder. Two tabs in one route: traffic and balance.

## 2. Layout map

### 2.1 Traffic

```
┌──────────────────────────────────────────────────┐
│ ‹ Mumbai Nights                                  │
│   published v3 · live 24 days                    │
│ [ 7 days | 30 days | All time ]                  │
│ ┌ 2×2 KPI grid · gap 11 ─────────────────────┐   │
│ │ 4,182  matches hosted     ▲12%              │  │
│ │ 1,284  players            ▲8%               │  │
│ │ 38m    median match       ▲4%               │  │
│ │ 71%    finish rate        ▲3%               │  │
│ └──────────────────────────────────────────────┘ │
│ Matches per day                       30 days    │
│ ┌ line chart ─────────────────────────────────┐  │
│ │ 20 Aug ………………………………………………… 18 Sep          │  │
│ └───────────────────────────────────────────────┘│
│ ── MOST LANDED TILES ─────────────────────────   │
│ Marine Drive   bought 82% of landings   9,412    │
│                                         landings │
│ Bandra Hill    bought 74% of landings   8,106    │
│ Chance · north deck: Community fund     7,330    │
│                                         draws    │
│ Jail           ₹500 bail paid 61%       6,918    │
│                                         visits   │
│ Park Place     bought 44% of landings   5,204    │
└──────────────────────────────────────────────────┘
```

### 2.2 Balance

```
┌──────────────────────────────────────────────────┐
│ ‹ Mumbai Nights                                  │
│   balance · published v3                         │
│ ┌ insight card ───────────────────────────────┐  │
│ │ The blue set decides most matches            │ │
│ │ "Whoever holds Marine Drive and Bandra Hill  │ │
│ │  wins 68% of the time. Consider raising the  │ │
│ │  build cost."                                │ │
│ └───────────────────────────────────────────────┘│
│ ── WIN RATE BY STARTING ORDER ────────────────   │
│ 1st to roll ████████████ 31%                     │
│ 2nd         ██████████   27%                     │
│ 3rd         ████████     23%                     │
│ 4th         ██████       19%                     │
│ ── WHERE MATCHES END ─────────────────────────   │
│ Round cap reached   44%                          │
│ One player left     38%                          │
│ Everyone left early 18%                          │
│ "18% abandoned is above the 12% median for       │
│  11×11 boards."                                  │
│ [ Export ]                      [ Edit v4 ]      │
└──────────────────────────────────────────────────┘
```

## 3. Element inventory

| # | Element | Component | Tokens |
| --- | --- | --- | --- |
| 1 | Header | `ScreenHeader` | title `700 19px` `#FFFFFF` = board name; subtitle `600 12px` `rgba(198,220,255,0.8)` = `published v<n> · live <n> days` / `balance · published v<n>` |
| 2 | Range segmented | `Segmented` | `7 days`, `30 days`, `All time`; default `30 days` |
| 3 | KPI tile | `StatTile` ×4 | card tokens, radius 17, padding 12; value `800 19px` `#FFFFFF`; label `600 12px` `rgba(198,220,255,0.8)`; delta `700 12px` with `ph-trend-up` 12dp — `#7ADB25` when positive, `#FF9A93` when negative |
| 4 | Chart card | `Card` | title `600 14px` `rgba(198,220,255,0.95)` = `Matches per day`; range chip `600 12px` `rgba(198,220,255,0.8)` |
| 5 | Line chart | `LineChart` (SVG) | stroke 2dp `#5FC0FF`; area fill `rgba(95,192,255,.14)`; axis labels `600 10px` `rgba(198,220,255,0.75)` = first and last dates; grid lines 1dp `rgba(126,180,255,.16)`; `data-om-raster` on the container |
| 6 | Section label | `SectionLabel` | `800 11px` `.12em` `rgba(198,220,255,0.8)`; copies `MOST LANDED TILES`, `WIN RATE BY STARTING ORDER`, `WHERE MATCHES END` |
| 7 | Tile stat row | `StatRow` ×5 | name `700 15px` `#FFFFFF`; qualifier `600 12px` `rgba(198,220,255,0.8)`; count `800 15px` `#FFC84A` with a unit line `600 10px` `rgba(198,220,255,0.75)` |
| 8 | Insight card | `Card.accent` | border 1dp `rgba(255,200,74,.45)`, fill `rgba(255,200,74,.09)`; title `700 16px` `#FFFFFF`; body `600 13px` `rgba(198,220,255,0.9)` |
| 9 | Bar row | `BarRow` ×4 | label `600 13px` `rgba(198,220,255,0.95)`; bar height 10, radius 5, fill `linear-gradient(90deg,#5FC0FF,#4FB4F5)`, track `rgba(8,26,64,.5)`; value `800 13px` `#FFFFFF` |
| 10 | Outcome row | `Row` ×3 | label `600 13px`; value `800 13px` `#FFC84A` |
| 11 | Outcome note | `Text` | `600 12px` `#FFC84A` = `18% abandoned is above the 12% median for 11×11 boards.` |
| 12 | Export | `Button.ghost` | `flex:1`, min-height 44, radius 16 |
| 13 | Edit v4 | `Button.primaryGold` | `flex:1`, min-height 44, radius 16, label `Edit v<n+1>` |

### Data as drawn

KPIs: `4,182 matches hosted ▲12%` · `1,284 players ▲8%` · `38m median match ▲4%` ·
`71% finish rate ▲3%`.
Most landed: `Marine Drive — bought 82% of landings — 9,412 landings` ·
`Bandra Hill — bought 74% of landings — 8,106 landings` ·
`Chance · north — deck: Community fund — 7,330 draws` ·
`Jail — ₹500 bail paid 61% — 6,918 visits` ·
`Park Place — bought 44% of landings — 5,204 landings`.
Win rate by order: `1st to roll 31%` · `2nd 27%` · `3rd 23%` · `4th 19%`.
Where matches end: `Round cap reached 44%` · `One player left 38%` · `Everyone left early 18%`.

## 4. States

| State | Behaviour |
| --- | --- |
| default | As drawn |
| loading | KPI tiles, chart and rows render as skeletons; the header and range control are live |
| insufficient data (< 20 matches) | KPIs show real numbers; the chart is replaced by a centred line `600 13px` `rgba(198,220,255,0.8)`: `Not enough matches yet — come back after 20.`; the balance tab shows only the insight card if one is available, otherwise `No balance signal yet.` |
| empty (0 matches) | Whole body replaced by `EmptyState`: glyph `ph-chart-line` 44dp, title `No plays yet`, body `Share the room code and this fills in.` |
| error | Error card at the top with `Retry`; any cached figures below stay visible, dimmed to 70% |
| offline | Cached figures with a `600 12px` `#FF9A93` line under the header: `Offline — figures are from <time>.` |
| delta unavailable | The delta chip is omitted; the KPI keeps its value |
| exporting | `Export` shows a spinner; the share sheet opens with `<board>-analytics-<range>.csv` |
| unpublished mid-session | The route pops back to the builder with the toast `Analytics need a published board.` |
| spectating / reconnecting / disconnected / first-run | Not applicable |

## 5. Interactions

| Trigger | Result |
| --- | --- |
| Range segmented | refetch both tabs for that window; deltas compare against the previous equal window |
| Swipe / tab between traffic and balance | switch tabs; the range persists |
| Tile stat row tap | open that slot in the builder (`/create/boards/[id]/slot/[index]`) |
| Chart point press | tooltip with the date and match count; 120ms fade |
| `Export` | `GET /boards/:id/analytics.csv?range=` → Android share sheet |
| `Edit v4` | push the builder in next-version editing mode |
| Back | pop to the builder |

## 6. Data contract

`GET /boards/:id/analytics?range=7d|30d|all` →
`{ kpis: { matches, players, medianMinutes, finishRate, deltas }, series: [{ date, matches }], tiles: [{ slotIndex, name, qualifier, count, unit }], winRateByOrder: [{ order, rate }], endings: [{ reason, share }], insight: { title, body } | null }`.
`GET /boards/:id/analytics.csv?range=`. No socket subscriptions — the screen polls only on mount,
range change and pull to refresh.

## 7. Responsive

- 360dp as designed; the body is one scrolling column.
- Tablet: KPI grid becomes 4 × 1; the chart and the two list sections sit side by side.
- Landscape: KPI grid 4 × 1, chart full width beneath.
- Font scale 130%: KPI tiles grow to fit two-line labels; bar rows stack label over bar.
- The chart is fluid (`viewBox` + `preserveAspectRatio`), never a fixed pixel width.

## 8. Accessibility

- Each KPI tile: `Matches hosted, 4,182, up 12 percent`.
- The chart has an `accessibilityLabel` summarising range, min, max and trend, and a visually
  hidden data table beneath it for screen readers.
- Bar rows state their value in text — colour is never the only signal.
- The insight card is `accessibilityRole="summary"`.
- Contrast: `#5FC0FF` on card = 6.2:1; `#FFC84A` on card = 7.5:1; bar fill on its track ≥ 3:1 — pass.

## 9. Animation

| What | Duration | Easing |
| --- | --- | --- |
| KPI count-up on first load | 400ms | `ease-out` |
| Chart line draw | 600ms | `ease-out` |
| Bar fill grow | 500ms, 40ms stagger | `cubic-bezier(0.2,0.8,0.2,1)` |
| Range change cross-fade | 200ms | `ease-out` |
| Tooltip | 120ms | `ease-out` |

## 10. Acceptance criteria

1. The route is unreachable for a board with no published version.
2. Range options are `7 days`, `30 days`, `All time`, defaulting to `30 days`.
3. All four KPIs render with their labels and delta chips, coloured by sign.
4. The chart shows the first and last date labels and matches the selected range.
5. `MOST LANDED TILES` lists five rows with the correct unit per row (`landings`, `draws`, `visits`).
6. Tapping a tile row opens that slot in the builder.
7. The balance tab shows the insight card, win rate by starting order, and where matches end, in
   that order, with the exact copy in §3.
8. The abandonment note appears only when the share exceeds the board-size median.
9. `Export` produces a CSV for the selected range through the share sheet.
10. Offline shows cached figures with the staleness line, never a blank screen.
