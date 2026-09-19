# 1p · Deal (trade)

> Generated from `Royal Navy 1080 v2.dc.html` — option 1p, screen "Deal" (Session 9 export) · 19 September 2026.

## 1. Purpose and navigation position

Two-sided trade: tiles and cash in both directions. Route `/match/[matchId]/trade`, optionally with
`withPlayerId`, pushed from the actions sheet (`1v`) and from raise cash (`1d`). Back returns to the
caller with nothing sent.

## 2. Layout map

```
┌──────────────────────────────────────────────────┐
│ Deal                                             │
│ Round 12 · tap tiles to select                   │
│ [ Me | Player 4 ]  side switch                   │
│ ┌ board · both sides' tiles selectable ───────┐  │
│ │ your picks badge ①②, theirs badge ①②         │ │
│ │ (GO · CHEST · JAIL · GO TO)                  │ │
│ └───────────────────────────────────────────────┘│
│ deal with              [ Player 4  ▾ ]           │
│ ── THEIR PROPERTIES ──────────────────────────   │
│ ① Reading RR                                     │
│ ② Boardwalk                                      │
│ ┌ detail · last tapped tile ──────────────────┐  │
│ │ Reading RR                        [mine /   │ │
│ │                                  Player 4]  │ │
│ │ Rent         ₹ 25    Owned lines      2     │ │
│ │ Houses       —       Mortgage     ₹ 100     │ │
│ │ Value      ₹ 1,100                          │ │
│ └───────────────────────────────────────────────┘│
│ ── DEAL SUMMARY ──────────── 4 tiles selected ─  │
│ YOU GIVE · 2         YOU GET · 2                 │
│ Land   ₹ 2,300       Land   ₹ 2,050              │
│ Cash   ₹   500       Cash   ₹     0              │
│ Total  ₹ 2,800       Total  ₹ 2,050              │
│ [ Cancel ]                     [ Deal ]          │
└──────────────────────────────────────────────────┘
```

## 3. Element inventory

| # | Element | Component | Tokens |
| --- | --- | --- | --- |
| 1 | Header | `Row` | title `700 19px` `#FFFFFF` = `Deal`; subtitle `600 12px` `rgba(198,220,255,0.8)` = `Round <n> · tap tiles to select` |
| 2 | Side switch | `Segmented` | two halves `Me`, `<their name>`; active bg `rgba(95,192,255,.16)` text `#5FC0FF` — it filters which side's tiles the board offers |
| 3 | Board | `BoardView.select` | aspect 1:1; tiles of the active side are selectable, the rest 45% opacity |
| 4 | Selection badge | `Badge` | 18dp; your picks `#5FC0FF` with `#04203B` numerals, theirs `#FFC84A` with `#3A2402` numerals |
| 5 | Partner picker | `Select` | label `600 12px` `rgba(198,220,255,0.8)` = `deal with`; value `700 15px` `#FFFFFF` with `ph-caret-down` 14dp; lists active players only |
| 6 | Section label | `SectionLabel` | `800 11px` `.12em`; copies `THEIR PROPERTIES`, `YOUR PROPERTIES`, `DEAL SUMMARY` |
| 7 | Selected row | `Row` ×n | badge + name `700 14px` `#FFFFFF`; tap to deselect |
| 8 | Detail card | `Card` | name `800 17px` `#FFFFFF`; ownership chip `700 11px` — `mine` on `rgba(95,192,255,.18)` / `<name>` on `rgba(255,200,74,.18)`; five key/value pairs — keys `600 11px` `rgba(198,220,255,0.8)`, values `800 13px` `#FFC84A` |
| 9 | Cash stepper | `MoneyInput` ×2 | one per side, height 46, radius 14, `800 15px` `#FFC84A`, clamped to that side's cash |
| 10 | Summary column | `Card` ×2 | header `800 11px` `.12em` — `YOU GIVE · <n>` / `YOU GET · <n>`; three rows `Land`, `Cash`, `Total` — keys `600 12px` `rgba(198,220,255,0.8)`, values `800 15px` `#FFC84A`; `Total` in `800 17px` |
| 11 | Selection count | `Text` | `600 12px` `rgba(198,220,255,0.8)` = `<n> tiles selected` |
| 12 | Cancel | `Button.ghost` | `flex:1`, min-height 44, radius 16 |
| 13 | Send | `Button.primaryGold` | `flex:1.4`, height 50, radius 16, `800 16px` `#3A2402` = `Deal` |

### Detail keys (exact, in order)

`Rent` · `Owned lines` · `Houses` · `Mortgage` · `Value`

## 4. What can be traded

