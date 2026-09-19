# 1u · Build

> Generated from `Royal Navy 1080 v2.dc.html` — option 1u, screen "Build" (Session 9 export) · 19 September 2026.

## 1. Purpose and navigation position

Place houses and hotels on a colour set you hold. Route `/match/[matchId]/build`, pushed from the
actions sheet (`1v`). Back returns to the sheet with nothing committed.

## 2. Layout map

```
┌──────────────────────────────────────────────────┐
│ Build                                            │
│ Round 12 · tap my tiles to build                 │
│ ┌ board · buildable tiles selectable ─────────┐  │
│ │ (GO · CHEST · JAIL · GO TO)                  │ │
│ └───────────────────────────────────────────────┘│
│ ── BUILD ON ──────────────────────────────────   │
│ ① Park Place                                     │
│ [ House  ₹ 300 ]        [ Hotel  ₹ 750 ]         │
│ "one property per build"                         │
│ ┌ detail ─────────────────────────────────────┐  │
│ │ Park Place                                   │ │
│ │ Rent now     ₹ 35     House cost   ₹ 300     │ │
│ │ Houses       1 → 2    Rent after   ₹ 175     │ │
│ │ Pay          ₹ 300                           │ │
│ └───────────────────────────────────────────────┘│
│ ── BUILD SUMMARY ─────────────────────────────   │
│ Houses     2            ₹ 600                    │
│ Hotels     1            ₹ 750                    │
│ Total pay               ₹ 1,350                  │
│ [ Cancel ]                 [ Build ]             │
└──────────────────────────────────────────────────┘
```

`one property per build` is a rule, not a hint: each build step targets a single tile; repeat the
step to build more. The summary accumulates the steps queued in this session.

## 3. Element inventory

| # | Element | Component | Tokens |
| --- | --- | --- | --- |
| 1 | Header | `Row` | title `700 19px` `#FFFFFF` = `Build`; subtitle `600 12px` `rgba(198,220,255,0.8)` = `Round <n> · tap my tiles to build` |
| 2 | Board | `BoardView.select` | aspect 1:1; only tiles in a held set, with the bank holding stock, are selectable; the rest 45% opacity and inert |
| 3 | Selection badge | `Badge` | 18dp, bg `#7ADB25`, `800 11px` `#062A06` |
| 4 | Section label | `SectionLabel` | `800 11px` `.12em`; copies `BUILD ON`, `BUILD SUMMARY` |
| 5 | Target row | `Row` | badge + tile name `700 14px` `#FFFFFF` |
| 6 | Build-type button | `Button.choice` ×2 | `flex:1`, min-height 56, radius 16; card tokens, selected: border 1dp `rgba(122,219,37,.45)` and fill `rgba(122,219,37,.09)`; label `700 15px` `#FFFFFF` = `House` / `Hotel`; price `800 15px` `#FFC84A` |
| 7 | Scope note | `Text` | `600 12px` `rgba(198,220,255,0.75)` = `one property per build` |
| 8 | Detail card | `Card` | name `800 17px` `#FFFFFF`; five key/value pairs — keys `600 11px` `rgba(198,220,255,0.8)`, values `800 13px` `#FFC84A`; the `Houses` value shows the transition `1 → 2` in `800 13px` `#FFFFFF` |
| 9 | Summary card | `Card.accent` | border 1dp `rgba(122,219,37,.45)`, fill `rgba(122,219,37,.09)`; rows `Houses <n> ₹<n>`, `Hotels <n> ₹<n>`; total row key `600 12px` = `Total pay`, value `800 22px` `#FFC84A` |
| 10 | Cancel | `Button.ghost` | `flex:1`, min-height 44, radius 16 |
| 11 | Commit | `Button.primaryGold` | `flex:1.4`, height 50, radius 16, `800 16px` `#3A2402` = `Build` |

### Detail keys (exact, in order)

`Rent now` · `House cost` · `Houses` · `Rent after` · `Pay`

For a hotel step the second and fifth keys read `Hotel cost` and `Pay`, and `Houses` shows
`4 → hotel`.

## 4. Build rules (authoritative)

Mirrored from `docs/05-game-rules.md` § Building:

