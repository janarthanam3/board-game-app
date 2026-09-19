# 1t · Auction — bidding

> Generated from `Royal Navy 1080 v2.dc.html` — option 1t, screen "Auction - my bid" (Session 9 export) · 19 September 2026.

## 1. Purpose and navigation position

The live auction. Route `/match/[matchId]/auction` while `auction live` holds. Every eligible
bidder is taken here automatically when an auction opens — from `1s`, from a declined purchase, or
from a post-bankruptcy bank auction. It cannot be dismissed; it closes when the lot resolves.

## 2. Layout map

```
┌──────────────────────────────────────────────────┐
│ Auction                                          │
│ Round 12 · Boardwalk · 0:14 left                 │
│ ┌ board · the lot highlighted ────────────────┐  │
│ └───────────────────────────────────────────────┘│
│ ── BID HISTORY ──────────────────────── 0:14 ─   │
│ Player 2                          ₹ 420          │
│ me                                ₹ 400          │
│ Player 2                          ₹ 380          │
│ me                                ₹ 360          │
│ Player 4                          passed         │
│ ┌ detail ─────────────────────────────────────┐  │
│ │ Boardwalk                                    │ │
│ │ Cost      ₹ 400     Seller    Player 3       │ │
│ │ Houses    —         Rent       ₹ 50          │ │
│ │ Leading   ₹ 420                              │ │
│ └───────────────────────────────────────────────┘│
│ ── MY BID ────────────────────────────────────   │
│ [ − ]        ₹ 450        [ + ]                  │
│ [ +10 ] [ +50 ] [ +100 ]                         │
│ [ Pass ]              [ Raise ₹450 ]             │
└──────────────────────────────────────────────────┘
```

## 3. Element inventory

| # | Element | Component | Tokens |
| --- | --- | --- | --- |
| 1 | Header | `Row` | title `700 19px` `#FFFFFF` = `Auction`; subtitle `600 12px` `rgba(198,220,255,0.8)` = `Round <n> · <lot> · <m:ss> left` — the clock turns `#FF9A93` under 5 seconds |
| 2 | Board | `BoardView.readonly` | the lot's tile pulses a 2dp `#FFC84A` ring; no selection |
| 3 | Section label | `SectionLabel` | `800 11px` `.12em`; copies `BID HISTORY`, `MY BID`; the history label carries the clock `800 13px` right |
| 4 | History row | `Row` ×n | bidder `700 14px` — `me` in `#5FC0FF`, others `#FFFFFF`; amount `800 14px` `#FFC84A`, or `passed` in `600 13px` `rgba(198,220,255,0.8)`; newest at the top, scrolls |
| 5 | Detail card | `Card` | name `800 17px` `#FFFFFF`; five key/value pairs — keys `600 11px` `rgba(198,220,255,0.8)`, values `800 13px` `#FFC84A`; `Leading` value `800 15px` `#FFC84A` |
| 6 | Bid stepper | `Row` | `−` / `+` 44×44 radius 13 border 1dp `rgba(126,180,255,.34)`; amount `800 23px` `#FFFFFF` |
| 7 | Quick-raise chips | `ChipRow` | `+10`, `+50`, `+100` — radius 11, padding 5/10, `700 12px` `#5FC0FF` on `rgba(95,192,255,.18)`, border 1dp `rgba(95,192,255,.45)` |
| 8 | Pass | `Button.ghost` | `flex:1`, min-height 48, radius 16, `700 15px` `rgba(198,220,255,0.95)` = `Pass` |
| 9 | Raise | `Button.primaryGold` | `flex:1.4`, height 50, radius 16, `800 16px` `#3A2402` = `Raise ₹<n>` |

### Detail keys (exact, in order)

`Cost` · `Seller` · `Houses` · `Rent` · `Leading`

## 4. Auction mechanics (authoritative)

Mirrored from `docs/05-game-rules.md` § Auctions:

- Open ascending. Any eligible bidder may raise at any moment; there is no turn order.
- The minimum next bid is `leading + board.rules.auction.bidStep` (₹100 by default). The stepper's
  `−` clamps to that minimum; `+` adds one step.
- A bid **resets** the clock to the board's full bid timer.
- Passing is final for that lot — the row is fixed in the history and the bidder's controls become
  a disabled `Passed` chip.
- The lot resolves when the clock reaches zero, or when everyone but the leader has passed.
- No bids at all: the lot goes to the bank (or stays with the seller for a player-initiated lot)
  and a match-log line records it.
- You cannot bid above your cash. The `+` and quick-raise chips clamp to your balance and the
  affected chip dims.