| Tradeable | Not tradeable |
| --- | --- |
| Unmortgaged tiles | Tiles whose colour group carries buildings (sell them first) |
| Mortgaged tiles — the receiver inherits the mortgage and the redeem cost | Buildings themselves |
| Cash, either direction, up to each side's balance | Cards marked `Tradeable: No` in the rule editor (`1z`) |
| Hold cards marked `Tradeable: Yes` | A player's turn, position or jail status |

A deal must move at least one item in total; a deal of cash for nothing is allowed in one direction
(a gift) but a wholly empty deal is refused.

## 5. States

| State | Behaviour |
| --- | --- |
| no partner chosen | The board is inert and a `600 13px` `rgba(198,220,255,0.8)` line reads `Pick a player to deal with.`; `Deal` disabled |
| empty deal | `Deal` disabled with the hint `Add something to the deal.` |
| building blocks a tile | The tile is inert; tapping toasts `Sell the buildings on this group first.` |
| cash over balance | The money input clamps and flashes its border `#FF9A93` for 240ms |
| sent | The screen pops; a `600 12px` `#5FC0FF` status chip appears on the HUD: `Deal sent to <name> · <n>s`, counting down the board's trade expiry (60s by default) |
| incoming deal | The recipient gets a notification card (`1n`) with the same summary columns and `Accept` / `Decline`; accepting applies atomically |
| expired | Both sides get the toast `Deal expired.` and a match-log line |
| countered | Declining offers `Counter` — it reopens this screen with the sides swapped and the terms preloaded |
| trading off | The screen is unreachable; the actions row reads `Trading is off on this board.` |
| committing | `Deal` shows a spinner; the board locks |
| error | Rollback with the error toast; the selection is preserved |
| raise-cash mode | Only deals that increase your cash can be sent; the header shows `Raise ₹<n>` |

## 6. Interactions

| Trigger | Validation | Emits | Result |
| --- | --- | --- | --- |
| Side switch | — | — | change which side's tiles the board offers |
| Partner picker | active players only | — | set the counterparty; selections on the previous partner's side are cleared with a confirm |
| Tap a tile | belongs to the active side, tradeable | — | select and show its detail |
| Tap a selected tile or row | — | — | deselect and renumber |
| Cash input | 0 ≤ value ≤ that side's cash | — | update the summary live |
| `Deal` | ≥ 1 item total, both sides valid | `match:action { type: 'tradeOffer', give, get, withPlayerId }` | pop back, show the pending chip |
| `Cancel` / Android back | — | — | pop back, discarding the deal |

## 7. Data contract

Reads both sides' holdings, buildings, mortgages and cash from the match snapshot — the partner's
cash is public. Emits `tradeOffer`; the recipient emits `tradeResponse { accept }`. The server
validates both sides again before applying and pushes one `match:state`.

## 8. Responsive

- 360dp as designed; the two summary columns sit side by side and never stack on phones.
- Tablet: board left, everything else right.
- Landscape: same split.
- Font scale 130%: summary values drop to 15dp before the columns would wrap; detail pairs stack.

## 9. Accessibility

- The side switch is a `tablist`; changing it announces `Showing Player 4's tiles`.
- Tiles announce their side: `Reading RR, Player 4's, value 1,100 rupees, double tap to add`.
- The summary is a polite live region announcing both totals after every change.
- The pending-deal chip on the HUD is announced once when it appears.
- Contrast: `#FFC84A` on card = 7.5:1; badges `#04203B` on `#5FC0FF` = 8.1:1 — pass.

## 10. Animation

| What | Duration | Easing |
| --- | --- | --- |
| Tile select badge | 160ms scale 0.8 → 1 | `cubic-bezier(0.2,0.8,0.2,1)` |
| Summary total count | 260ms | `ease-out` |
| Side switch (board fade) | 180ms | `ease-out` |
| Cash clamp flash | 240ms | `ease-in-out` |
| Send (columns converge and fade) | 320ms | `ease-in` |

## 11. Acceptance criteria

1. The side switch filters which player's tiles the board offers, with distinct badge colours.
2. The partner picker lists active players only and clears selections on change, after confirming.
3. The detail card shows the five keys in §3 and states whose tile it is.
4. Both summary columns show `Land`, `Cash` and `Total`, with the item count in their headers.
5. Cash inputs clamp to each side's real balance.
6. A deal must contain at least one item; an empty deal cannot be sent.
7. Tiles in a group with buildings cannot be traded and say why.
8. Mortgaged tiles can be traded and carry their mortgage to the receiver.
9. Sending shows a pending chip with the board's trade expiry counting down, and expiry toasts both
   sides.
10. Accepting applies the whole deal atomically; the server revalidates before applying.
