# 1c · Play — the match HUD

> Generated from `Royal Navy 1080 v2.dc.html` — option 1c, screen "Play — board first" (Session 9 export) · 19 September 2026.

## 1. Purpose and navigation position

The match itself: board first, then the player strip, then the actor's own holdings. Route
`/match/[matchId]`, guarded by `member`. Reached from the lobby (`1b`), from `Resume` on `3c`, and
from pass-and-play / solo setup. Android back opens the pause sheet (`3i`) — it never leaves the
match. The HUD is replaced by `1g` when the local player goes bankrupt.

## 2. Layout map

Frame 360 × 780, padding 17, flex-column, gap 13.

```
┌──────────────────────────────────────────────────┐
│ Friday Night                            [Menu]   │
│ Round 12 · 6 players                             │
│ ┌ board · aspect 1:1 ─────────────────────────┐  │
│ │ GO · CHEST · JAIL · GO TO around the ring    │ │
│ │ "Pinch to zoom · drag to pan"                │ │
│ └───────────────────────────────────────────────┘│
│ Players                        Player 1's turn   │
│ ┌ horizontal strip · gap 8 ──────────────────┐   │
│ │ P1 ₹298 │ P2 ₹731 │ P3 ₹548 │ P4 ₹497 │ …  │  │
│ └──────────────────────────────────────────────┘ │
│ Cash ₹1,450        Net worth ₹3,210       [ OK ] │
│ My properties · 5        [ Cards | List ] [colour]│
│ ┌ dv-scroll · flex:1 · overflow-y auto ────────┐ │
│ │ CARDS VIEW: one property card at a time      │ │
│ │  [img] Marina Beach · light grey set         │ │
│ │        2 houses · 1 hotel built              │ │
│ │        cost ₹280      base rent ₹24          │ │
│ │        1 house ₹120   2 houses ₹360          │ │
│ │        3 houses ₹850  hotel rent ₹1,200      │ │
│ │        house cost ₹150 hotel cost ₹150       │ │
│ │        mortgage ₹140  rent now ₹1,200        │ │
│ │ LIST VIEW: Park Place cost ₹350              │ │
│ │            Boardwalk cost ₹400               │ │
│ │            Marina Beach cost ₹280            │ │
│ │            T. Nagar cost ₹200                │ │
│ │            Central Rail cost ₹200            │ │
│ │ "row tap → expand details · same data as     │ │
│ │  card view"                                  │ │
│ └───────────────────────────────────────────────┘│
└──────────────────────────────────────────────────┘
```

Board first, always. The player strip sits between the board and the actor's own panel; the
holdings region is the only scroller.

## 3. Element inventory

