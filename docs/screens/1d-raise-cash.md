# 1d · Raise cash

> Generated from `Royal Navy 1080 v2.dc.html` — option 1d, screens "Raise cash / mortgage", "Raise cash / sell", "Raise cash / trade" (Session 9 export) · 19 September 2026.

## 1. Purpose and navigation position

The forced-liquidation flow: you owe more than you hold. Route
`/match/[matchId]/raise-cash?route=mortgage|sell|trade&debtId=`, guarded by `owes > cash`. It opens
itself when a debt cannot be paid and is **blocking** — Android back does nothing and there is no
exit until the debt is paid or bankruptcy is declared.

## 2. Layout map

One shell, three routes. Only the middle section changes.

```
┌──────────────────────────────────────────────────┐
│ Raise cash                                       │
│ Round 12 · mortgage tiles / sell buildings /     │
│            accept an offer                       │
│ [ Mortgage | Sell | Trade ]  route switch        │
│ ┌ board · route-appropriate tiles selectable ─┐  │
│ │ badges ① ②                                   │ │
│ └───────────────────────────────────────────────┘│
│ ── MORTGAGING / SELLING / TRADING ────────────   │
│ ① Park Place                        ₹ 400        │
│ ② Marina Rd                         ₹ 350        │
│ ┌ detail ─────────────────────────────────────┐  │
│ │ Marina Rd                                    │ │
│ │ Method     Mortgage    Bank pays  ₹ 350      │ │
│ │ Rent lost  ₹ 28        Redeem     ₹ 385      │ │
│ │ Raises     ₹ 350                             │ │
│ └───────────────────────────────────────────────┘│
│ ── HEADROOM ──────────────────────────────────   │
│ Mortgage ₹ 750 · Sell ₹ 350 · Trade ₹ 600        │
│ All routes                          ₹ 1,700      │
│ ── DEBT ──────────────────────────────────────   │
│ Pay to        Karthik                            │
│ Cash I have   ₹ 640                              │
│ Raised now    ₹ 750                              │
│ TOTAL TO GIVE ₹ 1,200                            │
│ [ Cancel ]                 [ Pay ₹ 1,200 ]       │
│ [ Declare bankruptcy ]                           │
│ "Karthik receives your cash and title deeds"     │
└──────────────────────────────────────────────────┘
```

## 3. Element inventory

| # | Element | Component | Tokens |
| --- | --- | --- | --- |
| 1 | Header | `Row` | title `700 19px` `#FFFFFF` = `Raise cash`; subtitle `600 12px` `rgba(198,220,255,0.8)` = `Round <n> · <route subtitle>` |
| 2 | Route switch | `Segmented` | three halves `Mortgage`, `Sell`, `Trade`; active bg `rgba(95,192,255,.16)` text `#5FC0FF` |
| 3 | Board | `BoardView.select` | selectable set depends on the route: unmortgaged building-free tiles (mortgage), tiles with buildings or sellable deeds (sell), your tradeable tiles (trade) |
| 4 | Selection badge | `Badge` | 18dp, bg `#FFC84A`, `800 11px` `#3A2402` |
| 5 | Section label | `SectionLabel` | `800 11px` `.12em`; copies `MORTGAGING`, `SELLING`, `TRADING`, `HEADROOM`, `DEBT` |
| 6 | Pick row | `Row` ×n | badge + name `700 14px` `#FFFFFF`; amount raised `800 14px` `#FFC84A` |
| 7 | Detail card | `Card` | name `800 17px` `#FFFFFF`; five key/value pairs, keys `600 11px` `rgba(198,220,255,0.8)`, values `800 13px` `#FFC84A` — keys per route in §4 |
| 8 | Headroom card | `Card` | three key/value pairs `Mortgage`, `Sell`, `Trade`; total row key `600 12px` = `All routes`, value `800 17px` `#FFC84A` |
| 9 | Debt card | `Card.accent` | border 1dp `rgba(255,107,122,.4)`, fill `rgba(255,107,122,.09)`; rows `Pay to` (value `700 15px` `#FFFFFF`), `Cash I have`, `Raised now` (values `800 15px` `#FFC84A`); total key `800 11px` `.12em` = `TOTAL TO GIVE`, value `800 22px` `#FFC84A` |
| 10 | Cancel | `Button.ghost` | `flex:1`, min-height 44, radius 16 — **discards the current selection only**, it does not leave the screen |
| 11 | Pay | `Button.primaryGold` | `flex:1.4`, height 50, radius 16, `800 16px` `#3A2402` = `Pay ₹<n>`; disabled until `cash + raised ≥ debt` |
| 12 | Declare bankruptcy | `Button.danger` | full width, min-height 44, radius 16, bg `rgba(240,82,74,.14)`, border 1dp `rgba(240,82,74,.6)`, `700 15px` `#FF9A93` |
| 13 | Bankruptcy note | `Text` | `600 12px` `rgba(198,220,255,0.8)` = `<creditor> receives your cash and title deeds` — `The bank receives your cash and title deeds` for a bank debt |

## 4. The three routes

| Route | Subtitle | Section | Detail keys | Notes |
| --- | --- | --- | --- | --- |
| Mortgage | `mortgage tiles` | `MORTGAGING` | `Method` (`Mortgage`) · `Bank pays` · `Rent lost` · `Redeem` · `Raises` | Same maths as `1q` |
| Sell | `sell buildings` | `SELLING` | `Method` (`Sell <n> houses`) · `Bank pays` · `Rent` · `Set held` (`kept` / `broken`) · `Raises` | Same maths as `1w` |
| Trade | `accept an offer` | `TRADING` | `With` · `She pays` / `They pay` · `You give` · `Set held` (`kept` / `broken`) · `Raises` | Lists standing offers from other players; you accept rather than compose |

