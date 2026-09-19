# 1w · Sell

> Generated from `Royal Navy 1080 v2.dc.html` — option 1w, screen "Sell" (Session 9 export) · 19 September 2026.

## 1. Purpose and navigation position

Sell buildings, or a whole deed, back to the bank. Route `/match/[matchId]/sell`, pushed from the
actions sheet (`1v`) and from raise cash (`1d`). Back returns to the caller with nothing committed.
Layout mirrors `1u`.

## 2. Layout map

Frame height is fixed at **780dp**; the tile list inside the panel scrolls (`dv-scroll`).

```
┌──────────────────────────────────────────────────┐
│ Sell                                             │
│ Round 12 · tap my tiles to sell                  │
│ ┌ board · sellable tiles selectable ──────────┐  │
│ │ (GO · CHEST · JAIL · GO TO)                  │ │
│ └───────────────────────────────────────────────┘│
│ ── SELL FROM ─────────────────────────────────   │
│ ① Park Place                                     │
│ [ House  2 built  ₹ 150 ]                        │
│ [ Hotel  1 built  ₹ 375 ]                        │
│ [ Property  deed only  ₹ 700 ]                   │
│ "one property per sell"                          │
│ ┌ detail ─────────────────────────────────────┐  │
│ │ Park Place                                   │ │
│ │ Rent now    ₹ 175     Sell price   ₹ 150     │ │
│ │ Houses      2 → 1     Rent after    ₹ 70     │ │
│ │ You get     ₹ 150                            │ │
│ └───────────────────────────────────────────────┘│
│ ── SELL SUMMARY ──────────────────────────────   │
│ Houses     2            ₹ 300                    │
│ Hotels     1            ₹ 375                    │
│ Property   1            ₹ 700                    │
│ Bank pays you           ₹ 1,375                  │
│ [ Cancel ]                 [ Sell ]              │
└──────────────────────────────────────────────────┘
```

## 3. Element inventory

Same component set as `1u`, with these differences:

| # | Element | Difference |
| --- | --- | --- |
| 1 | Header | title `Sell`; subtitle `Round <n> · tap my tiles to sell` |
| 2 | Board | tiles you own that carry a building, or that can be sold as a deed, are selectable |
| 3 | Badge | bg `#FFC84A`, `800 11px` `#3A2402` |
| 4 | Section labels | `SELL FROM`, `SELL SUMMARY` |
| 6 | Sell-type buttons | **three** full-width rows, not two: `House <n> built ₹<n>`, `Hotel <n> built ₹<n>`, `Property deed only ₹<n>`; count `600 12px` `rgba(198,220,255,0.8)`, price `800 15px` `#FFC84A`; selected state uses gold tokens (`rgba(255,200,74,.45)` border, `rgba(255,200,74,.09)` fill) |
| 7 | Scope note | `600 12px` `rgba(198,220,255,0.75)` = `one property per sell` |
| 8 | Detail keys | `Rent now` · `Sell price` · `Houses` · `Rent after` · `You get` |
| 9 | Summary | three count rows `Houses`, `Hotels`, `Property`, then the total row key `Bank pays you`, value `800 22px` `#FFC84A` |
| 11 | Commit | label `Sell` |

The tile list inside `SELL FROM` uses `dv-scroll` with `overflow-y: auto`, so a long holding list
scrolls inside the panel while the summary and actions stay pinned.

## 4. Sell rules (authoritative)

From `docs/05-game-rules.md` § Selling, driven by each tile's own sell-back percentages (`1x`):

```
sellHouse(tile)    = round(houseCost(tile) * tile.sellHouseRate)     // 50% by default
sellHotel(tile)    = round(hotelCost(tile) * tile.sellHotelRate)     // 50% by default
sellProperty(tile) = round(tile.cost * tile.sellPropertyRate)        // 70% by default
```

- Buildings sell before the deed: `Property` is unavailable while any building stands on the tile,
  with the reason `Sell the buildings first.`
