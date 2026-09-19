# 1o · Bankrupt outcome

> Generated from `Royal Navy 1080 v2.dc.html` — option 1o, screens "Bankrupt — to creditor", "Bankrupt — to auction" (Session 9 export) · 19 September 2026.

## 1. Purpose and navigation position

The card every player sees when someone goes bankrupt. Not a route — a board-centre card over the
HUD (`1c`), the same surface as the notification cards in `1n`. Fired by the server after a
bankruptcy resolves. Two variants: to a creditor, and to the bank.

## 2. Layout map

```
┌ HUD behind ─────────────────────────────────────┐
│ Friday Night · Round 12 · 4 players             │
│ ┌ card · board centre · radius 20 · padding 14 ┐ │
│ │ BANKRUPT                     round 12         ││
│ │ [ illustration slot ]                         ││
│ │   toppled token  /  gavel over a deed         ││
│ │ Karthik is out                                ││
│ │ round 12 · bankrupt to Naveen                 ││
│ │           / round 12 · bankrupt to the bank   ││
│ │ 12 tiles → Naveen                             ││
│ │           / 12 tiles → bank auction           ││
│ │ "Houses are sold to the bank first. Mortgages ││
│ │  transfer with the deeds."                    ││
│ │           / "Auctions begin next round."      ││
│ └────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────┘
```

## 3. Element inventory

| # | Element | Component | Tokens |
| --- | --- | --- | --- |
| 1 | Scrim | `Scrim` | inset 0, `rgba(5,15,40,.5)`; the HUD stays visible beneath |
| 2 | Card | `Card.elevated` | max width 300, radius 20, padding 14, gap 11, centred on the board; bg `linear-gradient(180deg,#17489F,#123B88)`, border 1dp `rgba(255,107,122,.4)`, shadow `0 18px 44px rgba(4,12,32,.55)` |
| 3 | Kicker | `Text` | `800 11px` `.14em` `#FF9A93` = `BANKRUPT` |
| 4 | Round chip | `Text` | `600 11px` `rgba(198,220,255,0.8)` = `round <n>`, right of the kicker |
| 5 | Illustration slot | `ImageSlot` | 120×90, radius 14, dashed 1dp `rgba(126,180,255,.45)`; caption `600 11px` `rgba(198,220,255,0.75)` = `illustration · toppled token` / `illustration · gavel over a deed` |
| 6 | Headline | `Text` | `800 19px` `#FFFFFF` = `<name> is out` |
| 7 | Sub-line | `Text` | `600 12px` `rgba(198,220,255,0.8)` = `round <n> · bankrupt to <creditor>` / `round <n> · bankrupt to the bank` |
| 8 | Transfer line | `Text` | `700 14px` `#FFC84A` = `<n> tiles → <creditor>` / `<n> tiles → bank auction` |
| 9 | Explainer | `Text` | `600 12px` `rgba(198,220,255,0.8)` — to creditor: `Houses are sold to the bank first. Mortgages transfer with the deeds.`; to auction: `Auctions begin next round.` |

The card carries **no buttons** — it is an event card, dismissed by tapping outside or by its
timer, like the other non-decision cards in `1n`.

## 4. Variants

| Variant | Fired when | Transfer line | Explainer |
| --- | --- | --- | --- |
| To creditor | The debt was owed to another player | `<n> tiles → <name>` | `Houses are sold to the bank first. Mortgages transfer with the deeds.` |
| To bank auction | The debt was owed to the bank (tax, fine, card effect, auction win) | `<n> tiles → bank auction` | `Auctions begin next round.` |

The resolution order itself is in `1d` §5 and `docs/05-game-rules.md` § Bankruptcy. This card
reports it; it never decides it.

## 5. States

| State | Behaviour |
| --- | --- |
| default | As drawn, 6000ms auto-dismiss (longer than a standard event card — it is a match-changing event) |
| you are the bankrupt player | You do not see this card; you go straight to `1g`, and the card plays for everyone else |
| you are the creditor | The headline gains a `700 11px` `#7ADB25` `to you` chip and the transfer line reads `<n> tiles → you` |
| no tiles | The transfer line is omitted; the explainer becomes `They had no property left.` |
| bank auction queued | The auction opens at the start of the next round, in slot order; each lot runs through `1t` |
| event cards off | With Settings → Event cards set to `Off`, the card is suppressed; the match-log line is still written and a toast reports it |
| decisions only | This card is **not** a decision, so `Decisions only` also suppresses it — the log line and toast remain |
| spectating | Shown, identically |
| reconnecting | Suppressed; on resync the player sees only the match-log line |
| last player standing | The card plays, then the match ends and every client moves to `2b` after its dismissal |

## 6. Interactions

| Trigger | Result |
| --- | --- |
| Tap outside | dismiss immediately |
| Auto-dismiss | at 6000ms |
| Tap the card | no-op — there is nothing to act on |
| Android back | dismiss |

No action can be taken from this card. Every consequence has already been applied server-side
before it appears.

## 7. Data contract

Subscribes to `match:event { type: 'bankruptcy', playerId, creditorId | 'bank', round, tilesTransferred }`.
Emits nothing. The bank-auction lots arrive later as a normal `auction:state`.

## 8. Responsive

- Phones: card 300dp max, centred over the board.
- Tablet: 360dp max.
- Landscape: the card stays centred and never exceeds 70% height.
- Font scale 130%: the headline drops to 17dp; the illustration slot shrinks to 100×76 first.

## 9. Accessibility

- The card is `accessibilityLiveRegion="assertive"` and announces
  `Karthik is out, round 12, bankrupt to Naveen, 12 tiles transferred`.
- It is not focus-trapping — play continues behind it and a screen-reader user can move past it.
- The illustration slot is decorative.
- Contrast: `#FF9A93` on card = 5.4:1 at 11dp bold (kicker, non-body); `#FFC84A` = 7.5:1 — pass.

## 10. Animation

| What | Duration | Easing |
| --- | --- | --- |
| Present (scale 0.92 → 1, scrim fade) | 280ms | `cubic-bezier(0.2,0.8,0.2,1)` |
| Token topple on the board (rotate 0 → 24°, fade) | 400ms | `ease-in` |
| Tile ownership pips changing colour | 500ms, 30ms stagger | `ease-out` |
| Dismiss | 200ms fade | `ease-in` |

## 11. Acceptance criteria

1. The card appears for every player except the bankrupt one, who goes to `1g`.
2. The kicker reads `BANKRUPT` with the round number beside it.
3. The headline reads `<name> is out` and the sub-line names the creditor, or the bank.
4. The transfer line states the tile count and destination, using `bank auction` for bank debts.
5. The explainer copy matches §4 verbatim for each variant.
6. The creditor's own view marks the transfer as `to you`.
7. The card has no buttons and auto-dismisses at 6000ms.
8. Ownership changes are already applied on the board behind the card.
9. `Off` and `Decisions only` event-card settings both suppress the card but keep the log line.
10. A bankruptcy to the bank queues its lots for the start of the next round.