| # | Element | Component | Tokens |
| --- | --- | --- | --- |
| 1 | Frame | `ScreenFrame` | 360×780, padding 17, gap 13 | standard screen tokens |
| 2 | Match title | `Text` | `700 19px` `#FFFFFF` = match name |
| 3 | Match meta | `Text` | `600 12px` `rgba(198,220,255,0.8)` = `Round <n> · <m> players` |
| 4 | Menu button | `IconButton` | 39×39 radius 14, bg `rgba(8,26,64,.35)`, border 1dp `rgba(126,180,255,.28)`, `ph-list` 17dp `rgba(198,220,255,0.95)`, label `Menu` |
| 5 | Board | `BoardView` | aspect 1:1, radius 17, bg `rgba(8,26,64,.35)`, border 1dp `rgba(126,180,255,.28)`, `overflow:hidden` |
| 6 | Board tile | `BoardTile` | radius 8; colour bar 6dp in the set colour; name `700 7px`–`600 9px` by zoom; price `600 8px` `#FFC84A`; owner pip 8dp in the owner's seat colour; house pips 5dp `#7ADB25`, hotel pip 7dp `#FFC84A` |
| 7 | Corner tile | `BoardTile.corner` | labels `GO`, `CHEST`, `JAIL`, `GO TO` in `800 9px` `.14em` `rgba(198,220,255,0.8)` |
| 8 | Token | `PlayerToken` | 14dp circle in the seat colour, `inset 0 -2px 0 rgba(5,15,40,.3)` |
| 9 | Pan hint | `Text` | `600 10px` `rgba(198,220,255,0.75)` = `Pinch to zoom · drag to pan` |
| 10 | Players header | `Row` | `Players` `600 14px` `rgba(198,220,255,0.95)`; turn line `700 13px` `#FFC84A` = `<name>'s turn` |
| 11 | Player chip | `PlayerChip` | min 72×56, radius 13, card tokens; seat swatch 10dp; name `600 11px` `rgba(198,220,255,0.95)`; cash `800 13px` `#FFFFFF`; the active player's chip gains a 1dp `rgba(255,200,74,.45)` border and `rgba(255,200,74,.09)` fill |
| 12 | Cash / net worth | `Row` | keys `600 12px` `rgba(198,220,255,0.8)`; cash `800 17px` `#FFFFFF`; net worth `800 15px` `#FFC84A` |
| 13 | Primary action | `Button.primaryGold` | min 72 wide, height 44, radius 16, `800 16px` `#3A2402` — the label is the current turn action (`OK`, `Roll`, `Buy`, `End turn`; see §4) |
| 14 | Holdings header | `Row` | `My properties · <n>` `600 14px`; view segmented `Cards` / `List`; `colour` sort chip |
| 15 | Property card | `PropertyCard` | card tokens, radius 17, padding 12; art 44×44; name `800 17px` `#FFFFFF`; set line `600 12px` in the set colour; build line `600 12px` `#7ADB25` = `<n> houses · <n> hotel built`; ten-cell key/value grid — keys `600 11px` `rgba(198,220,255,0.8)`, values `800 13px` `#FFC84A`; `rent now` value `800 15px` `#FFC84A` |
| 16 | List row | `PropertyRow` | min-height 48; colour bar 4dp; name `700 15px` `#FFFFFF`; `cost ₹<n>` `600 12px` `rgba(198,220,255,0.8)` |
| 17 | List note | `Text` | `600 11px` `rgba(198,220,255,0.75)` = `row tap → expand details · same data as card view` |

### Card grid keys (exact, in order)

`cost` · `base rent` · `1 house` · `2 houses` · `3 houses` · `hotel rent` · `house cost` ·
`hotel cost` · `mortgage` · `rent now`

`rent now` is the live amount a visitor would owe given current buildings, set status and rules.

## 4. The primary action button

One button, one label at a time, driven by the turn state machine in `docs/06-state-machines.md`.

| Turn state | Label | Enabled when |
| --- | --- | --- |
| awaiting roll | `Roll` | it is your turn and no modal is open |
| moving | `OK` | disabled during the move animation |
| landed on an unowned tile | `Buy ₹<n>` | you can afford it; otherwise `Auction` when the rule is on, `End turn` when it is off |
| landed on an owned tile | `Pay ₹<n>` | always; insufficient cash routes to raise cash (`1d`) |
| rolled doubles | `Roll again` | — |
| everything resolved | `End turn` | — |
| not your turn | `OK` | disabled at 45% opacity, hint `Waiting for <name>.` |

The `Actions` sheet (`1v`) is reached from the Menu button, not from this button.

## 5. States

| State | Behaviour |
| --- | --- |
| your turn | Primary action live; your chip highlighted; a 2dp `#FFC84A` ring on your token |
| other's turn | Primary action disabled; the active chip is highlighted instead |
| animating a move | Board interaction locked; the primary action shows `OK` disabled |
| notification card open | `1n` covers the board centre; the HUD stays visible behind it |
| loading (entering) | Board and strip render as skeletons for the first snapshot only |
| reconnecting | `3k` overlay on top; the last state stays rendered beneath |
| disconnected | Same as reconnecting until the socket gives up, then `3r` |
| spectating | This screen is not used — `1h` is |
| bankrupt | Replaced by `1g` |
| offline (local modes) | Identical; there is no socket and no turn timer unless the board sets one |
| empty holdings | The holdings region shows `600 13px` `rgba(198,220,255,0.8)`: `No properties yet.` |
| disabled | Any action that a rule forbids renders disabled with a reason in its hint |

