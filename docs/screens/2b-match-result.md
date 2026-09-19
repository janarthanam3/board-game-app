# 2b · Match result

> Generated from `Royal Navy 1080 v2.dc.html` — option 2b, screens "Match result", "Per-player breakdown" (Session 9 export) · 19 September 2026.

## 1. Purpose and navigation position

The end-of-match screen: winner, standings, stats, the net-worth chart, awards, a log preview, and
a per-player breakdown. Route `/result/[matchId]`, with `?playerId=` for the breakdown. Reached
automatically when a match ends, from `1g`, from `3r`, and from history rows on `3h`. Back goes to
`/modes`; the match cannot be re-entered.

## 2. Layout map

### 2.1 Result

```
┌──────────────────────────────────────────────────┐
│ Match result                                     │
│ Friday Night · Chennai Edition · 28m · 20 rounds │
│ ── WINNER ────────────────────────────────────   │
│ Naveen                                ₹8,420     │
│ Last player standing · round 38     net worth    │
│ ── FINAL STANDINGS ─────────────── 6 players ─   │
│ 1 Naveen    ₹8,420  12 tiles · 4 hotels ·        │
│                     cash ₹2,110                  │
│ 2 Priya     ₹3,110  7 tiles · 2 hotels ·         │
│                     cash ₹640                    │
│ 3 Arun      ₹1,240  4 tiles · 1 house ·          │
│                     cash ₹180                    │
│ 4 Meera       ₹460  2 tiles · cash ₹60           │
│ 5 Karthik  bankrupt out on round 31 · owed ₹1,900│
│ 6 Divya    bankrupt out on round 22 · owed ₹740  │
│ ── MATCH STATS ───────────────────────────────   │
│ 38 Rounds       │ ₹24,600 Rent paid              │
│ 27 Tiles sold   │ 9 Jail visits                  │
│ Net worth over rounds                            │
│ "Tap a player to highlight"                      │
│ ┌ line chart · round 1 → round 38 ────────────┐  │
│ └───────────────────────────────────────────────┘│
│ legend: Naveen · Priya · Meera · Karthik · Anil  │
│         · Divya                                  │
│ ── AWARDS ────────────────────────────────────   │
│ Landlord         Naveen · 12 tiles               │
│ Most rent paid   Karthik · ₹6,300                │
│ Jailbird         Arun · 4 visits                 │
│ Best deal        Priya · Bay Rd swap             │
│ ── MATCH LOG ──────────────────────── [ Open ]   │
│ R 38  Meera bankrupt · Naveen wins               │
│ R 34  Hotel built on Park Place                  │
│ R 31  Karthik out · purple set to Naveen         │
│ [ Share ]      [ Home ]      [ Rematch ]         │
└──────────────────────────────────────────────────┘
```

### 2.2 Per-player breakdown

```
┌──────────────────────────────────────────────────┐
│ ‹ Naveen                               Winner    │
│   1st of 6 · Friday Night                        │
│ ₹8,420 Net worth │ ₹2,110 Cash │ 12 Tiles │ 4    │
│                                          Hotels  │
│ ── MONEY ─────────────────────────────────────   │
│ rent collected ₹9,180   rent paid    ₹3,240      │
│ tiles bought   ₹6,900   build spend  ₹2,850      │
│ card gains     ₹1,400   tax + fines    ₹980      │
│ ── PORTFOLIO ─────────────────────── 12 tiles ─  │
│ set counts: 3 · 3 · 4 · 2                        │
│ Park Place  ₹4,200  rent gain · 1 hotel          │
│ Old Town    ₹1,860  rent gain · 3 houses         │
│ Bay Road    ₹1,340  rent gain · 1 hotel          │
│ Mill St       ₹780  rent gain · 2 houses         │
│ Bazaar        ₹520  rent gain · 1 house          │
│ +7 more                                          │
│ [ ‹ Prev ]     [ Next › ]           [ Done ]     │
└──────────────────────────────────────────────────┘
```

## 3. Element inventory

