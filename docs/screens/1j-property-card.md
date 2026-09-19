# 1j · Property card — set progress

> Generated from `Royal Navy 1080 v2.dc.html` — option 1j, screen "Property card — set held" (Session 9 export) · 19 September 2026.

## 1. Purpose and navigation position

The in-match property card, with colour-set progress pips. Route
`/match/[matchId]/property/[tileIndex]`, presented as a card over the HUD. Opened by tapping a
board tile or a holdings row on `1c`. Back or a tap outside dismisses it.

This screen is where decision **D1** is visible: the set threshold comes from the board's rules,
and the card states it in words.

## 2. Layout map

```
┌ card over the dimmed HUD · radius 20 · padding 14 ┐
│ Park Place                                         │
│ ●●●○○  3 of 5 · set held                           │
│ Rent now                       ₹350 · doubled      │
│ With 1 house                   ₹700                │
│ Houses                         2 of 4              │
│ Mortgage value                 ₹700                │
│ ────────────────────────────────────────────────── │
│ Marine Drive                                       │
│ ●●○○○  2 of 5 · need 1 more                        │
│ "Rent doubles at three tiles of a colour on this   │
│  board."                                           │
│ "Pips take the set colour when you hold the        │
│  threshold, grey while you are short."             │
└────────────────────────────────────────────────────┘
```

The card shows the tapped property first, then any other property the player owns in the same
colour group, each with its own pip row.

## 3. Element inventory

| # | Element | Component | Tokens |
| --- | --- | --- | --- |
| 1 | Scrim | `Scrim` | inset 0, `rgba(5,15,40,.64)` |
| 2 | Card | `Card.elevated` | max width 320, radius 20, padding 14, gap 11; bg `linear-gradient(180deg,#17489F,#123B88)`, border 1dp `rgba(126,180,255,.45)`, shadow `0 18px 44px rgba(4,12,32,.55)` |
| 3 | Property name | `Text` | `800 19px` `#FFFFFF` |
| 4 | Pip | `Pip` ×(set size) | 10dp circle, gap 5; **held**: filled with the set colour, 1dp `rgba(255,255,255,.35)` inner ring; **owned but short of the threshold**: filled `rgba(198,220,255,0.8)`; **not owned**: `rgba(126,180,255,.28)` |
| 5 | Set status | `Text` | `700 13px` — `<n> of <m> · set held` in `#7ADB25` when held, `<n> of <m> · need <k> more` in `rgba(198,220,255,0.8)` when short |
| 6 | Stat row | `Row` ×4 | label `600 13px` `rgba(198,220,255,0.8)`; value `800 15px` `#FFC84A` |
| 7 | Doubled qualifier | `Text` | appended to `Rent now`, `600 12px` `#7ADB25` = `· doubled` |
| 8 | Divider | `View` | 1dp `rgba(126,180,255,.18)`, full width |
| 9 | Rule explainer | `Text` | `600 12px` `rgba(198,220,255,0.8)` = `Rent doubles at three tiles of a colour on this board.` — the number comes from the board's threshold |
| 10 | Pip legend | `Text` | `600 11px` `rgba(198,220,255,0.75)` = `Pips take the set colour when you hold the threshold, grey while you are short.` |

### Stat rows (exact, in order)

`Rent now` · `With 1 house` · `Houses` · `Mortgage value`

`Houses` renders as `<built> of <max>` (`2 of 4`), not a currency value.

## 4. Pip and threshold semantics (authoritative)

- Pip count = the number of tiles in that colour group **on this board**, not a fixed four or three.
- Filled pips = tiles of the group the viewing player owns.
- The group is *held* when owned ≥ the board's threshold (`3 of 5` here). Holding doubles rent and
  unlocks building, per `docs/05-game-rules.md` § Colour sets.
- Mortgaging a tile in the group removes it from the owned count when the board's
  `Mortgage breaks the set` rule is on; the pips and the status line update immediately.
- `Rent now` always reflects the live state: buildings, held status and any active rule effects.

## 5. States

| State | Behaviour |
| --- | --- |
| set held | Pips in the set colour; status in `#7ADB25`; `Rent now` carries `· doubled` |
| short of the threshold | Pips grey; status reads `need <k> more`; no `· doubled` qualifier |
| not owned by the viewer | Card shows the tile's public data: name, owner, `Rent now`, buildings; the pip row shows the **owner's** progress with the legend `Owner holds <n> of <m>`; no mortgage value |
| mortgaged | Name is struck through; a `mortgaged` chip in `#FF9A93` sits beside it; `Rent now` reads `₹0 · mortgaged` |
| building in progress | `Houses` shows the pending count with a 12dp spinner until the server confirms |
| unowned tile | Card shows `cost`, `base rent` and a `Buy ₹<n>` action when it is the viewer's turn and they are standing on it; otherwise no action |
| spectating | Public fields only; no mortgage value, no actions |
| loading | Never — all data is already in the match snapshot |
| error | A rejected build or mortgage rolls the value back and toasts the error code |
| offline (local modes) | Identical |

## 6. Interactions

| Trigger | Result |
| --- | --- |
| Tap outside the card / Android back | dismiss, 180ms fade |
| Swipe down | dismiss |
| Tap another property's block inside the card | scroll that block into view; the card grows up to 80% of the frame height, then scrolls internally |
| Long-press a stat row | copy `<label>: <value>` to the clipboard |

The card itself carries **no** build, sell or mortgage buttons — those live in the actions sheet
(`1v`) and its child screens. This card is informational.

## 7. Data contract

Reads from the match snapshot: the tile, its colour group, the viewer's holdings in that group,
the board's threshold and rules. No endpoint, no emitted event.

## 8. Responsive

- 360dp: card max width 320dp, centred.
- Tablet: card max width 420dp.
- Landscape: card caps at 80% height and scrolls internally.
- Font scale 130%: stat rows stack label over value; pips stay 10dp.

## 9. Accessibility

- The card is `accessibilityViewIsModal`; focus starts on the property name.
- The pip row is one focus stop: `Park Place, you own 3 of 5 in the purple set, set held`.
- Pip colour is never the only signal — the status line always states the count and whether the set
  is held.
- Stat rows announce label and value together.
- Contrast: `#7ADB25` on card = 7.8:1; `#FFC84A` on card = 7.5:1 — pass.

## 10. Animation

| What | Duration | Easing |
| --- | --- | --- |
| Present (scale 0.96 → 1, scrim fade) | 220ms | `cubic-bezier(0.2,0.8,0.2,1)` |
| Dismiss | 180ms | `ease-in` |
| Pip fill on acquiring a tile | 240ms, 40ms stagger | `ease-out` |
| `Rent now` change | 320ms count | `ease-out` |
| Held-state colour tween | 240ms | `ease-out` |

## 11. Acceptance criteria

1. The pip row has exactly as many pips as the colour group has tiles on this board.
2. Pips render in the set colour only when the viewer holds the threshold, grey otherwise.
3. The status line reads `<n> of <m> · set held` or `<n> of <m> · need <k> more`.
4. `Rent now` shows `· doubled` only while the set is held.
5. The four stat rows appear in the documented order, with `Houses` as `<built> of <max>`.
6. The rule explainer states the board's own threshold number, not a hard-coded three.
7. Mortgaging a group tile updates pips, status and rent immediately when the rule is on.
8. The card carries no build, sell or mortgage actions.
9. Viewing another player's property hides the mortgage value and shows the owner's progress.
10. The pip legend renders verbatim.
