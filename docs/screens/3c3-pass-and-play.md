# 3c3 · Pass and play — setup and handover

> Generated from `Royal Navy 1080 v2.dc.html` — option 3c3, screens "Pass and play setup", "Pass and play handover" (Session 9 export) · 19 September 2026.

## 1. Purpose and navigation position

Local hot-seat play on one device. Two screens: `/modes/pass-and-play` (setup) and
`/modes/pass-and-play/handover` (the cover shown between turns). Setup is pushed from the Pass and
play row on `3c`; back returns to `/modes`. The handover screen is a **blocking cover** — Android
back does nothing.

## 2. Layout map

### 2.1 Setup — frame 360 × 780, padding 17, gap 13

```
┌──────────────────────────────────────────────────┐
│ ‹  Pass and play                                │
│    One phone, 2 to 6 players                    │
│ ┌ Players card ─────────────── [–]  4  [+] ──┐  │
│ │ Players / 2 to 6                            │  │
│ └──────────────────────────────────────────────┘ │
│ ── WHO IS PLAYING ────────────────────────────  │
│ [■ cyan]  Naveen           ✎                    │
│ [■ gold]  Priya            ✎                    │
│ [■ green] Meera            ✎                    │
│ [■ red]   Karthik          ✎                    │
│ ── BOARD ─────────────────────────────────────  │
│ [tile] Kochi Edition                      ›     │
│        local · 16 tiles                         │
│ (spacer flex:1)                                 │
│ [ ▶ Start match ]  gold, 50dp                   │
└──────────────────────────────────────────────────┘
```

The player rows are exactly as many as the stepper value, in order, each with its colour swatch.

### 2.2 Handover — full-bleed cover inside the same frame

```
┌ absolute inset 0 · bg linear-gradient(180deg,#0F327A,#0A1D46) · radius 14 ┐
│                  centred column · gap 19 · padding 17                      │
│                          "HANDOVER"  800/11 · .14em · #5FC0FF              │
│                    ┌ 120×120 gold tile, radius 34 ┐                        │
│                    │            "P"  800/52        │                       │
│                    └───────────────────────────────┘                       │
│                  "Pass the phone"                                          │
│                  "to Priya"          800/28 white, centred, 2 lines        │
│                  "Round 12 · ₹4,200 cash"  600/13                          │
│                  [ ✋ I'm Priya, continue ]  gold, 50dp, full width         │
└────────────────────────────────────────────────────────────────────────────┘
```

## 3. Element inventory

### Setup

| # | Element | Component | Size / anchor | Tokens |
| --- | --- | --- | --- | --- |
| 1 | Frame | `ScreenFrame` | 360×780, padding 17, gap 13 | standard screen tokens |
| 2 | Back caret | `ph-caret-left` | 19dp | `rgba(198,220,255,0.95)` |
| 3 | Title / subtitle | `Text` | `flex:1`, gap 1.4 | `700 19px` `#FFFFFF` = `Pass and play`; `600 12px` `rgba(198,220,255,0.8)` = `One phone, 2 to 6 players` |
| 4 | Players card | `StepperRow` | radius 17, padding 11/12, gap 11 | bg `linear-gradient(180deg,#17489F,#123B88)`, border 1dp `rgba(126,180,255,.34)`, shadow `0 2px 0 rgba(6,20,54,.4), inset 0 1px 0 rgba(255,255,255,.08)`; label `600 14px` `rgba(198,220,255,0.95)` = `Players`; hint `600 12px` = `2 to 6`; buttons 32×32 radius 11 border 1dp `rgba(126,180,255,.34)`, `ph-minus` / `ph-plus` 15dp; value `800 17px` `#FFFFFF`, default `4` |
| 5 | Section label | `SectionLabel` | gap 8 to hairline | `800 11px` `.12em` `rgba(198,220,255,0.8)`; hairline 1dp `rgba(126,180,255,.18)`; copies `WHO IS PLAYING`, `BOARD` |
| 6 | Player row | `PlayerNameRow` | radius 17, padding 10/12, gap 11 | card tokens as #4; swatch 26×26 radius 9 with `inset 0 -2px 0 rgba(5,15,40,.3)`; name `700 15px` `#FFFFFF` on a 1dp `rgba(126,180,255,.28)` underline with 3dp padding; `ph-pencil-simple` 16dp `rgba(198,220,255,0.8)` |
| 7 | Board row | `SettingRow` | radius 17, padding 11/12 | thumb 44×44 radius 13 dashed `rgba(126,180,255,.45)` with `ph-squares-four` 20dp `#5FC0FF`; title `700 15px` = `Kochi Edition`; meta `600 12px` = `local · 16 tiles`; caret `ph-caret-right` 17dp |
| 8 | Spacer | `View` | `flex:1; min-height:0` | — |
| 9 | Start match | `Button.primaryGold` | full width, height 50, radius 16, gap 7 | bg `linear-gradient(180deg,#FFC84A,#E0A31C)`, shadow `inset 0 2px 0 rgba(255,255,255,.5), 0 5px 0 #B57F0C, 0 10px 20px rgba(5,15,40,.45)`; label `800 16px` `#3A2402`, `ph-play` 18dp, copy `Start match` |

**Seat colour order (fixed, seats 1–6):** `#5FC0FF`, `#FFC84A`, `#7ADB25`, `#FF6B7A`, `#A77BFF`,
`#4FD6C0`. Seats 5 and 6 take the last two values; the first four are as drawn.