| # | Element | Component | Tokens |
| --- | --- | --- | --- |
| 1 | Header | `ScreenHeader` | title `700 19px` `#FFFFFF` = `Match result`; subtitle `600 12px` `rgba(198,220,255,0.8)` = `<match> · <board> · <duration> · <rounds> rounds` |
| 2 | Section label | `SectionLabel` | `800 11px` `.12em` `rgba(198,220,255,0.8)` + hairline; copies `WINNER`, `FINAL STANDINGS`, `MATCH STATS`, `AWARDS`, `MATCH LOG`, `MONEY`, `PORTFOLIO` |
| 3 | Winner card | `Card.accent` | border 1dp `rgba(255,200,74,.45)`, fill `rgba(255,200,74,.09)`; name `800 22px` `#FFFFFF`; reason `600 12px` `rgba(198,220,255,0.8)` = `<how> · round <n>`; value `800 22px` `#FFC84A` with the key `net worth` `600 11px` |
| 4 | Standing row | `RankRow` | card tokens, min-height 56; rank `800 15px` — `#FFC84A` for 1–3, `rgba(198,220,255,0.8)` below; name `700 15px` `#FFFFFF`; value `800 15px` `#FFC84A`, or `bankrupt` in `700 13px` `#FF9A93`; detail `600 12px` `rgba(198,220,255,0.8)` |
| 5 | Stat tile | `StatTile` ×4 | 2×2 grid, gap 11; value `800 19px` `#FFFFFF`; label `600 12px` `rgba(198,220,255,0.8)` |
| 6 | Chart | `MultiLineChart` (SVG) | one 2dp stroke per player in their seat colour; grid 1dp `rgba(126,180,255,.16)`; axis labels `600 10px` `rgba(198,220,255,0.75)` = `round 1`, `round <last>`; hint `600 11px` `rgba(198,220,255,0.75)` = `Tap a player to highlight`; `data-om-raster` on the container |
| 7 | Chart legend | `ChipRow` | one chip per player, seat swatch 8dp + name `600 12px`; the highlighted player's chip gains a 1dp `rgba(95,192,255,.45)` border |
| 8 | Award row | `Row` ×4 | label `600 13px` `rgba(198,220,255,0.8)`; value `700 13px` `#FFFFFF` |
| 9 | Log preview row | `Row` ×3 | round badge `700 11px` `rgba(198,220,255,0.8)` on `rgba(126,180,255,.16)`; sentence `600 13px` `rgba(198,220,255,0.95)` |
| 10 | Open log | `Button.small` | `#5FC0FF` tokens, label `Open` |
| 11 | Footer actions | `Row` | `Share` ghost `flex:1`; `Home` ghost `flex:1`; `Rematch` gold `flex:1.4`, height 50, `800 16px` `#3A2402` |
| 12 | Breakdown header | `ScreenHeader` | caret + name `700 19px`; `Winner` tag `700 11px` `#FFC84A` on `rgba(255,200,74,.18)`; subtitle `600 12px` = `<n>th of <m> · <match>` |
| 13 | Breakdown KPI | `StatTile` ×4 | `₹<n> Net worth`, `₹<n> Cash`, `<n> Tiles`, `<n> Hotels` |
| 14 | Money grid | `KeyValueGrid` | 2 columns × 3 rows; keys `600 11px` `rgba(198,220,255,0.8)`; values `800 13px` `#FFC84A` |
| 15 | Set counts | `Row` | one chip per colour group showing the tiles held, in group colour |
| 16 | Portfolio row | `Row` ×5 | tile name `700 14px` `#FFFFFF`; gain `800 14px` `#FFC84A`; detail `600 12px` `rgba(198,220,255,0.8)` = `rent gain · <buildings>` |
| 17 | Overflow row | `TextButton` | `600 13px` `#5FC0FF` = `+<n> more` |
| 18 | Breakdown footer | `Row` | `‹ Prev` ghost, `Next ›` ghost, `Done` gold |

### Exact content as drawn

Stats: `38 Rounds` · `₹24,600 Rent paid` · `27 Tiles sold` · `9 Jail visits`.
Awards: `Landlord — Naveen · 12 tiles` · `Most rent paid — Karthik · ₹6,300` ·
`Jailbird — Arun · 4 visits` · `Best deal — Priya · Bay Rd swap`.
Log preview: `R 38 Meera bankrupt · Naveen wins` · `R 34 Hotel built on Park Place` ·
`R 31 Karthik out · purple set to Naveen`.
Money grid keys: `rent collected`, `rent paid`, `tiles bought`, `build spend`, `card gains`,
`tax + fines`.

## 4. States