- The seller cannot bid on their own lot.
- The winner pays immediately; if a card effect has left them short, the raise-cash flow (`1d`)
  opens with the auction debt as the target.

## 5. States

| State | Behaviour |
| --- | --- |
| bidding | As drawn |
| leading | Your last history row gains a `700 11px` `#7ADB25` `leading` chip and the raise button reads `Raise ₹<n>` against your own bid |
| passed | The stepper, chips and both buttons are replaced by a centred disabled chip `You passed` in `rgba(198,220,255,0.8)`; the history keeps updating |
| at your cash ceiling | `+` and the over-budget chips dim; a `600 12px` `#FFC84A` line reads `That's all your cash.` |
| clock under 5s | The header clock and the section clock turn `#FF9A93`; a 20ms haptic fires at 3, 2, 1 |
| outbid | The raise amount auto-advances to the new minimum and the button flashes its border once (240ms) |
| resolved (you won) | The panel is replaced for 2000ms by `Won for ₹<n>` in `800 22px` `#7ADB25`, then the next lot opens or the screen closes |
| resolved (someone else) | Same treatment: `<name> won for ₹<n>` in `#FFC84A` |
| no bids | `No bids — the bank keeps it.` for 2000ms |
| multi-lot | After each resolution the next lot opens with a fresh clock; the header lot name changes |
| spectating | Read-only: history and detail, no bid controls |
| reconnecting | `3k` covers the screen; on resync the auction state is taken whole and any missed lot is shown only in the log |
| not eligible | Non-bidders (the seller, bankrupt players) see the read-only view |

## 6. Interactions

| Trigger | Validation | Emits | Result |
| --- | --- | --- | --- |
| `−` / `+` | clamp to `leading + step` and to your cash | — | adjust the bid amount |
| `+10` / `+50` / `+100` | within your cash | — | add that amount to the current bid value |
| `Raise ₹<n>` | ≥ minimum, ≤ your cash, you have not passed | `auction:bid { amount }` | optimistic history row, clock resets on the server's confirmation |
| `Pass` | you have not passed | `auction:pass` | confirm-free; the row is appended and your controls lock |
| Android back | — | — | no-op — the auction is blocking |

## 7. Data contract

Subscribes: `auction:state` (`{ lot, leading, leader, history, secondsRemaining, bidders }`),
`auction:resolved` (`{ lot, winner, amount }`). Emits: `auction:bid`, `auction:pass`.
The clock is server-authoritative; the client renders `secondsRemaining` and never extends it
locally.

## 8. Responsive

- 360dp as designed; the bid history scrolls, the bid controls are pinned.
- Tablet: board left, history + detail + controls right.
- Landscape: same split; the quick-raise chips stay on one row.
- Font scale 130%: the bid amount drops to 19dp; the two action buttons keep 48dp.

## 9. Accessibility

- The clock is `accessibilityLiveRegion="assertive"` and announces at 10, 5, 3, 2, 1 seconds only.
- New bids are announced politely: `Player 2 bid 420 rupees`.
- The stepper is `accessibilityRole="adjustable"` with the value in rupees.
- `Pass` announces `, this is final`.
- Contrast: `#FFC84A` on card = 7.5:1; `#5FC0FF` for your own rows = 6.2:1 — pass.

## 10. Animation

| What | Duration | Easing |
| --- | --- | --- |
| New history row slide-in | 180ms | `ease-out` |
| Clock reset on a bid (ring flash) | 240ms | `ease-out` |
| Bid amount change | 120ms | `ease-out` |
| Outbid button border flash | 240ms | `ease-in-out` |
| Resolution panel | 300ms in, 2000ms hold, 300ms out | `cubic-bezier(0.2,0.8,0.2,1)` |

## 11. Acceptance criteria

1. The header shows the lot name and the remaining time, counting down from the server's value.
2. Bid history lists every bid and pass, newest first, with `me` marking your own rows.
3. The minimum next bid is the leading bid plus the board's bid step, enforced by the stepper.
4. Quick-raise chips add 10, 50 and 100 and clamp to your cash.
5. A bid resets the clock to the board's full bid timer.
6. Passing is final and locks your controls for that lot.
7. You can never bid above your cash, and the seller cannot bid on their own lot.
8. The lot resolves on zero, or when all but one bidder has passed, and the outcome is shown for
   two seconds before the next lot.
9. No bids sends the lot to the bank with a log line.
10. Android back does nothing while an auction is live.
11. A winner short of cash after the fact is routed into raise cash with the auction debt.