### Handover

| # | Element | Component | Size / anchor | Tokens |
| --- | --- | --- | --- | --- |
| 10 | Cover | `View` | `position:absolute; inset:0`, radius 14 | bg `linear-gradient(180deg,#0F327A,#0A1D46)` |
| 11 | Content column | `View` | inset 0, padding 17, centred, gap 19 | — |
| 12 | Kicker | `Text` | — | `800 11px`, `.14em`, `#5FC0FF`, copy `HANDOVER` |
| 13 | Seat tile | `SeatTile` | 120×120, radius 34 | fill = that seat's colour (here `#FFC84A`), shadow `inset 0 -5px 0 rgba(5,15,40,.22), 0 12px 30px rgba(5,15,40,.5)`; initial `800 52px` `#3A2402` |
| 14 | Headline | `Text` | centred, two lines | `800 28px` `#FFFFFF`, copy `Pass the phone` / `to <Name>` |
| 15 | Status line | `Text` | — | `600 13px` `rgba(198,220,255,0.8)`, copy `Round <n> · ₹<cash> cash` |
| 16 | Continue | `Button.primaryGold` | full width, height 50 | as #9 with `ph-hand-tap` 18dp; copy `I'm <Name>, continue` |

## 4. States

| State | Behaviour |
| --- | --- |
| default (setup) | 4 seats, names prefilled from the last local match or `Player 1…6` |
| duplicate name | The offending row's underline becomes `#F0524A` and Start match is disabled |
| empty name | Same treatment; a name must be 1–16 characters |
| editing | Tapping the row or the pencil focuses the inline field; the underline becomes `#5FC0FF` |
| loading | Board row skeleton while the local board reads; other controls live |
| error | Board unreadable → error card above Start match, Start match disabled |
| offline | Normal — this mode never needs a connection |
| first-run | Names default to `Player 1`…`Player 4` |
| handover | Blocking cover; no back, no pause access until Continue is pressed |
| disconnected / reconnecting / spectating | Not applicable |

## 5. Interactions

| Trigger | Validation | Result |
| --- | --- | --- |
| `–` | value > 2 | remove the **last** seat (its typed name is remembered for this session) |
| `+` | value < 6 | append a seat with the next colour and `Player <n>` |
| Tap name / pencil | — | inline edit, 16-character limit, trims whitespace on blur |
| Tap board row | — | push `/catalogue?mode=local`; local and published boards both selectable |
| Start match | all names non-empty, unique, a board is loaded | create the local match, `router.replace('/match/[matchId]')`, then immediately present the handover cover for seat 1 |
| End of a turn | — | present the handover cover for the next seat; the HUD is hidden behind it |
| Continue on handover | — | dismiss the cover, reveal the HUD for that seat; 240ms fade |
| Android back on handover | — | no-op (cover is blocking) |

## 6. Data contract

Reads: local matches table, `settings.lastLocalRoster` (names and colours).
Writes: the match row after every committed action (so a kill-and-relaunch resumes at the same seat
behind the handover cover).
Socket events: none — the entire mode is local.

## 7. Responsive

- 360dp as designed. Six seats on a 640dp-tall device overflow: the section between the players card
  and the board row scrolls; Start match stays pinned.
- Tablet: content capped at 520dp centred; the handover tile scales to 160dp.
- Landscape: setup becomes two columns (players left, board + start right); the handover cover stays
  a single centred column.
- Font scale 130%: handover headline drops to 24dp via `adjustsFontSizeToFit` with two lines;
  the seat tile stays 120dp.

## 8. Accessibility

- Seat rows: label `Seat <n>, <name>`, hint `Double tap to rename`.
- Colour is never the only seat identifier — the name is always present.
- Handover cover: `accessibilityViewIsModal`, announces `Pass the phone to <Name>, round <n>` on
  present.
- Continue is the only focusable control on the cover.
- Contrast: `#3A2402` on `#FFC84A` = 9.6:1; `#5FC0FF` on `#0F327A` = 7.1:1 — pass.

## 9. Animation

| What | Duration | Easing |
| --- | --- | --- |
| Seat add/remove (height + opacity) | 180ms | `ease-out` |
| Handover cover present (opacity 0 → 1, tile scale 0.9 → 1) | 260ms | `cubic-bezier(0.2,0.8,0.2,1)` |
| Handover cover dismiss | 240ms fade | `ease-in` |
| Stepper / button press | 90ms | `ease-out` |

The cover must be fully opaque before the previous seat's board state becomes visible — no partial
reveal at any frame.

## 10. Acceptance criteria

1. The stepper clamps to 2–6 and adds or removes the last seat only.
2. Seat colours follow the fixed order in §3 and never repeat within a match.
3. Duplicate or empty names disable Start match and mark the offending row.
4. Start match goes straight to the handover cover for seat 1 — the board is never shown first.
5. The handover headline reads `Pass the phone` / `to <Name>` on two lines, centred.
6. The status line shows the round number and that seat's cash with `₹` and Indian grouping.
7. The Continue label includes that seat's name verbatim.
8. Android back and the pause gesture do nothing while the cover is up.
9. Killing and relaunching the app resumes the match behind the handover cover for the correct seat.
10. No network request is made anywhere in this mode.
