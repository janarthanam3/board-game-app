# 1n · Notification cards

> Generated from `Royal Navy 1080 v2.dc.html` — option 1n, "Notification cards — board-centre modal, seventeen events" (Session 9 export) · 19 September 2026.

## 1. Purpose and navigation position

One card component, seventeen events. Presented at the board centre over the HUD (`1c`). Not a
route. Informational cards close on a tap outside or on their timer; decision cards keep their
buttons and do not auto-close.

## 2. Layout map

```
┌ HUD behind, scrim rgba(5,15,40,.5) ─────────────┐
│ ┌ card · board centre · max 300 · radius 20 ───┐ │
│ │ KICKER                                        ││
│ │ [ illustration slot · 120×90 ]                ││
│ │ Title                            800/19       ││
│ │ subject                          600/12       ││
│ │ Amount                           800/22       ││
│ │ [ action ] [ action ] [ action ]   (decisions)││
│ │ "Tap outside or timer to close"  (info only)  ││
│ └────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────┘
```

## 3. Element inventory

| # | Element | Component | Tokens |
| --- | --- | --- | --- |
| 1 | Scrim | `Scrim` | inset 0, `rgba(5,15,40,.5)`; the HUD stays visible and the board keeps animating beneath |
| 2 | Card | `Card.elevated` | max width 300, radius 20, padding 14, gap 11, centred on the board; bg `linear-gradient(180deg,#17489F,#123B88)`, border 1dp `rgba(126,180,255,.45)`, shadow `0 18px 44px rgba(4,12,32,.55)` |
| 3 | Kicker | `Text` | `800 11px` `.14em`; colour per kind — money out `#FF9A93`, money in `#7ADB25`, neutral `#5FC0FF`, decision `#FFC84A` |
| 4 | Illustration slot | `ImageSlot` | 120×90, radius 14, dashed 1dp `rgba(126,180,255,.45)`; caption `600 11px` `rgba(198,220,255,0.75)` — the exact caption per event in §4 |
| 5 | Title | `Text` | `800 19px` `#FFFFFF` |
| 6 | Subject | `Text` | `600 12px` `rgba(198,220,255,0.8)` |
| 7 | Amount | `Text` | `800 22px` — `#FF9A93` for a debit (`− ₹`), `#7ADB25` for a credit (`+ ₹`), `#FFC84A` for a neutral figure |
| 8 | Action button | `Button` ×1–3 | min-height 44, radius 16, `flex:1`; the rightmost is `Button.primaryGold` (`800 15px` `#3A2402`), the others `Button.ghost` (`700 15px` `rgba(198,220,255,0.95)`) |
| 9 | Close hint | `Text` | `600 11px` `rgba(198,220,255,0.75)` = `Tap outside or timer to close` — informational cards only |

## 4. The seventeen events (verbatim)

| # | Kicker | Title | Subject | Amount | Illustration caption | Actions |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `RENT DUE` | `Park Place` | `owed to Karthik` | `₹1,200` | `illustration · landlord at the door` | `Raise cash` |
| 2 | `RENT PAID` | `Park Place` | `paid to Karthik` | `− ₹1,200` | `illustration · coins dropping into a hand, cartoon style` | — |
| 3 | `PROPERTY COST` | `Baltic Avenue` | `unowned` | `₹1,400` | `illustration · for-sale board on an empty plot, cartoon style` | `Pass` · `Auction` · `Buy` |
| 4 | `AUCTION LIVE` | `Boardwalk` | `Meera leads` | `₹2,600` | `illustration · gavel and raised bidder paddles, cartoon style` | `Skip` · `Join Auction` |
| 5 | `AUCTION WON` | `Boardwalk` | `won by Naveen` | `₹3,100` | `illustration · deed handed over with confetti, cartoon style` | — |
| 6 | `DEAL OFFER` | `Baltic + Oriental` | `from Player 2` | `+ ₹800` | `illustration · two players swapping deeds, cartoon style` | `Reject` · `Review` |
| 7 | `TRADE DONE` | `Baltic + Oriental` | `with Player 2` | `+ ₹800` | `illustration · handshake over the board, cartoon style` | — |
| 8 | `SENT TO JAIL` | `Jail` | `You` | `3 rounds` | `illustration · player behind jail bars looking out, cartoon style` | — |
| 9 | `IN JAIL` | `Jail` | `You · round 2 of 3` | `₹5,000` | `illustration · player sitting in the cell shaking dice, cartoon style` | `Roll` · `Jail Pass` · `Pay bail` |
| 10 | `CHANCE` | `Street repairs` | `You` | `− ₹2,300` | `illustration · question-mark card being flipped, cartoon style` | — |
| 11 | `COMMUNITY CHEST` | `Bank error in your favour` | `You` | `+ ₹1,500` | `illustration · open chest spilling coins, cartoon style` | — |
| 12 | `INCOME TAX` | `Income tax` | `You` | `₹1,800` | `illustration · tax officer with a long receipt, cartoon style` | — |
| 13 | `CLUB FEE` | `Club privilege` | `You` | `− ₹600` | `illustration · doorman at a club entrance, cartoon style` | — |
| 14 | `REST HOUSE` | `Rest house` | `You · 1 turn skipped` | `− ₹1,000` | `illustration · player asleep in a deck chair, cartoon style` | — |
| 15 | `START BONUS` | `Passed GO` | `You` | `+ ₹2,000` | `illustration · player crossing the GO corner, cartoon style` | — |
| 16 | `HOTEL BUILT` | `Park Place` | `You` | `₹1,500` | `illustration · four houses swapped for one hotel, cartoon style` | — |
| 17 | `BANKRUPT` | `Out of the match` | `Meera` | `₹0` | `illustration · player walking off with empty pockets, cartoon style` | — |

