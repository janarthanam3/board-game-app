# 1f · Board detail

> Generated from `Royal Navy 1080 v2.dc.html` — option 1f, screens "Board detail / default", "Board detail / all rules (read-only)" (Session 9 export) · 19 September 2026.

## 1. Purpose and navigation position

A published board's page: map preview, rules summary, and the full read-only rulebook. Routes
`/catalogue/[boardVersionId]` and `/catalogue/[boardVersionId]/rules`. Opened from a catalogue card
(`1e`). Back returns to the catalogue; `Use this board` returns to `/host` with the version applied.

## 2. Layout map

### 2.1 Default

```
┌──────────────────────────────────────────────────┐
│ ‹  Board detail                                  │
│    From the board catalogue                      │
│ Chennai Edition                                  │
│ version 2 · published 3 days ago                 │
│ @arvind · 24 tiles · 1,240 plays                 │
│ ── BOARD ───────── "pinch to zoom · drag to pan" │
│ ┌ map preview (GO · JAIL · GO TO · FREE) ─────┐  │
│ │        Chennai Edition                      │  │
│ │        24 tiles · 3 colour sets · 2 decks   │  │
│ └───────────────────────────────────────────────┘│
│ ── RULES ────────── [ See all rules · read-only ]│
│ Chennai Edition · @arvind                        │
│ Starting cash ₹15,000     Round cap 40           │
│ Colour sets own 3 of 5    Auction on decline  on │
│ [ Use this board ]  gold                         │
│ [ Host a match ]                                 │
│ [ Report board ]                                 │
└──────────────────────────────────────────────────┘
```

### 2.2 All rules (read-only)

```
┌──────────────────────────────────────────────────┐
│ ‹  All rules                                     │
│    Chennai Edition · version 2                   │
│ "Read-only. Published boards are frozen — the    │
│  author publishes a new version to change rules."│
│ ── MONEY ──   Starting cash ₹15,000              │
│               Pass GO ₹2,000                     │
│               Income tax 10% of cash             │
│               Free parking pot off               │
│ ── PROPERTY ──  Auction on decline on            │
│                 Mortgage value 50% of cost       │
│                 Redeem cost mortgage + 10%       │
│                 Build evenly on                  │
│ ── COLOUR SETS ── Threshold own 3 of 5           │
│                   Mortgage breaks the set yes    │
│                   Per-group overrides none       │
│ ── JAIL ──   Jail on                             │
│              Leave by doubles or ₹500            │
│              Max turns held 3 rounds             │
│ ── ROUNDS AND PACE ── Round cap 40 rounds        │
│                       Ends on last player with   │
│                       cash                       │
│                       Turn timer 45 seconds      │
│ ── CARD DECKS ── Chance 16 cards                 │
│                  Community chest 16 cards        │
│                  Unmatched roll falls back to    │
│                  Chance                          │
│ [ Back ]  [ Use this board ]  [ Report board ]   │
└──────────────────────────────────────────────────┘
```

## 3. Element inventory

| # | Element | Component | Tokens |
| --- | --- | --- | --- |
| 1 | Header | `ScreenHeader` | title `700 19px` `#FFFFFF` = `Board detail` / `All rules`; subtitle `600 12px` `rgba(198,220,255,0.8)` = `From the board catalogue` / `<board> · version <n>` |
| 2 | Board title block | `View` | name `800 22px` `#FFFFFF`; version line `600 12px` `rgba(198,220,255,0.8)` = `version <n> · published <when>`; meta line `600 12px` = `@handle · <n> tiles · <n> plays` |
| 3 | Section label | `SectionLabel` | `800 11px` `.12em` `rgba(198,220,255,0.8)` + hairline; copies `BOARD`, `RULES`, and the rulebook sections |
| 4 | Pan hint | `Text` | `600 10px` `rgba(198,220,255,0.75)` = `pinch to zoom · drag to pan` |
| 5 | Map preview | `BoardMap.readonly` | aspect 1:1, radius 17, bg `rgba(8,26,64,.35)`, border 1dp `rgba(126,180,255,.28)`; corner labels `GO`, `JAIL`, `GO TO`, `FREE` in `800 9px` `.14em` `rgba(198,220,255,0.8)`; centre caption name `700 15px` `#FFFFFF` + `600 12px` `rgba(198,220,255,0.8)` = `<n> tiles · <n> colour sets · <n> decks` |
| 6 | Rules summary | `Card` | board line `700 14px` + author `600 12px`; 2×2 key/value grid — keys `600 12px` `rgba(198,220,255,0.8)`, values `800 13px` `#FFC84A` (money) / `700 13px` `#FFFFFF` |
| 7 | See all rules | `Button.small` | `#5FC0FF` tokens, label `See all rules · read-only` |
| 8 | Primary action | `Button.primaryGold` | full width, height 50, `800 16px` `#3A2402` = `Use this board` |
| 9 | Secondary action | `Button.ghost` | full width, min-height 44, `700 15px` `rgba(198,220,255,0.95)` = `Host a match` |
| 10 | Report | `Button.danger` | full width, min-height 44, bg `rgba(240,82,74,.14)`, border 1dp `rgba(240,82,74,.6)`, `700 15px` `#FF9A93` = `Report board` |
| 11 | Frozen note | `Text` | `600 12px` `#5FC0FF` = `Read-only. Published boards are frozen — the author publishes a new version to change rules.` |
| 12 | Rule row | `ReadonlyRow` | card tokens, min-height 44; label `600 14px` `rgba(198,220,255,0.95)`; value `800 14px` `#FFC84A` for money, `600 13px` `rgba(198,220,255,0.95)` for phrases |