## 6. Interactions

| Trigger | Validation | Emits | Result |
| --- | --- | --- | --- |
| Pinch / drag the board | zoom 100%–400% | — | zoom and pan; the active token stays in view after every move |
| Tap a board tile | — | — | open the property card (`1j`) for that tile |
| Tap a player chip | — | — | open that player's public summary; long-press opens `3q` |
| Primary action | per §4 | `match:action { type }` | optimistic local apply, then the server's authoritative state; a rejection rolls back and toasts the error code |
| Menu | — | — | open the pause sheet (`3i`) |
| `Cards` / `List` | — | — | switch the holdings view; the choice persists per match |
| `colour` chip | — | — | cycle sort: colour, cost, rent now |
| List row tap | — | — | expand into the card view for that property |
| Android back | — | — | open the pause sheet |

Every action is optimistic locally and reconciled against the server snapshot; the engine is the
same build on both sides, so a reconciliation difference is a bug, not a normal case.

## 7. Data contract

Socket room `match:<matchId>`. Subscribes: `match:state` (authoritative snapshot),
`match:event` (log lines and notification cards), `match:turn`, `match:ended`,
`player:disconnected`, `player:reconnected`.
Emits: `match:action`, `match:ready`.
Reads the board version's tiles and rules from the match payload; renders money through the shared
`₹` formatter.

## 8. Responsive

- 360dp as designed; the board keeps a 1:1 aspect, the holdings region takes the rest and is the
  only scroller.
- Tablet: board left (60%), strip + holdings right (40%).
- Landscape: same split; the player strip becomes a vertical column.
- Safe area added to padding; the primary action never sits under the gesture bar.
- Font scale 130%: player chips grow to 64dp tall and the strip scrolls horizontally; board tile
  labels drop out below 44dp rendered size (the tile stays tappable through the property card).

## 9. Accessibility

- The board is a grid: each tile is a button labelled `Slot 12, Marina Beach, owned by Priya, 2 houses, rent 360 rupees`.
- Turn changes are announced with `accessibilityLiveRegion="polite"`: `Priya's turn`.
- The primary action announces its full label and, when disabled, its reason.
- Player chips are one focus stop each: `Player 2, 731 rupees`.
- Ownership is never colour-only — the card and the tile label both state the owner.
- Contrast: `#FFC84A` on card = 7.5:1; `#FFFFFF` on card = 8.6:1; `#3A2402` on gold = 9.6:1 — pass.

## 10. Animation

| What | Duration | Easing |
| --- | --- | --- |
| Token move, per tile | 180ms | `ease-in-out` (chained, max 12 hops) |
| Dice roll reveal | 420ms | `cubic-bezier(0.2,0.8,0.2,1)` |
| Cash change count | 320ms | `ease-out` |
| Turn handover (active chip highlight) | 200ms | `ease-out` |
| Card ↔ list view swap | 180ms cross-fade | `ease-out` |
| Property card expand from a list row | 220ms | `cubic-bezier(0.2,0.8,0.2,1)` |

Frame budget: the move animation must hold 60fps on a Pixel 6; see the performance budgets in
`docs/10-testing-strategy.md`.

## 11. Acceptance criteria

1. The layout order is board, player strip, cash row, holdings — board first, always.
2. The header shows the match name and `Round <n> · <m> players`, live.
3. The active player's chip and token are both visibly marked, and the turn line names them.
4. The primary action's label follows §4 exactly and is disabled with a reason off-turn.
5. Board zoom clamps to 100%–400% and the active token is kept in view after each move.
6. The property card shows all ten keys in the documented order, with `rent now` reflecting current
   buildings and set status.
7. The list view shows name and cost per row and expands to the same data as the card view.
8. The holdings region is the only scroller; the board never scrolls off.
9. Android back and the Menu button both open the pause sheet; neither leaves the match.
10. A server rejection rolls the optimistic action back and surfaces the error-catalog copy.
11. Going bankrupt replaces this screen with `1g` without losing the match connection.
12. All money renders as `₹` with Indian grouping and no decimals.