- **Even build**, when on, applies in reverse: a tile may not drop more than one below the lowest
  house count in its group.
- Selling a hotel returns it to the bank; when the board's `Hotel returns houses to the bank` rule
  is on, the hotel does **not** convert back into four houses on the tile — the tile drops to zero
  houses unless the player buys them again.
- A mortgaged tile can be sold as a deed; the bank deducts the redeem cost from the proceeds and
  the line `after clearing ₹<n> mortgage` appears under the summary total.

## 5. States

| State | Behaviour |
| --- | --- |
| nothing selected | Type rows and `Sell` disabled; summary `₹ 0` |
| building selected | As drawn |
| deed blocked | The `Property` row is disabled with `Sell the buildings first.` |
| even-build blocked | The offending tile is inert with `Build evenly — sell from <tile> first.` |
| mortgaged deed | The summary gains the mortgage-clearing line and a reduced total |
| queued steps | Steps accumulate in the summary; `Cancel` discards the whole queue |
| committing | `Sell` shows a spinner; board and controls lock |
| error | Rollback with the error toast; the queue is preserved |
| raise-cash mode | Header shows `Raise ₹<n> · ₹<m> to go`; the commit button reads `Sell & pay` and closes the debt when the target is met |
| nothing sellable | Screen unreachable — the actions row reads `Nothing to sell.` |
| not your turn / spectating / bankrupt | Not reachable |

## 6. Interactions

| Trigger | Validation | Emits | Result |
| --- | --- | --- | --- |
| Tap a board tile | yours and sellable | — | set the sell target, show its detail |
| `House` / `Hotel` / `Property` | type available | — | queue one step; the summary and detail update |
| Tap the target row | — | — | clear the target |
| Scroll the tile list | — | — | `dv-scroll` scrolls inside the panel only |
| `Sell` | ≥ 1 step queued | `match:action { type: 'sell', steps }` | apply atomically, pop back, toast `Sold for ₹<n>.` |
| `Cancel` / Android back | — | — | discard the queue and pop back |

## 7. Data contract

Reads holdings, buildings, mortgages and per-tile sell-back rates from the match snapshot. Emits
one atomic `match:action` for the queue; the server revalidates the even-build rule against the
final arrangement.

## 8. Responsive

- 360dp × 780dp as designed; the tile list is the only scroller inside the panel.
- Tablet: board left, controls right.
- Landscape: same split.
- Font scale 130%: the three type rows keep full width and grow; detail pairs stack.

## 9. Accessibility

- Sellable tiles: `Park Place, 2 houses, sell a house for 150 rupees`.
- Disabled type rows announce their reason.
- `Houses 2 → 1` is read as `Houses, two becoming one`.
- The summary is a polite live region; in raise-cash mode the remaining amount is announced on
  every change.
- Contrast: `#FFC84A` on card = 7.5:1 — pass.

## 10. Animation

| What | Duration | Easing |
| --- | --- | --- |
| Type row select | 140ms | `ease-out` |
| House pip removal | 200ms scale 1 → 0.6 + fade | `ease-in` |
| Hotel removal | 280ms | `ease-in` |
| Summary total count | 260ms | `ease-out` |
| Deed sale (tile loses its owner pip) | 320ms | `ease-out` |

## 11. Acceptance criteria

1. Three sell types render as full-width rows with their built counts and prices.
2. `Property` is unavailable while buildings stand on the tile, and says so.
3. The detail card shows the five keys in §3 with the `Houses` transition and `Rent after`.
4. Sell prices come from each tile's own sell-back rates, not a global value.
5. Even build, when on, blocks selling below the group's allowed spread.
6. Selling a mortgaged deed deducts the redeem cost and shows the clearing line.
7. The summary shows house, hotel and property counts plus `Bank pays you`.
8. The whole queue commits atomically.
9. Raise-cash mode shows the remaining target and closes the debt when it is met.
10. The frame is 780dp tall and the tile list scrolls inside the panel rather than the page.