### Rulebook rows (verbatim, in order)

| Section | Rows |
| --- | --- |
| `MONEY` | `Starting cash ₹15,000` · `Pass GO ₹2,000` · `Income tax 10% of cash` · `Free parking pot off` |
| `PROPERTY` | `Auction on decline on` · `Mortgage value 50% of cost` · `Redeem cost mortgage + 10%` · `Build evenly on` |
| `COLOUR SETS` | `Threshold own 3 of 5` · `Mortgage breaks the set yes` · `Per-group overrides none` |
| `JAIL` | `Jail on` · `Leave by doubles or ₹500` · `Max turns held 3 rounds` |
| `ROUNDS AND PACE` | `Round cap 40 rounds` · `Ends on last player with cash` · `Turn timer 45 seconds` |
| `CARD DECKS` | `Chance 16 cards` · `Community chest 16 cards` · `Unmatched roll falls back to Chance` |

`3l` is the in-lobby summary of the same data; this screen is the full rulebook. Both are read-only.

## 4. States

| State | Behaviour |
| --- | --- |
| default | As drawn |
| loading | Title block real, map and rules summary as skeletons |
| picker mode (from `/host`) | `Use this board` is the primary action |
| browse mode (from `/create`) | `Use this board` is replaced by `Host a match`, which creates a room on this board directly |
| unpublished / withdrawn | Whole body replaced by an error state: `This board isn't available.` / `The author took it offline. Ask them for the new version.` with a `Back to catalogue` action |
| version superseded | An info line above the actions: `600 12px` `#FFC84A` = `Version <n+1> is live. You're viewing <n>.` |
| error | Error card with `Retry` |
| offline | Cached detail renders; actions that need a connection are 45% opacity with the hint `Needs a connection` |
| reported | `Report board` becomes a non-interactive `Reported` chip for the session |
| spectating / disabled / reconnecting / disconnected / first-run | Not applicable |

## 5. Interactions

| Trigger | Validation | Server | Result |
| --- | --- | --- | --- |
| Pinch / drag on the map | zoom 100%–400% | — | zoom and pan the preview; tiles are not selectable here |
| `See all rules · read-only` | — | — | push `/catalogue/[id]/rules` |
| `Use this board` | board still published | — | pop to `/host` with `boardVersionId` |
| `Host a match` | connectivity | `POST /matches { boardVersionId }` | replace to `/lobby/[matchId]` |
| `Report board` | — | `POST /reports { boardVersionId, reason, note }` | the same reason picker as `3q`, then toast `Report sent. We'll review it.` |
| `Back` (rules screen) | — | — | pop to board detail |
| Back / Android back | — | — | pop to the caller |

## 6. Data contract

`GET /catalogue/:boardVersionId` →
`{ name, author, version, publishedAt, tiles, plays, colourSets, decks, rulesSummary, rules, mapPreview, latestVersion }`.
`POST /matches`, `POST /reports`. No socket subscriptions. The rendered rules come from the
immutable published version (decision D5) — never re-derived on the client.

## 7. Responsive

- 360dp as designed; the body is one scrolling column with the action stack pinned.
- Tablet: map left, rules summary and actions right; the rulebook becomes two columns.
- Landscape: same split.
- Font scale 130%: rule rows stack label over value; the map keeps its 1:1 aspect.

## 8. Accessibility

- The map preview is `accessibilityLabel="Board preview, <n> tiles"`; it is not focusable
  tile-by-tile.
- Rule rows are one focus stop each: `Starting cash, 15,000 rupees`.
- The frozen note is read before the first section.
- Action order: `Use this board` → `Host a match` → `Report board`.
- Contrast: `#FFC84A` on card = 7.5:1; `#5FC0FF` on the ground = 7.4:1 — pass.

## 9. Animation

| What | Duration | Easing |
| --- | --- | --- |
| Map zoom / pan | follows the gesture, no easing | — |
| Push to all rules | 260ms slide from the right | `cubic-bezier(0.2,0.8,0.2,1)` |
| Skeleton → content | 200ms | `ease-out` |
| Button press | 90ms | `ease-out` |

## 10. Acceptance criteria

1. The title block shows name, version, publish age, author, tile count and play count.
2. The map preview shows the four corner labels and the centre caption
   `<n> tiles · <n> colour sets · <n> decks`.
3. The rules summary shows starting cash, round cap, colour sets and auction-on-decline.
4. `See all rules · read-only` opens the full rulebook with all six sections in the documented
   order and every row in §3 verbatim.
5. The frozen note renders verbatim at the top of the rulebook.
6. Nothing on either screen is editable.
7. `Use this board` returns the version id to `/host`; `Host a match` creates a room directly.
8. A withdrawn board shows the unavailable state with a route back to the catalogue.
9. Viewing a superseded version shows the newer-version notice.
10. `Report board` uses the same reason picker as player reporting and marks the button reported.