- You may build only on a tile whose colour group you **hold** at the board's threshold.
- `Houses before a hotel` (default 4) houses must stand on a tile before a hotel replaces them;
  the hotel returns those houses to the bank when the board's `Hotel returns houses to the bank`
  rule is on.
- **Even build**, when the board's `Build evenly` rule is on: a tile may not exceed the lowest
  house count in its group by more than one. Tiles that would violate it are inert with the reason
  `Build evenly — put one on <tile> first.`
- Bank supply is finite (default 32 houses, 12 hotels). When stock runs out the type button is
  disabled with `The bank has no houses left.`
- Buildings cannot be placed on a mortgaged tile, or on any tile whose group contains a mortgaged
  tile when `Mortgage breaks the set` is on.
- Cost comes from the tile's own `House cost` / `Hotel cost` (`1x`), not a global value.

## 5. States

| State | Behaviour |
| --- | --- |
| nothing selected | Type buttons and `Build` disabled; summary at `₹ 0` |
| house selected | As drawn |
| hotel not yet eligible | The `Hotel` button is disabled with `Needs 4 houses first.` |
| cannot afford | The summary total turns `#FF9A93` with `You're ₹<n> short.`; `Build` disabled |
| even-build blocked | The offending tile is inert on the board with the documented reason on tap |
| bank empty | The affected type button is disabled with the stock reason |
| queued steps | Each committed step in this session adds to the summary; `Cancel` discards the whole queue |
| committing | `Build` shows a spinner; board and controls lock |
| error | Rollback with the error toast; the queue is preserved |
| offline (local modes) | Identical |
| not your turn / spectating / bankrupt | Not reachable |

## 6. Interactions

| Trigger | Validation | Emits | Result |
| --- | --- | --- | --- |
| Tap a board tile | in a held set, buildable | — | set it as the build target, show its detail |
| `House` / `Hotel` | type available, affordable | — | queue one step on the target; the summary and detail update |
| Tap the target row | — | — | clear the target |
| `Build` | ≥ 1 step queued, total ≤ cash | `match:action { type: 'build', steps }` | apply atomically, pop back, toast `Built <n> houses and <n> hotels for ₹<n>.` |
| `Cancel` / Android back | — | — | discard the queue and pop back |

## 7. Data contract

Reads holdings, current buildings, bank stock, per-tile build costs and the board's build rules
from the match snapshot. Emits one atomic `match:action` carrying the whole queue, so the even-build
rule is validated against the final arrangement rather than step by step.

## 8. Responsive

- 360dp as designed; the detail and summary scroll, the actions are pinned.
- Tablet: board left, controls right.
- Landscape: same split.
- Font scale 130%: the two type buttons stack; detail pairs stack.

## 9. Accessibility

- Buildable tiles: `Park Place, 1 house, build a house for 300 rupees`.
- Inert tiles announce their reason rather than being silently unfocusable.
- The `Houses 1 → 2` transition is read as `Houses, one becoming two`.
- The summary is a polite live region.
- Contrast: `#7ADB25` on card = 7.8:1; `#FFC84A` on the summary tint = 7.3:1 — pass.

## 10. Animation

| What | Duration | Easing |
| --- | --- | --- |
| Type button select | 140ms | `ease-out` |
| House pip appearing on the board tile | 220ms scale 0.6 → 1 | `cubic-bezier(0.2,0.8,0.2,1)` |
| Hotel replacing houses (pips collapse, hotel scales in) | 320ms | `ease-in-out` |
| Summary total count | 260ms | `ease-out` |

## 11. Acceptance criteria

1. Only tiles in a held colour set with available bank stock are selectable.
2. The `one property per build` note is present and each step targets exactly one tile.
3. The detail card shows the five keys in §3 with the `Houses` transition and `Rent after`.
4. The hotel option is unavailable until the tile has the board's required house count.
5. Even build, when on, blocks the offending tile and states which tile to build on first.
6. Bank stock limits are enforced and reported.
7. The summary accumulates queued steps as houses, hotels and a total.
8. An unaffordable total disables `Build` and states the shortfall.
9. The whole queue commits atomically and is validated server-side against the final arrangement.
10. Cancel discards the entire queue without a confirm.
