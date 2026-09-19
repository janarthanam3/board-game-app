# 2c · Match log

> Generated from `Royal Navy 1080 v2.dc.html` — option 2c, screen "Match log" (Session 9 export) · 19 September 2026.

## 1. Purpose and navigation position

The full, permanent record of a match, grouped by round. Route `/match/[matchId]/log`, opened from
the pause sheet's overflow, from `1g`, and from `Open` on the result screen (`2b`). `Close` or
Android back returns to the caller.

## 2. Layout map

Frame 360 × 780, padding 17, flex-column, gap 13.

```
┌──────────────────────────────────────────────────┐
│ Match log                               [Close]  │
│ Friday Night · 124 entries                       │
│ [ 🔍 Search the log ]                            │
│ [ All | Money | Property | Jail | Cards ]        │
│ ┌ dv-scroll · flex:1 · overflow-y auto ────────┐ │
│ │ ── ROUND 12 ──────────────────────────────── │ │
│ │ You paid Naveen ₹1,200 rent on Park     R12  │ │
│ │ Place.                                       │ │
│ │ Priya mortgaged Marine Drive for ₹900.  R12  │ │
│ │ Meera rolled 8 and landed on Chance.    R12  │ │
│ │ ── ROUND 11 ──────────────────────────────── │ │
│ │ You won Bandra Hill at auction for      R11  │ │
│ │ ₹1,400.                                      │ │
│ │ Karthik went to jail on a third double. R11  │ │
│ │ Meera drew "Bank error in your favour"  R11  │ │
│ │ and took ₹500.                               │ │
│ │ Naveen and Priya traded two tiles.      R11  │ │
│ │ ── ROUND 10 ──────────────────────────────── │ │
│ │ Naveen built three houses on the blue   R10  │ │
│ │ set.                                         │ │
│ │ You passed GO and collected ₹2,000.     R10  │ │
│ └───────────────────────────────────────────────┘│
└──────────────────────────────────────────────────┘
```

Newest round first; within a round, newest entry first.

## 3. Element inventory

| # | Element | Component | Tokens |
| --- | --- | --- | --- |
| 1 | Frame | `ScreenFrame` | 360×780, padding 17, gap 13 | standard screen tokens |
| 2 | Title | `Text` | `700 19px` `#FFFFFF` = `Match log` |
| 3 | Subtitle | `Text` | `600 12px` `rgba(198,220,255,0.8)` = `<match name> · <n> entries` |
| 4 | Close | `Button.small` | min-height 36 (hit slop 44), radius 13, bg `rgba(8,26,64,.35)`, border 1dp `rgba(126,180,255,.45)`, `700 13px` `rgba(198,220,255,0.95)` = `Close` |
| 5 | Search | `Input.search` | height 46, radius 17, border 1dp `rgba(126,180,255,0.27)`, `ph-magnifying-glass` 16dp, placeholder `Search the log` |
| 6 | Category chips | `ChipRow` | `All`, `Money`, `Property`, `Jail`, `Cards`; active bg `rgba(95,192,255,.18)`, border `rgba(95,192,255,.45)`, `#5FC0FF` |
| 7 | Round header | `SectionLabel` (sticky) | `800 11px` `.12em` `rgba(198,220,255,0.8)` = `ROUND <n>` + hairline `rgba(126,180,255,.18)`; sticks to the top of the scroll region while its round is in view |
| 8 | Log row | `LogRow` | card tokens, min-height 44, padding 10/12, gap 9; sentence `600 13px` `rgba(198,220,255,0.95)`; the local player's name is rendered as `You` in `700 13px` `#FFFFFF` |
| 9 | Round badge | `Tag.neutral` | radius 8, padding 2/6, `700 11px` `rgba(198,220,255,0.8)` on `rgba(126,180,255,.16)` = `R<n>` |
| 10 | Money emphasis | `Text` (inline) | amounts in `700 13px` `#FFC84A` inside the sentence |

### Entries as drawn (verbatim)

`You paid Naveen ₹1,200 rent on Park Place.` · `Priya mortgaged Marine Drive for ₹900.` ·
`Meera rolled 8 and landed on Chance.` · `You won Bandra Hill at auction for ₹1,400.` ·
`Karthik went to jail on a third double.` ·
`Meera drew "Bank error in your favour" and took ₹500.` · `Naveen and Priya traded two tiles.` ·
`Naveen built three houses on the blue set.` · `You passed GO and collected ₹2,000.`