| State | Behaviour |
| --- | --- |
| default | As drawn |
| ended by round cap | The winner reason reads `Highest net worth · round <cap>` instead of `Last player standing · round <n>` |
| you won | The winner card gains a `700 11px` `#FFC84A` `YOU` tag; the share sheet text changes accordingly |
| you were bankrupt | Your standing row shows `bankrupt` and `out on round <n> · owed ₹<n>`; the chart still includes your line up to elimination |
| loading | Winner card and standings render first from the final `match:ended` payload; stats, chart and awards fill in from `GET /matches/:id/result` |
| error | The lower sections are replaced by an error card with `Retry`; standings always render from the socket payload |
| offline | Standings and stats render from the local record; the chart and awards show `600 12px` `rgba(198,220,255,0.8)`: `Needs a connection.` |
| rematch opened | `Rematch` becomes `Join rematch` in `#7ADB25` tokens when another player opens one first |
| rematch unavailable | `Rematch` is 45% opacity with the hint `The host isn't here.` — only present for online matches |
| local modes | `Share` and `Rematch` are replaced by a single `Play again` gold action that reuses the same setup |
| breakdown, non-member | Not reachable — only members can open a per-player breakdown |
| spectating | Standings and stats only; no breakdown, no rematch |

## 5. Interactions

| Trigger | Result |
| --- | --- |
| Standing row tap | push `/result/[matchId]?playerId=<id>` (the breakdown) |
| Chart legend chip / line tap | highlight that player's line to 3dp and dim the others to 30%; tapping again clears |
| `Open` (match log) | push `/match/[matchId]/log` (`2c`) |
| `Share` | Android share sheet with a text summary and `royalnavy://result/<matchId>` |
| `Home` | `router.replace('/modes')` |
| `Rematch` | `POST /matches/rematch { matchId }` → replace to the new `/lobby/[matchId]`; every other player gets a `rematch:opened` invite |
| `‹ Prev` / `Next ›` | move through players in standing order, wrapping at both ends |
| `+<n> more` | expand the portfolio list in place |
| `Done` / Android back (breakdown) | pop to the result screen |
| Android back (result) | `router.replace('/modes')` — the match is never re-entered |

## 6. Data contract

`match:ended` payload → `{ matchId, standings, winner, endedBy, rounds, durationMinutes }`.
`GET /matches/:id/result` →
`{ stats, netWorthSeries: [{ playerId, points: [{ round, netWorth }] }], awards, logPreview, perPlayer: { [playerId]: { money, portfolio, setCounts } } }`.
`POST /matches/rematch`. Net worth uses the rulebook formula; mortgaged tiles count at half value.

## 7. Responsive

- 360dp as designed; one scrolling column with the footer actions pinned.
- Tablet: standings left, stats + chart + awards right; the breakdown becomes a two-column sheet.
- Landscape: same split.
- Font scale 130%: standing rows stack detail under name; the stats grid stays 2×2 and grows.
- The chart is fluid (`viewBox` + `preserveAspectRatio`), never a fixed pixel width.

## 8. Accessibility

- The winner card announces first: `Winner, Naveen, net worth 8,420 rupees, last player standing, round 38`.
- Standing rows are one focus stop each, including the detail line.
- The chart has an `accessibilityLabel` summarising each player's start and end net worth, plus a
  visually hidden data table.
- Award rows read `Landlord, Naveen, 12 tiles`.
- Contrast: `#FFC84A` on the winner tint = 7.2:1; `#FF9A93` on card = 5.4:1 at 13dp bold — pass.

## 9. Animation

| What | Duration | Easing |
| --- | --- | --- |
| Winner card entry (scale 0.94 → 1 + gold glow fade) | 420ms | `cubic-bezier(0.2,0.8,0.2,1)` |
| Standings cascade (30ms stagger) | 480ms total | `ease-out` |
| Stat count-up | 400ms | `ease-out` |
| Chart line draw (per player, 60ms stagger) | 700ms total | `ease-out` |
| Legend highlight | 180ms | `ease-out` |
| Breakdown push | 260ms slide | `cubic-bezier(0.2,0.8,0.2,1)` |

## 10. Acceptance criteria

1. The subtitle shows match name, board, duration and round count.
2. The winner card states how the match was won and the winning net worth.
3. Standings list every player including bankrupts, with their round of elimination and debt.
4. The four match stats render with the labels in §3.
5. The chart plots one line per player in their seat colour, from round 1 to the final round, and
   tapping a legend chip highlights that line.
6. All four awards render with their exact labels.
7. The log preview shows three entries and `Open` reaches the full log.
8. `Share` produces a summary with the result deep link.
9. `Rematch` creates a new lobby on the same board and invites the other players.
10. The breakdown shows the four KPIs, the six money keys, set counts and the top five portfolio
    rows with `+<n> more`.
11. `‹ Prev` and `Next ›` move through players in standing order and wrap.
12. Back from the result always lands on `/modes`; the match cannot be re-entered.