`RENT DUE` (1) shows `Raise cash` **only when the player cannot pay**; when they can, it carries no
action and is informational — the payment is automatic and card 2 follows.
Card 17 is the compact form; the fuller bankruptcy card is `1o`.

Illustrations are dashed slots in v1 — no artwork ships (see `docs/OPEN-QUESTIONS.md` Q-ART-01).

## 5. Decision cards versus informational cards

| Kind | Cards | Behaviour |
| --- | --- | --- |
| Decision | 1 (when short), 3, 4, 6, 9 | Buttons; **no** auto-dismiss; a tap outside does nothing; blocked until answered or the turn timer expires, at which point the default action applies (`docs/05-game-rules.md` § Turn timer expiry) |
| Informational | all the rest | Auto-dismiss at 3200ms (6000ms for bankruptcy); tap outside, swipe or back dismisses immediately; the close hint is shown |

The `Event cards` setting in `3f` filters these: `All` shows everything, `Decisions only` shows the
five decision cards, `Off` shows none. Suppressed cards still append their match-log line.

## 6. States

| State | Behaviour |
| --- | --- |
| queued | Cards queue and show one at a time in event order; a queue depth badge `+<n>` in `600 11px` `rgba(198,220,255,0.8)` sits at the card's top-right when more are waiting |
| decision pending | The primary action is enabled only when legal — `Buy` disables when you cannot afford it, `Pay bail` when you cannot afford bail, `Jail Pass` when you hold no pass |
| acting | The pressed button spins; the others disable |
| error | The card stays with an inline `600 12px` `#FF9A93` error line; the action can be retried |
| timer expiring on a decision | At 5 seconds a `600 11px` `#FF9A93` line reads `Defaulting in <n>s…` |
| someone else's event | Informational cards about other players are shown with their name as the subject; decision cards are only shown to the player who must decide |
| spectating | Informational public cards only |
| reconnecting | Cards are suppressed; missed events appear only in the log |
| offline (local modes) | Identical, with no timer unless the board sets one |

## 7. Interactions

| Trigger | Result |
| --- | --- |
| `Raise cash` | open `1d` with this debt as the target |
| `Buy` | `match:action { type: 'buy' }`; on success card 2's equivalent confirmation follows |
| `Pass` | decline; if `Auction on decline` is on, an auction opens (`1t`), otherwise the turn continues |
| `Auction` | open the tile to auction immediately |
| `Join Auction` / `Skip` | enter `1t`, or stay out of this lot |
| `Reject` / `Review` | decline the trade, or open `1p` preloaded with the offer |
| `Roll` / `Jail Pass` / `Pay bail` | the three jail exits, per the corner tile's rules (`1x` §4.3) |
| Tap outside / swipe / back | dismiss an informational card only |

## 8. Data contract

Subscribes to `match:event`; each event carries `{ kind, title, subject, amount, refs, decision? }`.
Decision cards emit `match:action`. The client renders from the event payload and never composes
the copy itself, so every player sees identical wording.

## 9. Responsive

- Phones: card 300dp max, centred on the board.
- Tablet: 360dp max.
- Landscape: card centred, capped at 70% height, scrolls internally; actions stay pinned.
- Font scale 130%: the amount drops to 19dp; three actions stack vertically, primary last.

## 10. Accessibility

- Informational cards are `accessibilityLiveRegion="polite"`; decision cards are
  `accessibilityViewIsModal` with focus on the title.
- Announcement pattern: `Rent due, Park Place, owed to Karthik, 1,200 rupees`.
- Amount sign is spoken (`minus 1,200 rupees`), never conveyed by colour alone.
- Auto-dismiss extends to 6000ms while a screen reader is active.
- The defaulting warning is announced assertively.
- Contrast: `#7ADB25` on card = 7.8:1; `#FF9A93` = 5.4:1 at 22dp bold — pass.

## 11. Animation

| What | Duration | Easing |
| --- | --- | --- |
| Present (scale 0.92 → 1 + scrim fade) | 260ms | `cubic-bezier(0.2,0.8,0.2,1)` |
| Dismiss | 200ms fade | `ease-in` |
| Queue advance (current out, next in) | 140ms + 260ms | `ease-in` / `cubic-bezier(0.2,0.8,0.2,1)` |
| Amount count-up | 320ms | `ease-out` |
| Decision default warning pulse | 800ms loop from 5s | `ease-in-out` |

## 12. Acceptance criteria

1. All seventeen events render through one component with the exact kickers, titles, subjects,
   amounts and illustration captions in §4.
2. Amount colour follows sign: credits green, debits red, neutral figures gold — and the sign is
   always in the text.
3. Decision cards (1 when short, 3, 4, 6, 9) keep their buttons and never auto-dismiss.
4. Informational cards auto-dismiss at 3200ms and show the close hint.
5. Cards queue and show one at a time, with a `+<n>` badge when more are waiting.
6. Illegal decision actions are disabled, not hidden.
7. A decision left unanswered at turn-timer expiry applies the rulebook's default.
8. The `Event cards` setting filters correctly and suppressed cards still append log lines.
9. Decision cards are shown only to the player who must decide.
10. Card copy comes from the server payload, identical for every client.
