# 3c2 · Solo vs AI setup

> Generated from `Royal Navy 1080 v2.dc.html` — option 3c2, screen "Solo vs AI setup" (Session 9 export) · 19 September 2026.

## 1. Purpose and navigation position

Configures an offline single-player match against computer opponents. Route `/modes/solo`, pushed
from the Solo vs AI row on `3c`. Back returns to `/modes`. Start match replaces the route with
`/match/[matchId]` running a local engine — no server involved.

## 2. Layout map

Frame 360 × 780dp, padding 17, flex-column, gap 13. Section labels use the standard
`SectionLabel` pattern (`800 11px`, letter-spacing `.12em`, `rgba(198,220,255,0.8)` + 1dp hairline
`rgba(126,180,255,.18)` filling the remaining width).

```
┌ 360 × 780 · padding 17 · gap 13 ────────────────┐
│ ‹  Solo match                                   │
│    Play offline against the computer            │
│ ── BOARD ─────────────────────────────────────  │
│ [tile] Classic                            ›     │
│        24 tiles · official                      │
│ ── OPPONENTS ─────────────────────────────────  │
│ Computer players            [–]  3  [+]         │
│ 1 to 5                                          │
│ ── DIFFICULTY ────────────────────────────────  │
│ [ Easy | Normal | Hard ]  segmented             │
│ Easy    buys carefully, never trades            │
│ Normal  buys to build sets, trades when it gains│
│ Hard    blocks your sets, bids up every auction │
│ ── (spacer flex:1) ───────────────────────────  │
│ Starting cash   from the board      ₹10,000     │
│ Fast mode                              [toggle] │
│ Finishes a match in about two minutes — good    │
│ for testing rules.                              │
│ [ ▶ Start match ]  gold, 50dp                   │
└──────────────────────────────────────────────────┘
```

## 3. Element inventory

| # | Element | Component | Size / anchor | Tokens |
| --- | --- | --- | --- | --- |
| 1 | Frame | `ScreenFrame` | 360×780, padding 17, gap 13 | standard screen tokens (`docs/02-design-tokens.md` → Screen) |
| 2 | Back caret | `ph-caret-left` | 19dp, gap 11 to title | `rgba(198,220,255,0.95)` |
| 3 | Title | `Text` | `flex:1` | `700 19px`, `#FFFFFF`, copy `Solo match` |
| 4 | Subtitle | `Text` | gap 1.4 below title | `600 12px`, `rgba(198,220,255,0.8)`, copy `Play offline against the computer` |
| 5 | Section label | `SectionLabel` | full width, gap 8 to hairline | `800 11px`, `.12em`, `rgba(198,220,255,0.8)`; hairline 1dp `rgba(126,180,255,.18)`; copies `BOARD`, `OPPONENTS`, `DIFFICULTY` |
| 6 | Board row | `SettingRow` (card) | full width, radius 17, padding 11/12, gap 11 | card tokens: bg `linear-gradient(180deg,#17489F,#123B88)`, border 1dp `rgba(126,180,255,.34)`, shadow `0 2px 0 rgba(6,20,54,.4), inset 0 1px 0 rgba(255,255,255,.08)`; thumb 44×44 radius 13 dashed `rgba(126,180,255,.45)` with `ph-squares-four` 20dp `#5FC0FF`; title `700 15px` `#FFFFFF` = `Classic`; meta `600 12px` `rgba(198,220,255,0.8)` = `24 tiles · official`; caret `ph-caret-right` 17dp |
| 7 | Stepper row | `StepperRow` (card) | as #6 | label `600 14px` `rgba(198,220,255,0.95)` = `Computer players`; hint `600 12px` = `1 to 5`; minus/plus 32×32 radius 11 border 1dp `rgba(126,180,255,.34)` with `ph-minus`/`ph-plus` 15dp; value `800 17px` `#FFFFFF`, default `3` |
| 8 | Difficulty segmented | `Segmented` | full width, three equal halves, radius 17, border 1dp `rgba(126,180,255,0.27)` | active bg `rgba(95,192,255,.16)`, text `#5FC0FF`; inactive `rgba(198,220,255,0.9)`; labels `Easy`, `Normal`, `Hard` |
| 9 | Difficulty legend | `DefinitionList` | three rows, gap 7 | term `700 13px` `#FFFFFF`; definition `600 12px` `rgba(198,220,255,0.8)` |
| 10 | Starting cash row | `SettingRow` (card) | as #6, read-only | label `Starting cash`; meta `from the board`; value `800 15px` `#FFC84A` = `₹10,000` |
| 11 | Fast mode row | `ToggleRow` (card) | as #6 | label `600 14px` = `Fast mode`; body `600 12px` `rgba(198,220,255,0.8)` = `Finishes a match in about two minutes — good for testing rules.`; toggle 44×26 |
| 12 | Spacer | `View` | `flex:1; min-height:0` | — |
| 13 | Start match | `Button.primaryGold` | full width, height 50, radius 16, gap 7 | bg `linear-gradient(180deg,#FFC84A,#E0A31C)`, shadow `inset 0 2px 0 rgba(255,255,255,.5), 0 5px 0 #B57F0C, 0 10px 20px rgba(5,15,40,.45)`, label `800 16px` `#3A2402` with `ph-play` 18dp, copy `Start match` |

