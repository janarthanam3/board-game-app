# 3l · Rules (read-only)

> Generated from `Royal Navy 1080 v2.dc.html` — option 3l, screen "Rules — read only" (Session 9 export) · 19 September 2026.

## 1. Purpose and navigation position

What the lobby's "See all rules" opens: the board's rules, stated plainly, with no controls. Route
`/lobby/[matchId]/rules`. Also reachable from the pause sheet's `Rules` during a match, where it
renders identically. Back, or `Close`, returns to the caller.

## 2. Layout map

Frame 360 × 780, padding 17, flex-column, gap 13.

```
┌──────────────────────────────────────────────────┐
│ Rules                                   [Close]  │
│ Chennai Edition · 24 tiles                       │
│ ┌ dv-scroll · flex:1 · overflow-y auto · gap 13┐ │
│ │ ── MONEY ─────────────────────────────────  │ │
│ │ Starting cash            ₹10,000            │ │
│ │ Salary on passing GO     ₹2,000             │ │
│ │ Free parking pot         winner takes the   │ │
│ │                          pot          [on]  │ │
│ │ ── COLOUR SETS ───────────────────────────  │ │
│ │ Set bonus      rent doubles at three  3 of 5│ │
│ │ Build without full set        not allowed   │ │
│ │ ── JAIL ──────────────────────────────────  │ │
│ │ Bail                     ₹500               │ │
│ │ Max turns in jail        3                  │ │
│ │ Rent while in jail       collected          │ │
│ │ ── AUCTION ───────────────────────────────  │ │
│ │ Declined purchase        goes to auction    │ │
│ │ Bid step                 ₹100               │ │
│ │ Bid timer                15s                │ │
│ └───────────────────────────────────────────────┘│
│ "Only the host can change these, before the      │
│  match starts."                                  │
└──────────────────────────────────────────────────┘
```

Section order is fixed: `MONEY`, `COLOUR SETS`, `JAIL`, `AUCTION`.

## 3. Element inventory

| # | Element | Component | Tokens |
| --- | --- | --- | --- |
| 1 | Frame | `ScreenFrame` | 360×780, padding 17, gap 13 | standard screen tokens |
| 2 | Title | `Text` | `700 19px` `#FFFFFF` = `Rules` |
| 3 | Subtitle | `Text` | `600 12px` `rgba(198,220,255,0.8)` = `<board name> · <n> tiles` |
| 4 | Close | `Button.small` | min-height 36 (hit slop 44), radius 13, bg `rgba(8,26,64,.35)`, border 1dp `rgba(126,180,255,.45)`, `700 13px` `rgba(198,220,255,0.95)` = `Close` |
| 5 | Scroll region | `ScrollView` (`dv-scroll`) | `flex:1`, `overflow-y:auto`, gap 13 |
| 6 | Section label | `SectionLabel` | `800 11px` `.12em` `rgba(198,220,255,0.8)` + hairline `rgba(126,180,255,.18)` |
| 7 | Rule row | `ReadonlyRow` | card tokens, min-height 44, padding 10/12; label `600 14px` `rgba(198,220,255,0.95)`; value `800 14px` `#FFC84A` for money and numbers, `600 13px` `rgba(198,220,255,0.95)` for phrases |
| 8 | Qualifier chip | `Tag.neutral` | radius 9, padding 3/8, `700 11px` `rgba(198,220,255,0.95)` on `rgba(126,180,255,.16)` — used for `3 of 5` and `on` |
| 9 | Footnote | `Text` | `flex:none`, `600 12px` `rgba(198,220,255,0.75)` = `Only the host can change these, before the match starts.` |

### Rows (verbatim, in order)

| Section | Label | Value | Chip |
| --- | --- | --- | --- |
| MONEY | `Starting cash` | `₹10,000` | — |
| MONEY | `Salary on passing GO` | `₹2,000` | — |
| MONEY | `Free parking pot` | `winner takes the pot` | `on` |
| COLOUR SETS | `Set bonus` | `rent doubles at three` | `3 of 5` |
| COLOUR SETS | `Build without full set` | `not allowed` | — |
| JAIL | `Bail` | `₹500` | — |
| JAIL | `Max turns in jail` | `3` | — |
| JAIL | `Rent while in jail` | `collected` | — |
| AUCTION | `Declined purchase` | `goes to auction` | — |
| AUCTION | `Bid step` | `₹100` | — |
| AUCTION | `Bid timer` | `15s` | — |

Every value is read from the board version — nothing on this screen is editable, ever, by anyone.
It is the read-only face of the rule lab (`2a` §3.5).

## 4. States

| State | Behaviour |
| --- | --- |
| default | As drawn |
| loading | Rows render as skeleton bars for at most one frame in the lobby (rules travel with the lobby payload); in-match they are already in memory |
| feature off | A rule that is off still shows its row, with the value `off` in `rgba(198,220,255,0.8)` and no chip — rows are never hidden |
| board without a section | The section header and its rows are omitted entirely (a board with no jail tile omits `JAIL`) |
| in-match | Identical, plus the footnote changes to `These were locked in when the match started.` |
| error | Falls back to the cached board version; if none exists, an error card `Couldn't load these rules.` with `Retry` |
| offline | No difference in-match; in the lobby the cached copy renders |
| spectating | Identical and read-only |
| disabled / reconnecting / disconnected / first-run | Not applicable |

## 5. Interactions

| Trigger | Result |
| --- | --- |
| `Close` | pop to the caller (lobby or pause sheet) |
| Android back | same as `Close` |
| Scroll | the scroll region is the only scroller; the title, subtitle and footnote never move |
| Long-press a row | copy the rule as text (`<label>: <value>`) to the clipboard; toast `Copied.` |

There is no editing affordance anywhere on this screen. Host-side changes happen in the rule lab
before the match starts.

## 6. Data contract

Reads the resolved `boardVersion.rules` object already present in the lobby or match state. No
endpoint of its own; no socket subscriptions. Values are rendered through the same formatter the
HUD uses (`₹` with Indian grouping, seconds as `<n>s`).

## 7. Responsive

- 360dp as designed. Tablet: two columns of sections, capped at 720dp.
- Landscape: the scroll region shrinks; the footnote stays pinned.
- Font scale 130%: rows stack label over value; the chip moves under the value.

## 8. Accessibility

- Each row is one focus stop: `Starting cash, 10,000 rupees`.
- Section labels are `accessibilityRole="header"`.
- `Close` is the first focus stop after the title.
- The footnote is read after the last row, not before.
- Contrast: `#FFC84A` on card = 7.5:1; body values = 6.3:1 — pass.

## 9. Animation

| What | Duration | Easing |
| --- | --- | --- |
| Present (slide up from the lobby) | 240ms | `cubic-bezier(0.2,0.8,0.2,1)` |
| Dismiss | 200ms | `ease-in` |
| Row long-press feedback | 90ms + 20ms haptic | `ease-out` |

## 10. Acceptance criteria

1. Sections render in the order `MONEY`, `COLOUR SETS`, `JAIL`, `AUCTION`.
2. All eleven rows render with the labels and values in §3, verbatim.
3. Money values use `₹` with Indian grouping; timers render as `<n>s`.
4. The `3 of 5` and `on` qualifiers render as chips, not plain text.
5. Nothing on the screen is editable, including in the host's own lobby.
6. The footnote reads exactly `Only the host can change these, before the match starts.` in the
   lobby, and the in-match variant during a match.
7. A board section with no applicable rules is omitted rather than shown empty.
8. `Close` and Android back both return to the caller.
9. The scroll region is the only scroller.
10. Values match the rule lab's saved values exactly, with no re-derivation.
