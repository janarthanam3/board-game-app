# 1r · Redeem

> Generated from `Royal Navy 1080 v2.dc.html` — option 1r, screen "Redeem" (Session 9 export) · 19 September 2026.

## 1. Purpose and navigation position

Clear mortgages by paying the bank back with interest. Route `/match/[matchId]/redeem`, pushed from
the actions sheet (`1v`). Back returns to the sheet with nothing committed. This is the exact
inverse of `1q` and shares its layout.

## 2. Layout map

```
┌──────────────────────────────────────────────────┐
│ Redeem                                           │
│ Round 12 · tap tiles to redeem                   │
│ ┌ board · your mortgaged tiles selectable ────┐  │
│ │ selected tiles carry an order badge ① ②      │ │
│ └───────────────────────────────────────────────┘│
│ ── REDEEM ────────────────────────────────────   │
│ ① Park Place                                     │
│ ② Marina Rd                                      │
│ ┌ detail · last tapped tile ──────────────────┐  │
│ │ Marina Rd                                    │ │
│ │ Rent restored  ₹ 28    Redeem cost   ₹ 770   │ │
│ │ Houses         —       Interest      ₹ 70    │ │
│ │ Value          ₹ 1,150                       │ │
│ └───────────────────────────────────────────────┘│
│ ── REDEEM SUMMARY ────────────────────────────   │
│ you pay bank               ₹ 1,375               │
│ to redeem 2 properties                           │
│ Interest paid              ₹ 125                 │
│ [ Cancel ]                 [ Redeem ]            │
└──────────────────────────────────────────────────┘
```

## 3. Element inventory

Identical component set to `1q`, with these differences:

| # | Element | Difference |
| --- | --- | --- |
| 1 | Header | title `Redeem`; subtitle `Round <n> · tap tiles to redeem` |
| 2 | Board | only your **mortgaged** tiles are selectable; unmortgaged tiles are 45% opacity and inert |
| 4 | Section labels | `REDEEM`, `REDEEM SUMMARY` |
| 6 | Detail keys | `Rent restored` · `Redeem cost` · `Houses` · `Interest` · `Value` |
| 7 | Summary | headline key `you pay bank`, value `800 22px` `#FFC84A`; caption `to redeem <n> properties`; one row `Interest paid` |
| 9 | Commit | label `Redeem` |

All tokens (card, badge, summary tint, buttons) are as documented in `1q` §3.

## 4. Money rules (authoritative)

```
redeemCost(tile) = mortgagePays(tile) + round(mortgagePays(tile) * board.interestRate)
```

Worked from the drawn example: `Marina Rd` pays `₹700` mortgaged, interest `₹70`, redeem cost
`₹770`. Two tiles total `₹1,375` with `₹125` interest.

Redeeming restores the tile's rent immediately. If the board's `Mortgage breaks the set` rule is on
and redeeming brings the group back to its threshold, set rent resumes on the whole group in the
same transaction.

## 5. States

| State | Behaviour |
| --- | --- |
| nothing selected | Summary `₹ 0` / `to redeem 0 properties`; `Redeem` disabled |
| selection affordable | As drawn |
| selection exceeds cash | The summary headline turns `#FF9A93`, a `600 12px` `#FF9A93` line reads `You're ₹<n> short.`, and `Redeem` is disabled — redeeming never puts a player into debt |
| set will be restored | A `600 12px` `#7ADB25` line above the actions: `This restores the <colour> set — rent doubles again.` |
| committing | `Redeem` shows an 18dp spinner; board and list lock |
| error | Rollback with the error toast; the selection is preserved |
| nothing mortgaged | Screen unreachable — the actions row is disabled with `Nothing is mortgaged.` |
| offline (local modes) | Identical |
| spectating / not your turn / bankrupt | Not reachable |

## 6. Interactions

| Trigger | Validation | Emits | Result |
| --- | --- | --- | --- |
| Tap a board tile | yours and mortgaged | — | select, append, show its detail |
| Tap a selected tile or row | — | — | deselect and renumber |
| Pinch / drag the board | zoom 100%–400% | — | zoom and pan |
| `Redeem` | ≥ 1 selected and the total ≤ your cash | `match:action { type: 'redeem', tiles }` | optimistic apply, pop back, toast `Redeemed <n> properties for ₹<n>.` |
| `Cancel` / Android back | — | — | pop back, discarding the selection |

## 7. Data contract

Reads mortgaged holdings, your cash and the board's interest rate from the match snapshot. Emits
one atomic `match:action` for the whole selection.

## 8. Responsive

As `1q` §8 — board left / panel right on tablet and landscape; summary and actions pinned on phones.

## 9. Accessibility

- Selectable tiles: `Marina Rd, mortgaged, redeem for 770 rupees, double tap to select`.
- The shortfall line is announced assertively as soon as it appears.
- The summary is a polite live region.
- Contrast: `#FF9A93` on the summary tint = 5.4:1 at 13dp bold; `#7ADB25` = 7.6:1 — pass.

## 10. Animation

As `1q` §10, plus: on commit, redeemed tiles lose the mortgaged treatment over 320ms and any
restored set pulses its colour bar once (400ms, `ease-out`).

## 11. Acceptance criteria

1. Only your mortgaged tiles are selectable.
2. The detail card shows the five keys in §3 in order, for the last tapped tile.
3. The summary shows `you pay bank`, `to redeem <n> properties` and `Interest paid`, computed with
   the formula in §4.
4. A selection costing more than your cash disables `Redeem` and states the shortfall.
5. Redeeming never puts a player into debt.
6. Restoring a colour set shows the green notice before committing and resumes set rent on commit.
7. The whole selection commits atomically.
8. Rent is restored on the redeemed tiles immediately.
9. Cancel discards without a confirm.
10. The screen is unreachable when nothing is mortgaged.