### Difficulty legend copy (verbatim)

| Term | Definition |
| --- | --- |
| Easy | `buys carefully, never trades` |
| Normal | `buys to build sets, trades when it gains` |
| Hard | `blocks your sets, bids up every auction` |

## 4. States

| State | Behaviour |
| --- | --- |
| default | Board `Classic`, opponents `3`, difficulty `Normal`, fast mode off |
| loading | Only while the local board fixture reads from SQLite: board row shows a skeleton title/meta bar; other controls interactive |
| error | Board fixture unreadable → error card above Start match, `Couldn't load that board.`, Start match disabled |
| empty | Not possible: `Classic` ships with the app |
| offline | The normal state — this screen never needs a connection |
| disabled | Start match disabled (45% opacity) while the board row is in its error or loading state |
| first-run | Identical |
| disconnected / reconnecting / spectating | Not applicable |

## 5. Interactions

| Trigger | Validation | Result |
| --- | --- | --- |
| Back caret / Android back | — | pop to `/modes`; no confirm, settings are not persisted |
| Tap board row | — | push `/catalogue?mode=solo`; a pick returns the board version id and updates the row's title and meta |
| `–` | value > 1 | decrement; disabled at 1 (45% opacity) |
| `+` | value < 5 | increment; disabled at 5 |
| Difficulty tap | — | set tier; the legend does not change, it is a static reference |
| Fast mode toggle | — | sets `fastMode: true` — engine config per `docs/05-game-rules.md` §Fast mode |
| Start match | a board is loaded | create a local match with `engine.createMatch({ boardVersion, aiCount, difficulty, fastMode, seed: Date.now() })`, persist to SQLite, `router.replace('/match/[matchId]')` |

No network call on this screen under any circumstance.

## 6. Data contract

Reads: local board fixtures table, `settings.lastSoloConfig` (restores opponents / difficulty /
fast mode, **not** the board).
Writes: `settings.lastSoloConfig` on Start match; the new match row.
Socket events: none.

## 7. Responsive

- 360dp as designed; the spacer absorbs extra height so Start match stays bottom-anchored.
- Short devices (≤ 640dp): the content column scrolls; Start match is pinned outside the scroll view.
- Tablet: content capped at 520dp, centred.
- Landscape: two columns — board + opponents left, difficulty + cash + fast mode right; Start match
  spans the full width at the bottom.
- Font scale 130%: legend definitions wrap to two lines; the spacer collapses first, then the column
  scrolls.

## 8. Accessibility

- Stepper: `accessibilityRole="adjustable"` on the row, value `3 computer players`, increment and
  decrement actions wired so the buttons are not the only affordance.
- Segmented: `tablist` / `tab` with `selected`.
- Fast mode: `accessibilityRole="switch"` with the body text as `accessibilityHint`.
- Start match label `Start match against 3 computer players on Classic`.
- Contrast: `#FFC84A` on `#17489F` = 7.5:1; `#3A2402` on `#FFC84A` = 9.6:1 — pass.

## 9. Animation

| What | Duration | Easing |
| --- | --- | --- |
| Stepper value change (fade + 4dp rise) | 120ms | `ease-out` |
| Segmented indicator | 180ms | `ease-out` |
| Toggle knob travel | 160ms | `cubic-bezier(0.2,0.8,0.2,1)` |
| Start match press | 90ms | `ease-out` |
| Route replace into the match | 240ms fade | `ease-in-out` |

## 10. Acceptance criteria

1. Section labels read `BOARD`, `OPPONENTS`, `DIFFICULTY` in that order.
2. The stepper clamps to 1–5 and disables its end buttons at the bounds.
3. Difficulty defaults to `Normal` and the three legend lines match §3 verbatim.
4. Starting cash is read-only, shows `from the board`, and renders the amount with Indian grouping
   and the `₹` symbol.
5. Fast mode is off by default and its body copy matches verbatim.
6. Start match creates a local match and never issues a network request.
7. Reopening the screen restores opponents, difficulty and fast mode but resets the board to the
   last chosen board version if it still exists, otherwise to `Classic`.
8. Back discards the configuration without a confirm dialog.
9. Start match is bottom-anchored on tall devices and pinned above the scroll on short ones.
10. All controls ≥ 44dp including the 32dp stepper buttons (hit slop).