`Set held` warns when a step breaks a colour set, in `#FFC84A` when `broken`.

Headroom is computed across all three routes at once, so the player can see whether the debt is
payable at all before committing to a route: `All routes` is the sum of the maximum each route
could raise, ignoring overlap between routes for the same tile.

## 5. Bankruptcy resolution (authoritative)

From `docs/05-game-rules.md` § Bankruptcy, in this order:

1. All buildings owned by the bankrupt player are sold to the bank at their sell-back rates; the
   cash joins their balance.
2. Cash is transferred to the creditor (or the bank).
3. Title deeds transfer to the creditor **with their mortgages intact**; to the bank they go to a
   bank auction instead (`1o`).
4. Hold cards marked tradeable transfer with the deeds; non-tradeable cards are discarded.
5. The player is eliminated and moved to `1g`.

## 6. States

| State | Behaviour |
| --- | --- |
| short | `Pay` disabled; the debt card's total is `#FF9A93` and a line reads `₹<n> short.` |
| covered | `Pay` enabled; the shortfall line is replaced by `Enough raised.` in `#7ADB25` |
| route empty | That route's tab shows `₹0` headroom and its panel reads `Nothing to <route> here.` |
| no route can cover it | All three headroom values shown, a `600 12px` `#FF9A93` line reads `Even all routes together fall ₹<n> short.`, and `Declare bankruptcy` becomes the primary-weight action |
| offer expired (trade route) | The row disappears with a 180ms collapse and a toast `That offer expired.` |
| committing | The acting button spins; the board locks |
| error | Rollback with the error toast; selections are preserved |
| timer | The board's turn timer does **not** run during raise cash; the debt has no clock (see `docs/OPEN-QUESTIONS.md` if a deadline is later wanted) |
| local modes | Identical |
| spectating | Not reachable — the flow is private to the debtor |

## 7. Interactions

| Trigger | Validation | Emits | Result |
| --- | --- | --- | --- |
| Route switch | — | — | change the selectable set and the section; selections on other routes are kept |
| Tap a tile / offer | route-valid | — | add to the picks, show its detail, increase `Raised now` |
| Tap a pick row | — | — | remove it |
| `Cancel` | — | — | clear the current route's picks; the screen stays open |
| `Pay ₹<n>` | `cash + raised ≥ debt` | `match:action { type: 'settleDebt', debtId, steps }` | execute every queued step and the payment atomically, then close the screen |
| `Declare bankruptcy` | — | `match:action { type: 'declareBankruptcy', debtId }` | confirm `Declare bankruptcy?` / `<creditor> receives your cash and title deeds. This can't be undone.` / `Cancel`, `Declare`; then `1o` plays for everyone and you land on `1g` |
| Android back | — | — | no-op |

## 8. Data contract

Reads the debt (`{ debtId, amount, creditorId | 'bank' }`), your holdings, buildings, mortgages,
standing trade offers and the board's rates. Emits one atomic `settleDebt` carrying every step, or
`declareBankruptcy`. The server revalidates the whole bundle before applying.

## 9. Responsive

- 360dp as designed; picks and detail scroll, headroom, debt and actions are pinned.
- Tablet: board left, panel right with the debt card always visible.
- Landscape: same split.
- Font scale 130%: the debt total drops to 19dp; headroom values stack.

## 10. Accessibility

- The screen announces on entry: `You owe Karthik 1,200 rupees. Raise cash or declare bankruptcy.`
- The debt card is a polite live region; `Raised now` and the shortfall re-announce on every change.
- `Declare bankruptcy` is the last focus stop and its confirm dialog traps focus.
- Route tabs announce their headroom: `Mortgage, can raise 750 rupees`.
- Contrast: `#FF9A93` on the debt tint = 5.6:1; `#FFC84A` = 7.2:1 — pass.

## 11. Animation

| What | Duration | Easing |
| --- | --- | --- |
| Route switch (panel cross-fade) | 180ms | `ease-out` |
| Pick add / remove | 180ms | `ease-out` / `ease-in` |
| `Raised now` count | 260ms | `ease-out` |
| Covered state (total colour tween + green line) | 200ms | `ease-out` |
| Pay success (debt card collapses) | 320ms | `ease-in` |

## 12. Acceptance criteria

1. The screen opens automatically whenever a debt exceeds available cash, and cannot be dismissed.
2. Three routes are always available as tabs, each showing its own headroom.
3. `All routes` shows the combined maximum so the player knows whether the debt is payable.
4. Detail keys match §4 for each route, including the `Set held` warning.
5. `Pay` is disabled until cash plus raised meets the debt, and states the shortfall until then.
6. `Cancel` clears the current route's picks without leaving the screen.
7. Paying executes every queued step and the payment atomically.
8. `Declare bankruptcy` confirms first and names the creditor.
9. Bankruptcy resolves in the documented order: buildings sold, cash transferred, deeds
   transferred with mortgages, tradeable cards transferred, player eliminated.
10. A bank debt sends the deeds to a bank auction instead of a creditor.
11. The turn timer does not run while this screen is open.
12. Android back does nothing.
