# 1g · Out of the match

> Generated from `Royal Navy 1080 v2.dc.html` — option 1g, screen "Out of the match" (Session 9 export) · 19 September 2026.

## 1. Purpose and navigation position

What a bankrupt player sees while the match keeps running. Route `/match/[matchId]/out`, entered
automatically when the local player is eliminated. It **replaces** the HUD; Android back does
nothing. Exits are `Watch`, `Leave`, and the automatic move to `/result/[matchId]` when the match
ends.

## 2. Layout map

Frame 360 × 780, padding 17, flex-column, gap 13.

```
┌──────────────────────────────────────────────────┐
│ You're out · round 12                800/22      │
│ Bankrupt to Naveen. The match runs to round 20.  │
│ ┌ board · still live, dimmed to 45% ──────────┐  │
│ │   (non-interactive)                          │ │
│ └───────────────────────────────────────────────┘│
│ ── STANDINGS · LIVE ──────────────────────────   │
│ 1  Naveen                          ₹22,400       │
│ 2  Priya                           ₹14,100       │
│ 3  Meera                            ₹6,800       │
│ —  You                                  out      │
│ [ Match log ]                                    │
│ [ Watch ]                  [ Leave ]             │
│ [ Rematch when this ends ]                       │
└──────────────────────────────────────────────────┘
```

## 3. Element inventory

| # | Element | Component | Tokens |
| --- | --- | --- | --- |
| 1 | Frame | `ScreenFrame` | 360×780, padding 17, gap 13 | standard screen tokens |
| 2 | Headline | `Text` | `800 22px` `#FFFFFF` = `You're out · round <n>` |
| 3 | Reason line | `Text` | `600 13px` `rgba(198,220,255,0.8)` = `Bankrupt to <name>. The match runs to round <cap>.` — when the debt was to the bank, `Bankrupt to the bank.` |
| 4 | Dimmed board | `BoardView.readonly` | aspect 1:1, opacity 0.45, `pointerEvents: none`; a caption `600 11px` `rgba(198,220,255,0.75)` = `board · still live` |
| 5 | Section label | `SectionLabel` | `800 11px` `.12em` `rgba(198,220,255,0.8)` = `STANDINGS · LIVE` |
| 6 | Standing row | `RankRow` | card tokens, min-height 48; rank `800 15px` — `#FFC84A` for 1, `rgba(198,220,255,0.8)` below; name `700 15px` `#FFFFFF`; net worth `800 15px` `#FFC84A` |
| 7 | Own row | `RankRow.self` | rank `—` in `rgba(198,220,255,0.8)`; name `You`; value `out` in `600 13px` `#FF9A93`; border 1dp `rgba(255,107,122,.4)`, fill `rgba(255,107,122,.09)` |
| 8 | Match log | `Button.ghost` | full width, min-height 44, radius 16, `700 15px` `rgba(198,220,255,0.95)` = `Match log` |
| 9 | Watch | `Button.primaryGold` | `flex:1`, min-height 44, `700 15px` `#3A2402` = `Watch` |
| 10 | Leave | `Button.ghost` | `flex:1`, min-height 44, `700 15px` `rgba(198,220,255,0.95)` = `Leave` |
| 11 | Rematch | `Button.ghost` | full width, min-height 44, `700 15px` `#5FC0FF` = `Rematch when this ends` |

## 4. States

| State | Behaviour |
| --- | --- |
| default | As drawn, standings updating live |
| watching | `Watch` swaps the dimmed board for the live spectator board at full opacity; the button becomes `Stop watching`; standings stay below |
| rematch armed | The rematch button becomes a non-interactive chip `Rematch armed` in `#7ADB25`; when the match ends the player is auto-seated in the host's rematch lobby if one opens within 60000ms |
| match ended | Auto-navigate to `/result/[matchId]` after a 1200ms delay, or immediately on tap |
| host left / room closed | `3r` takes over |
| reconnecting | `3k` overlay; standings freeze at their last values with a `600 11px` `#FF9A93` line: `Standings paused — reconnecting.` |
| offline (local modes) | Pass-and-play and solo show this screen without `Watch` or `Rematch when this ends`; only `Match log` and `Leave` are present |
| loading | Standings render as three skeleton rows for the first snapshot |
| error | Standings keep their last values; a toast reports the error code |
| spectating / disabled / first-run | Not applicable |

## 5. Interactions

| Trigger | Validation | Emits | Result |
| --- | --- | --- | --- |
| `Match log` | — | — | push `/match/[matchId]/log` (`2c`) |
| `Watch` | the match still allows spectating | `match:spectate` | undim the board and follow play live |
| `Stop watching` | — | `match:unspectate` | re-dim the board |
| `Leave` | — | `match:leave` | confirm `Leave this match?` / `You're already out. You'll stop getting updates.` / `Cancel`, `Leave`; on confirm `router.replace('/modes')` |
| `Rematch when this ends` | — | `match:rematchIntent` | arm the rematch; tapping again disarms it |
| Android back | — | — | no-op — this screen is blocking |
| Match ends | — | — | replace to `/result/[matchId]` |

Leaving does not forfeit anything — the player is already eliminated; it only stops the updates.

## 6. Data contract

Socket room `match:<matchId>`, joined in a read-only capacity. Subscribes: `match:state`
(standings and board), `match:ended`, `match:rematchOpened`. Emits: `match:spectate`,
`match:unspectate`, `match:leave`, `match:rematchIntent`.
Standings are net worth per the rulebook's net-worth formula — cash plus unmortgaged property value
plus buildings at their sell-back value.

## 7. Responsive

- 360dp as designed; the standings list scrolls when there are more than five players.
- Tablet: board left, standings and actions right.
- Landscape: same split.
- Font scale 130%: rows grow to 60dp; the headline wraps to two lines.

## 8. Accessibility

- The screen announces on entry: `You're out, round 12. Bankrupt to Naveen.`
- The dimmed board is `accessibilityElementsHidden` until `Watch` is pressed.
- Standings rows are one focus stop each; the own row announces `, you, out`.
- `Leave` is never the first focus stop.
- Contrast: `#FF9A93` on its tint = 5.9:1; `#FFC84A` on card = 7.5:1 — pass.

## 9. Animation

| What | Duration | Easing |
| --- | --- | --- |
| Entry (HUD cross-fades to this screen) | 320ms | `ease-in-out` |
| Board dim / undim | 240ms | `ease-out` |
| Standings reorder | 260ms | `cubic-bezier(0.2,0.8,0.2,1)` |
| Net-worth value change | 320ms count | `ease-out` |
| Exit to result | 400ms fade | `ease-in` |

## 10. Acceptance criteria

1. The headline reads `You're out · round <n>` with the real round number.
2. The reason line names the creditor, or the bank, and states the round cap.
3. The board is visible, dimmed to 45%, and non-interactive until `Watch` is pressed.
4. Standings update live and always show the local player's row last, marked `out`.
5. `Watch` toggles the live view without leaving this screen.
6. `Leave` confirms first and returns to `/modes`.
7. `Rematch when this ends` arms and disarms, and auto-seats the player when a rematch lobby opens
   within 60 seconds of the match ending.
8. Android back does nothing.
9. When the match ends the screen moves to the result screen automatically.
10. In local modes the online-only actions are absent rather than disabled.
