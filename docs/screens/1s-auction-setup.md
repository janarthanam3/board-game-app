# 1s · Auction — setup

> Generated from `Royal Navy 1080 v2.dc.html` — option 1s, screen "Auction" (Session 9 export) · 19 September 2026.

## 1. Purpose and navigation position

Putting tiles up for open bidding. Route `/match/[matchId]/auction`, guarded by `auction live` for
the bidding view (`1t`); this setup view is reached from the actions sheet (`1v`) and from the
auction-live notification card. Back returns to the caller with nothing sent.

An auction also starts **automatically** when a player declines a purchase and the board's
`Auction on decline` rule is on — that path skips this screen and goes straight to `1t`.

## 2. Layout map

```
┌──────────────────────────────────────────────────┐
│ Auction                                          │
│ Round 12 · tap tiles to auction                  │
│ ┌ board · your tiles selectable ──────────────┐  │
│ │ selected tiles carry badges ① ②              │ │
│ └───────────────────────────────────────────────┘│
│ ── TO AUCTION ────────────────────────────────   │
│ ① Park Place                                     │
│ ② Marina Rd                       bid timer 30s  │
│ ┌ detail ─────────────────────────────────────┐  │
│ │ Marina Rd                                    │ │
│ │ Cost      ₹ 1,150    Min bid    ₹ 1,150      │ │
│ │ Houses    —          Rent          ₹ 28      │ │
│ │ Start at  ₹ 1,150                            │ │
│ └───────────────────────────────────────────────┘│
│ ── AUCTION SETUP ─────────────────────────────   │
│ starting price            ₹ 100                  │
│ from board rules                                 │
│ Bid timer                 30s                    │
│ Bidders                   5 players              │
│ [ Cancel ]                     [ Send ]          │
└──────────────────────────────────────────────────┘
```

## 3. Element inventory

| # | Element | Component | Tokens |
| --- | --- | --- | --- |
| 1 | Header | `Row` | title `700 19px` `#FFFFFF` = `Auction`; subtitle `600 12px` `rgba(198,220,255,0.8)` = `Round <n> · tap tiles to auction` |
| 2 | Board | `BoardView.select` | aspect 1:1; your unmortgaged, building-free tiles are selectable |
| 3 | Selection badge | `Badge` | 18dp, bg `#FFC84A`, `800 11px` `#3A2402` |
| 4 | Section label | `SectionLabel` | `800 11px` `.12em`; copies `TO AUCTION`, `AUCTION SETUP` |
| 5 | Lot row | `Row` ×n | badge + name `700 14px` `#FFFFFF`; the timer chip `600 12px` `rgba(198,220,255,0.8)` = `bid timer <n>s` sits right on the last row |
| 6 | Detail card | `Card` | name `800 17px` `#FFFFFF`; five key/value pairs — keys `600 11px` `rgba(198,220,255,0.8)`, values `800 13px` `#FFC84A` |
| 7 | Setup card | `Card` | `starting price` key `600 12px`, value `800 19px` `#FFC84A`; note `600 11px` `rgba(198,220,255,0.75)` = `from board rules`; rows `Bid timer` and `Bidders` — keys `600 12px`, values `700 13px` `#FFFFFF` |
| 8 | Cancel | `Button.ghost` | `flex:1`, min-height 44, radius 16 |
| 9 | Send | `Button.primaryGold` | `flex:1.4`, height 50, radius 16, `800 16px` `#3A2402` = `Send` |

### Detail keys (exact, in order)

`Cost` · `Min bid` · `Houses` · `Rent` · `Start at`

## 4. Auction parameters (authoritative)

Every value on the setup card comes from the board's rules and is **read-only here** (decision D1):

| Field | Source | Default |
| --- | --- | --- |
| `starting price` | `board.rules.auction.startPrice` | ₹100 |
| bid step | `board.rules.auction.bidStep` | ₹100 |
| `Bid timer` | `board.rules.auction.bidTimer` | 15s (30s on the drawn board) |
| `Bidders` | active players excluding the seller | — |

`Min bid` and `Start at` on a lot are `max(startPrice, 0)` for a bank lot, and the tile's cost for
a player-initiated lot, as drawn. Each lot is auctioned in badge order, one at a time.

## 5. States

| State | Behaviour |
| --- | --- |
| nothing selected | `Send` disabled; the setup card still shows the board's parameters |
| lots selected | As drawn |
| tile has buildings | Inert; tapping toasts `Sell the buildings on this group first.` |
| mortgaged tile | Selectable; the detail card adds `carries a ₹<n> mortgage` in `600 11px` `#FFC84A` and the winner inherits it |
| too few bidders | With fewer than two eligible bidders, `Send` is disabled with `Needs at least two bidders.` |
| auction already live | The screen is not reachable; the actions row routes straight to `1t` |
| auction off on this board | Not reachable; the actions row reads `Auctions are off on this board.` |
| sending | `Send` shows a spinner; the board locks |
| error | Rollback with the error toast; the selection is preserved |
| bank auction (post-bankruptcy) | The server opens these lots itself; no player sees this screen |
| not your turn / spectating | Not reachable |

## 6. Interactions

| Trigger | Validation | Emits | Result |
| --- | --- | --- | --- |
| Tap a board tile | yours, building-free | — | add as a lot, show its detail |
| Tap a lot row | — | — | remove and renumber |
| `Send` | ≥ 1 lot, ≥ 2 bidders | `match:action { type: 'auctionOpen', lots }` | every client opens `1t` on lot 1 |
| `Cancel` / Android back | — | — | discard and pop back |

## 7. Data contract

Reads your holdings, the board's auction rules and the active player list. Emits `auctionOpen`;
the server owns the auction clock and pushes `auction:state` to everyone.

## 8. Responsive

- 360dp as designed; lots and detail scroll, setup and actions pinned.
- Tablet: board left, panel right.
- Landscape: same split.
- Font scale 130%: detail pairs stack; the setup card grows.

## 9. Accessibility

- Selectable tiles: `Marina Rd, cost 1,150 rupees, double tap to add to the auction`.
- The setup card is read-only and announced as `Auction settings, from board rules`.
- Lot order is announced: `Lot 2, Marina Rd`.
- Contrast: `#FFC84A` on card = 7.5:1 — pass.

## 10. Animation

| What | Duration | Easing |
| --- | --- | --- |
| Lot add badge | 160ms scale 0.8 → 1 | `cubic-bezier(0.2,0.8,0.2,1)` |
| Lot remove | 180ms collapse | `ease-in` |
| Send (panel slides out, `1t` slides in) | 300ms | `cubic-bezier(0.2,0.8,0.2,1)` |

## 11. Acceptance criteria

1. Only your unmortgaged, building-free tiles can be added as lots.
2. Lots are numbered in tap order and auctioned in that order, one at a time.
3. The detail card shows the five keys in §3 for the last tapped lot.
4. The setup card shows starting price, bid timer and bidder count, all from the board, all
   read-only, with the `from board rules` note.
5. `Send` requires at least one lot and at least two eligible bidders.
6. A declined purchase with `Auction on decline` on opens `1t` directly, skipping this screen.
7. Mortgaged lots state the carried mortgage and transfer it to the winner.
8. The server owns the auction clock from the moment `Send` is pressed.
9. Cancel discards without a confirm.
10. The screen is unreachable when auctions are off on the board.
