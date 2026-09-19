# 1q · Mortgage

> Generated from `Royal Navy 1080 v2.dc.html` — option 1q, screen "Mortgage" (Session 9 export) · 19 September 2026.

## 1. Purpose and navigation position

Raise cash by mortgaging tiles to the bank. Route `/match/[matchId]/mortgage`, pushed from the
actions sheet (`1v`) and from raise cash (`1d`). Back returns to the caller with nothing committed.

## 2. Layout map

Board-first selection, summary beneath.

```
┌──────────────────────────────────────────────────┐
│ Mortgage                                         │
│ Round 12 · mortgage tiles                        │
│ ┌ board · your tiles selectable ──────────────┐  │
│ │ selected tiles carry an order badge ① ②      │ │
│ │ (GO · CHEST · JAIL · GO TO)                  │ │
│ └───────────────────────────────────────────────┘│
│ ── MORTGAGE ──────────────────────────────────   │
│ ① Park Place                                     │
│ ② Marina Rd                                      │
│ ┌ detail · last tapped tile ──────────────────┐  │
│ │ Marina Rd                                    │ │
│ │ Rent lost      ₹ 28   Mortgage pays  ₹ 700   │ │
│ │ Houses         —      Redeem cost    ₹ 770   │ │
│ │ Value          ₹ 1,150                       │ │
│ └───────────────────────────────────────────────┘│
│ ── MORTGAGE SUMMARY ──────────────────────────   │
│ bank pays you              ₹ 1,250               │
│ for 2 properties                                 │
│ Interest total             ₹ 125                 │
│ Redeem total               ₹ 1,375               │
│ [ Cancel ]                 [ Mortgage ]          │
└──────────────────────────────────────────────────┘
```

## 3. Element inventory

| # | Element | Component | Tokens |
| --- | --- | --- | --- |
| 1 | Header | `Row` | title `700 19px` `#FFFFFF` = `Mortgage`; subtitle `600 12px` `rgba(198,220,255,0.8)` = `Round <n> · mortgage tiles` |
| 2 | Board | `BoardView.select` | aspect 1:1, radius 17, card ground; only your unmortgaged, building-free tiles are selectable; everything else is 45% opacity and inert |
| 3 | Selection badge | `Badge` | 18dp circle on the tile corner, bg `#5FC0FF`, `800 11px` `#04203B`, numbered in tap order |
| 4 | Section label | `SectionLabel` | `800 11px` `.12em` `rgba(198,220,255,0.8)`; copies `MORTGAGE`, `MORTGAGE SUMMARY` |
| 5 | Selected row | `Row` ×n | badge + name `700 14px` `#FFFFFF`; tap to deselect |
| 6 | Detail card | `Card` | card tokens, padding 12; name `800 17px` `#FFFFFF`; five key/value pairs — keys `600 11px` `rgba(198,220,255,0.8)`, values `800 13px` `#FFC84A`, `—` in `rgba(198,220,255,0.8)` |
| 7 | Summary card | `Card.accent` | border 1dp `rgba(95,192,255,.45)`, fill `rgba(95,192,255,.10)`; headline key `600 12px` `rgba(198,220,255,0.8)` = `bank pays you`; headline value `800 22px` `#FFC84A`; caption `600 12px` = `for <n> properties`; two rows `Interest total`, `Redeem total` — keys `600 12px`, values `800 15px` `#FFC84A` |
| 8 | Cancel | `Button.ghost` | `flex:1`, min-height 44, radius 16, `700 15px` `rgba(198,220,255,0.95)` |
| 9 | Commit | `Button.primaryGold` | `flex:1.4`, height 50, radius 16, `800 16px` `#3A2402` = `Mortgage` |

### Detail keys (exact, in order)

`Rent lost` · `Mortgage pays` · `Houses` · `Redeem cost` · `Value`

## 4. Money rules (authoritative)

From the board's rules, mirrored in `docs/05-game-rules.md` § Mortgage:

```
mortgagePays(tile)  = round(tile.cost * board.mortgageRate)        // 50% by default
interest(tile)      = round(mortgagePays(tile) * board.interestRate) // 10% by default
redeemCost(tile)    = mortgagePays(tile) + interest(tile)
```

