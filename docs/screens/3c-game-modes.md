# 3c · Game modes

> Generated from `Royal Navy 1080 v2.dc.html` — option 3c, screens "Modes / default", "Modes / loading" (Session 9 export) · 19 September 2026.

## 1. Purpose and navigation position

The app's home. Route `/modes`, the root of the authenticated stack; Android back here exits the app.
Four mode rows plus a conditional resume button. Reached from `/splash`, `/auth`, `/result` and every
"back to home" exit.

## 2. Layout map

Frame 360 × 780dp, padding 17, flex-column, gap 13.

```
┌ 360 × 780 · padding 17 · gap 13 ────────────────┐
│ "Game modes" 700/22      [bell 39] [avatar 39]  │  flex:none, space-between
│ ┌ rows · flex:1 · gap 11 ────────────────────┐  │
│ │ [icon] Online multiplayer                  │  │  min-height 76
│ │        Host or join with a room code       │  │  (no caret)
│ │ [icon] Pass and play              ›        │  │
│ │        One phone, 2–6 players offline      │  │
│ │ [icon] Solo vs AI                 ›        │  │
│ │        Three difficulty levels             │  │
│ │ [icon] Board builder              ›        │  │
│ │        Author a custom board, any size     │  │
│ └─────────────────────────────────────────────┘ │
│ [ Resume: Friday Night · Rd 12 ]  green, 44dp   │  flex:none
└──────────────────────────────────────────────────┘
```

Row order is fixed: Online multiplayer, Pass and play, Solo vs AI, Board builder. The first row
carries **no caret** in the design; the other three do. Implement it exactly as drawn.

## 3. Element inventory

| # | Element | Component | Size / anchor | Tokens |
| --- | --- | --- | --- | --- |
| 1 | Frame | `ScreenFrame` | 360×780, padding 17, gap 13 | bg `linear-gradient(180deg,#133D8C,#0B2456 58%,#0E2E66)`, border 2dp `#2C6BE0`, radius 16 |
| 2 | Title | `Text` | left | `700 22px Baloo 2`, `#FFFFFF`, copy `Game modes` |
| 3 | Bell button | `IconButton` | 39×39, radius 14 | bg `rgba(8,26,64,.35)`, border 1dp `rgba(126,180,255,.28)`; `ph-bell` 17dp `#FFC84A` |
| 4 | Avatar button | `IconButton` | 39×39, radius 14 | bg `rgba(95,192,255,.18)`, border 1dp `rgba(95,192,255,.45)`; `ph-user-circle` 19dp `#5FC0FF` |
| 5 | Mode row | `ModeRow` | full width, min-height 76, radius 17, padding 14, gap 11 | bg `linear-gradient(180deg,#17489F,#123B88)`, border 1dp `rgba(126,180,255,.34)`, shadow `0 2px 0 rgba(6,20,54,.4), inset 0 1px 0 rgba(255,255,255,.08)` |
| 6 | Row icon chip | `IconChip` | 36×36, radius 12, border 1dp | per row, below |
| 7 | Row title | `Text` | `flex:1`, gap 2 above subtitle | `700 15px`, `#FFFFFF` |
| 8 | Row subtitle | `Text` | — | `600 13px`, `rgba(198,220,255,.82)` |
| 9 | Row caret | `ph-caret-right` | 16dp, right | `rgba(198,220,255,.6)` |
| 10 | Resume button | `Button.primaryGreen` | full width, min-height 44, radius 16, padding 13 | bg `linear-gradient(180deg,#7ADB25,#3FA209)`, shadow `0 4px 0 #2C7304, inset 0 1px 0 rgba(255,255,255,.45)`, label `700 15px`, `#062A06` |
| 11 | Skeleton row | `ModeRow.skeleton` | same box as #5 | chip and two bars at `rgba(126,180,255,.16)`; bars 13dp/62% and 10dp/44%, radius 8, gap 7 |

### Row icon chips (exact)

| Row | Glyph | Chip fill | Chip border | Glyph colour |
| --- | --- | --- | --- | --- |
| Online multiplayer | `ph-users-three` 18dp | `rgba(95,192,255,.18)` | `rgba(95,192,255,.45)` | `rgb(95,192,255)` |
| Pass and play | `ph-device-mobile` 18dp | `rgba(122,219,37,.18)` | `rgba(122,219,37,.45)` | `rgb(122,219,37)` |
| Solo vs AI | `ph-robot` 18dp | `rgba(255,200,74,.18)` | `rgba(255,200,74,.45)` | `rgb(255,200,74)` |
| Board builder | `ph-flag-checkered` 18dp | `rgba(167,123,255,.18)` | `rgba(167,123,255,.45)` | `rgb(167,123,255)` |

