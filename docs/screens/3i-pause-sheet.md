# 3i · Pause sheet

> Generated from `Royal Navy 1080 v2.dc.html` — option 3i, screen "Pause / default" (Session 9 export) · 19 September 2026.

## 1. Purpose and navigation position

The in-match menu, presented over the HUD. Not a route — an overlay above `/match/[matchId]`,
opened by the Menu button or Android back. `Rules` opens the board's read-only rules (`1f` /`3l`),
`Settings` opens `3f`, `Leave match` fires the leave dialog in `3j`.

## 2. Layout map

```
┌ HUD behind, dimmed ─────────────────────────────┐
│ Friday Night                                     │
│ Round 12 · 6 players                             │
│ board (GO · CHEST · JAIL · GO TO), dimmed        │
│ ┌ sheet · bottom · radius 20 top · padding 17 ─┐ │
│ │ Paused                            800/19      ││
│ │ Turn timer held · 32s left        600/12      ││
│ │ Sound                              [toggle]   ││
│ │ Dice, cash and card cues                      ││
│ │ Haptics                            [toggle]   ││
│ │ Buzz on your turn                             ││
│ │ Rules                                    ›    ││
│ │ Chennai Edition · read-only                   ││
│ │ [ Resume match ]  gold, 50dp                  ││
│ │ [ Settings ]                                  ││
│ │ [ Leave match ]  danger                       ││
│ └────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────┘
```

Order is fixed: status, Sound, Haptics, Rules, Resume match, Settings, Leave match.

## 3. Element inventory

| # | Element | Component | Tokens |
| --- | --- | --- | --- |
| 1 | Scrim | `Scrim` | inset 0, `rgba(5,15,40,.64)`; the HUD behind stays rendered |
| 2 | Sheet | `BottomSheet` | full width, top radius 20, padding 17, gap 11; bg `linear-gradient(180deg,#17489F,#123B88)`, top border 1dp `rgba(126,180,255,.45)`, shadow `0 -12px 34px rgba(4,12,32,.5)`; 36 × 4dp grabber `rgba(126,180,255,.35)` |
| 3 | Title | `Text` | `800 19px` `#FFFFFF` = `Paused` |
| 4 | Timer status | `Text` | `600 12px` `#FFC84A` = `Turn timer held · <n>s left` |
| 5 | Toggle row | `ToggleRow` ×2 | card tokens, min-height 48, radius 16, padding 11/12; label `600 14px` `rgba(198,220,255,0.95)`; hint `600 12px` `rgba(198,220,255,0.8)`; switch 44×26, on-track `rgba(122,219,37,.45)` knob `#7ADB25` |
| 6 | Rules row | `NavRow` | as #5 with `ph-caret-right` 16dp; label `Rules`; meta `<board name> · read-only` |
| 7 | Resume | `Button.primaryGold` | full width, height 50, radius 16, `800 16px` `#3A2402` = `Resume match` |
| 8 | Settings | `Button.ghost` | full width, min-height 44, radius 16, `700 15px` `rgba(198,220,255,0.95)` = `Settings` |
| 9 | Leave match | `Button.danger` | full width, min-height 44, radius 16, bg `rgba(240,82,74,.14)`, border 1dp `rgba(240,82,74,.6)`, `700 15px` `#FF9A93` = `Leave match` |

### Row copy (verbatim)

| Label | Hint / meta |
| --- | --- |
| `Sound` | `Dice, cash and card cues` |
| `Haptics` | `Buzz on your turn` |
| `Rules` | `<board name> · read-only` |

## 4. What "paused" means

| Mode | Behaviour |
| --- | --- |
| Online multiplayer | The **match does not pause**. The title still reads `Paused` (it describes the local view), and the status line counts the real remaining turn time so the player knows what they are spending. Opening the sheet does not extend the timer |
| Pass and play | The turn timer is genuinely held while the sheet is open; the status line reads `Turn timer held · <n>s left` |
| Solo vs AI | Same as pass and play — the engine is local and is held |
| No turn timer on the board | The status line is replaced by `600 12px` `rgba(198,220,255,0.8)`: `No turn timer on this board.` |