Summary totals are the sums over the selection. Worked from the drawn example: two tiles paying
`₹1,250` total, interest `₹125`, redeem total `₹1,375`.

Mortgaging is refused while any tile in that colour group carries a building — the buildings must
be sold first (`1w`). When the board's `Mortgage breaks the set` rule is on, mortgaging drops the
group below its threshold and rent on the remaining tiles falls to base immediately.

## 5. States

| State | Behaviour |
| --- | --- |
| nothing selected | Summary shows `₹ 0` / `for 0 properties`; `Mortgage` disabled at 45% opacity |
| selection valid | As drawn |
| tile has buildings | The tile is inert on the board; tapping it toasts `Sell the buildings on this group first.` |
| already mortgaged | Rendered with a `mortgaged` chip and inert; tapping toasts `Already mortgaged.` |
| set will break | A `600 12px` `#FFC84A` line above the actions: `This drops the <colour> set below <n> — rent falls to base.` |
| committing | `Mortgage` shows an 18dp spinner; the board and list lock |
| error | Rollback and toast the error-catalog copy; the selection is preserved |
| raise-cash mode | The header gains a `700 13px` `#FFC84A` line `Raise ₹<n> · ₹<m> to go`, updating as tiles are selected; the commit button reads `Mortgage & pay` |
| offline (local modes) | Identical |
| spectating / not your turn | Not reachable |
| loading / empty | If you own no mortgageable tile the screen is not reachable — the actions row is disabled instead |

## 6. Interactions

| Trigger | Validation | Emits | Result |
| --- | --- | --- | --- |
| Tap a board tile | yours, unmortgaged, group building-free | — | select, append to the list, show its detail |
| Tap a selected tile or row | — | — | deselect and renumber |
| Pinch / drag the board | zoom 100%–400% | — | zoom and pan |
| `Mortgage` | ≥ 1 tile selected | `match:action { type: 'mortgage', tiles }` | optimistic apply, pop back, toast `Mortgaged <n> properties for ₹<n>.` |
| `Cancel` / Android back | — | — | pop back, discarding the selection with no confirm |

## 7. Data contract

Reads holdings, buildings and the board's mortgage and interest rates from the match snapshot.
Emits one `match:action` for the whole selection — never one per tile, so the transaction is atomic.

## 8. Responsive

- 360dp as designed; the selected list and detail card scroll, the summary and actions are pinned.
- Tablet: board left, list + detail + summary right.
- Landscape: same split.
- Font scale 130%: detail pairs stack; the summary headline drops to 19dp.

## 9. Accessibility

- Selectable tiles are buttons: `Marina Rd, mortgage pays 700 rupees, double tap to select`.
- Selected tiles announce `, selected, position 2`.
- The summary is `accessibilityLiveRegion="polite"` and re-announces the total on every change.
- The set-break warning is announced assertively when it first appears.
- Contrast: `#FFC84A` on the summary tint = 7.1:1 — pass.

## 10. Animation

| What | Duration | Easing |
| --- | --- | --- |
| Tile select (badge scale 0.8 → 1) | 160ms | `cubic-bezier(0.2,0.8,0.2,1)` |
| Row add / remove | 180ms | `ease-out` / `ease-in` |
| Summary total count | 260ms | `ease-out` |
| Commit success (tiles fade to the mortgaged treatment) | 320ms | `ease-out` |

## 11. Acceptance criteria

1. Only your unmortgaged, building-free tiles are selectable.
2. Selection badges number in tap order and renumber on deselect.
3. The detail card shows the five keys in §3 for the last tapped tile.
4. The summary shows `bank pays you`, `for <n> properties`, `Interest total` and `Redeem total`,
   computed with the formulas in §4.
5. `Mortgage` is disabled with nothing selected.
6. Committing sends one atomic action for the whole selection.
7. A selection that breaks a colour set shows the warning before committing.
8. Tapping a tile with buildings, or an already-mortgaged tile, toasts the documented reason.
9. Raise-cash mode shows the target and remaining amount and retitles the commit button.
10. Cancel discards the selection without a confirm.