## 4. States

| State | Behaviour |
| --- | --- |
| default | As drawn. Resume button present only when an in-progress match exists; its label is `Resume: <match name> · Rd <round>` |
| loading | Header unchanged; four skeleton rows (#11); **no** resume button until the session query resolves |
| empty (no active match) | Identical to default minus the resume button; the rows block keeps `flex:1` |
| offline (entered via Play offline, or radio lost) | Online multiplayer row at 45% opacity, non-interactive, subtitle replaced with `Needs a connection`; all other rows normal. A `ph-wifi-slash` 14dp `#FF9A93` sits left of the title |
| error | Toast `E_SESSION_LOAD_FAILED` — `Couldn't load your matches.` with a `Retry` action; rows stay usable |
| disconnected / reconnecting | Socket is opened here; a drop shows the reconnect overlay (3k) above this screen |
| first-run | Identical, no active match, so no resume button |
| spectating / disabled | Not applicable |

## 5. Interactions

| Trigger | Validation | Optimistic UI | Server | Result |
| --- | --- | --- | --- | --- |
| Tap Online multiplayer | requires connectivity | row press state | — | push `/host` |
| Tap Pass and play | — | row press state | — | push `/modes/pass-and-play` |
| Tap Solo vs AI | — | row press state | — | push `/modes/solo` |
| Tap Board builder | — | row press state | — | push `/create` |
| Tap Resume | match still exists | button spinner | `GET /matches/:id` then socket `match:join` | push `/match/[matchId]`; if 404, toast `E_MATCH_GONE` — `That match has ended.` and the button disappears |
| Tap bell | — | — | `GET /notifications` | push the notification list; unread dot `#FFC84A` 8dp at the chip's top-right when `unread > 0` |
| Tap avatar | — | — | — | push `/profile` |
| Pull to refresh | — | skeleton rows | `GET /me/session` | refresh resume state |

## 6. Data contract

Reads: `GET /me/session` → `{ activeMatch: { id, name, round } | null, unreadNotifications: number }`.
Opens the Socket.IO connection on mount (namespace `/match`, no room joined).
Subscribes: `match:ended` (clears the resume button), `notification:new` (increments the bell dot).
Emits: nothing until a match is entered.

## 7. Responsive

- 360dp as designed. Extra height goes to the rows block (`flex:1`), which distributes gap 11 and
  keeps each row at its 76dp minimum — rows do not stretch to fill.
- Tablet: two-column grid of rows, gap 11, content capped at 720dp; resume button spans both columns.
- Landscape: header row, then a 2 × 2 grid, resume button pinned to the bottom.
- Safe area added to padding.
- Font scale 130%: row min-height grows to 92dp; subtitles wrap to two lines; nothing truncates.

## 8. Accessibility

- Each row is one `accessibilityRole="button"` with label `<title>, <subtitle>`.
- Bell label `Notifications, N unread`; avatar label `Your profile`.
- Resume label `Resume Friday Night, round 12`.
- Focus order: title → bell → avatar → rows top to bottom → resume.
- All targets ≥ 44dp (rows are 76dp; the 39dp icon buttons are padded to 44dp hit slop).
- Contrast: `#FFFFFF` on `#17489F` = 8.6:1; `rgba(198,220,255,.82)` on `#17489F` = 6.3:1;
  `#062A06` on `#7ADB25` = 9.8:1 — pass.

## 9. Animation

| What | Duration | Easing |
| --- | --- | --- |
| Row press (scale 0.985, shadow 2 → 1dp) | 90ms | `ease-out` |
| Skeleton shimmer sweep | 1200ms loop | `linear` |
| Skeleton → content cross-fade | 200ms | `ease-out` |
| Resume button entry (opacity + 6dp rise) | 220ms | `cubic-bezier(0.2,0.8,0.2,1)` |

## 10. Acceptance criteria

1. Four rows render in the documented order with the exact titles and subtitles.
2. Each row icon chip uses the exact fill, border and glyph colour in §3.
3. The first row has no caret; rows 2–4 do.
4. Loading shows four skeleton rows and no resume button.
5. The resume button appears only with an active match and reads `Resume: <name> · Rd <round>`.
6. Tapping resume on a deleted match shows `That match has ended.` and removes the button.
7. In offline mode the Online multiplayer row is visibly disabled and cannot be tapped.
8. The bell shows an unread dot when `unreadNotifications > 0`.
9. Android back exits the app from this route.
10. At 130% font scale all four rows and the resume button remain fully visible without scrolling on
    a 360 × 780dp device.