This distinction must be implemented exactly: an online player cannot buy time by opening the menu.

## 5. States

| State | Behaviour |
| --- | --- |
| default | As drawn |
| timer under 10s (online) | The status line turns `#FF9A93` and reads `Turn timer running · <n>s left` |
| not your turn | The status line reads `<name>'s turn · <n>s left`; nothing else changes |
| reconnecting | The sheet closes automatically and `3k` takes the screen |
| spectating | The sheet offers only `Rules`, `Settings` and `Leave` — no timer line, no `Resume match` |
| bankrupt (`1g`) | The sheet is not reachable; `1g` has its own actions |
| local modes | No `Leave match` danger copy about bankruptcy — see §6 |
| loading / error / offline / empty / first-run / disabled | Not applicable |

## 6. Interactions

| Trigger | Result |
| --- | --- |
| `Sound` | write the local preference immediately; same store as `3f` |
| `Haptics` | same |
| `Rules` | push the read-only rules for this board (`3l` in the lobby style, `1f`'s full rulebook from the catalogue) |
| `Resume match` | dismiss the sheet, 200ms |
| `Settings` | push `/settings` with `Sign out` hidden (see `3f`) |
| `Leave match` (online) | fire the leave dialog from `3j`: `Leave this match?` / `You'll be marked bankrupt and your properties return to the bank. This can't be undone.` / `Stay`, `Leave` |
| `Leave match` (pass and play / solo) | dialog `Leave this match?` / `The match is saved. You can resume it from Game modes.` / `Stay`, `Leave` |
| Scrim tap / swipe down / Android back | dismiss, same as `Resume match` |

Leaving an online match emits `match:leave`; the server resolves the player as bankrupt per
`docs/05-game-rules.md` § Leaving a match, and their properties return to the bank.

## 7. Data contract

Reads the local settings store and the match's turn state. Emits `match:leave` only on confirmed
leave. No subscriptions of its own.

## 8. Responsive

- Phones: full-width bottom sheet with safe-area bottom padding.
- Tablet: centred dialog capped at 420dp.
- Landscape: sheet caps at 70% height and scrolls internally; the three action buttons stay pinned.
- Font scale 130%: rows grow to 60dp; the sheet scrolls rather than compressing the buttons.

## 9. Accessibility

- `accessibilityViewIsModal`; focus starts on `Paused` and returns to the Menu button on dismiss.
- The timer line is `accessibilityLiveRegion="polite"`, announcing at 30s, 10s and 5s.
- Toggles are switches with their hints attached.
- `Leave match` is the last focus stop and is never the default.
- Contrast: `#FFC84A` on the sheet = 7.5:1; `#FF9A93` on its tint = 5.9:1 — pass.

## 10. Animation

| What | Duration | Easing |
| --- | --- | --- |
| Sheet present (translateY 100% → 0 + scrim fade) | 240ms | `cubic-bezier(0.2,0.8,0.2,1)` |
| Dismiss | 200ms | `ease-in` |
| Toggle knob | 160ms | `cubic-bezier(0.2,0.8,0.2,1)` |
| Timer digit change | no animation — instant, once per second | — |

## 11. Acceptance criteria

1. The sheet opens from the Menu button and from Android back, over a still-rendered HUD.
2. Rows appear in the order Sound, Haptics, Rules, Resume match, Settings, Leave match.
3. Row labels and hints match §3 verbatim.
4. In online matches the turn timer keeps running while the sheet is open.
5. In pass-and-play and solo the timer is genuinely held.
6. A board with no turn timer shows the alternate status line.
7. `Rules` opens a read-only view; nothing in it is editable.
8. `Settings` opens the settings screen with `Sign out` hidden.
9. `Leave match` shows the online bankruptcy warning, or the local save message, as appropriate.
10. Scrim tap, swipe down, Android back and `Resume match` all dismiss identically.