## 4. Entry categories

| Chip | Includes |
| --- | --- |
| `Money` | rent, salary, tax, fines, card money, auction payments, trades of cash |
| `Property` | purchases, auctions won, builds, sells, mortgages, redemptions, trades of tiles |
| `Jail` | entering, bail paid, doubles out, released after the maximum |
| `Cards` | every card drawn and its effect |
| `All` | everything above plus lobby lines (`lobby · <name> removed`), disconnects and match start/end |

Every entry carries a category; `All` never hides anything. Lobby and system lines appear only
under `All`.

## 5. States

| State | Behaviour |
| --- | --- |
| default | As drawn, live-appending while the match runs |
| live append | A new entry slides in at the top of the current round; if the user has scrolled away, a `New entries` pill appears at the top of the scroll region and tapping it scrolls to the top |
| search active | Round headers persist; only matching entries are shown; matches are highlighted with `rgba(255,200,74,.18)` behind the term |
| no results | Centred line `600 13px` `rgba(198,220,255,0.8)`: `Nothing in the log matches "<query>".` |
| filtered empty | `No <category> entries yet.` |
| loading | Ten skeleton rows in the scroll region |
| finished match | Identical, no live appending; the subtitle is unchanged |
| offline (online match) | Cached entries render with a `600 12px` `#FF9A93` foot line: `Offline — entries since <time> are missing.` |
| local modes | Fully available; the log is stored with the local match |
| error | Error card at the top with `Retry`; loaded entries remain |
| spectating | Public entries only — private prompts and hand contents never appear |

## 6. Interactions

| Trigger | Result |
| --- | --- |
| Type in search | debounce 250ms, min 2 characters; filter in place |
| Category chip | filter; scroll resets to the top |
| Row tap | if the entry references a tile, open that property card (`1j`); otherwise no-op |
| Long-press a row | copy the sentence to the clipboard; toast `Copied.` |
| `New entries` pill | scroll to the top |
| Scroll to the foot | load the previous 50 entries |
| `Close` / Android back | pop to the caller |

## 7. Data contract

In-match: entries arrive on `match:event` and are appended locally; the client keeps the full log
in memory for the session and persists it with the match record.
After the match: `GET /matches/:id/log?cursor=&limit=50` →
`{ items: [{ id, round, category, sentence, refs: { tileIndex?, playerId? } }], nextCursor }`.
Sentences are generated **server-side** so every player sees identical wording, with `You`
substituted client-side for the viewer's own name.

## 8. Responsive

- 360dp as designed; the scroll region is the only scroller and round headers stick.
- Tablet: single column capped at 640dp — the log stays a reading column, not a grid.
- Landscape: search and chips on one row above the list.
- Font scale 130%: rows grow; the round badge moves below the sentence rather than truncating it.

## 9. Accessibility

- Round headers are `accessibilityRole="header"`; the list announces `Match log, 124 entries`.
- Each row is one focus stop reading the full sentence including the round.
- Live appends are announced politely, at most one every 2000ms to avoid flooding.
- Search results announce their count.
- Contrast: `#FFC84A` inline on card = 7.5:1; body = 6.5:1 — pass.

## 10. Animation

| What | Duration | Easing |
| --- | --- | --- |
| New entry slide-in | 200ms | `ease-out` |
| `New entries` pill in / out | 180ms | `ease-out` / `ease-in` |
| Filter cross-fade | 180ms | `ease-out` |
| Older page fade-in | 160ms | `ease-out` |

## 11. Acceptance criteria

1. Entries group under sticky `ROUND <n>` headers, newest round first, newest entry first.
2. Every row carries an `R<n>` badge matching its group.
3. The viewer's own name is rendered `You` in every sentence.
4. Money amounts are emphasised in gold with `₹` and Indian grouping.
5. Category chips are `All`, `Money`, `Property`, `Jail`, `Cards`; `All` hides nothing.
6. Search needs two characters, debounces at 250ms, and highlights matches.
7. Live entries append without moving the user's scroll position; the `New entries` pill offers the
   jump.
8. Rows referencing a tile open that property card.
9. Sentences are server-generated and identical across clients.
10. Spectators never see private entries.
