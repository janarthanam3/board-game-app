# 3e · Profile and stats

> Generated from `Royal Navy 1080 v2.dc.html` — option 3e, screens "Profile / default", "Profile / loading" (Session 9 export) · 19 September 2026.

## 1. Purpose and navigation position

The player's own profile: identity, lifetime stats, and the two entry points to history and the
leaderboard. Route `/profile`, pushed from the avatar button on `3c`. Back returns to `/modes`.

## 2. Layout map

Frame 360 × 780, padding 17, flex-column, gap 13. Cards use the standard card token
(bg `linear-gradient(180deg,#17489F,#123B88)`, border 1dp `rgba(126,180,255,.34)`, radius 17,
shadow `0 2px 0 rgba(6,20,54,.4), inset 0 1px 0 rgba(255,255,255,.08)`).

```
┌──────────────────────────────────────────────────┐
│ ‹  Profile                              [gear]   │
│ ┌ identity card ─────────────────────────────┐   │
│ │ [avatar img 56]  Naveen           RANK 4   │   │
│ │                  @naveen · joined Mar 2026 │   │
│ │                  ₹12,480                   │   │
│ └─────────────────────────────────────────────┘  │
│ ┌ 2 × 2 stat grid · gap 11 ──────────────────┐   │
│ │ 38      Matches played │ 14     Wins       │   │
│ │ 37%     Win rate       │ ₹48,200 Best net  │   │
│ │                        │        worth      │   │
│ └─────────────────────────────────────────────┘  │
│ [ Match history  › ]                             │
│ [ Leaderboard    › ]                             │
│ ── Recent matches ────────────────────────────   │
│ Friday Night        1st · ₹42,800                │
│ Office League       3rd · ₹18,050                │
└──────────────────────────────────────────────────┘
```

Order is fixed: identity, stat grid, the two nav rows (Match history then Leaderboard), then
Recent matches.

## 3. Element inventory

| # | Element | Component | Size / anchor | Tokens |
| --- | --- | --- | --- | --- |
| 1 | Frame | `ScreenFrame` | 360×780, padding 17, gap 13 | standard screen tokens |
| 2 | Header | `ScreenHeader` | back caret 19dp + title, gear right 39×39 radius 14 | title `700 22px` `#FFFFFF` = `Profile`; gear bg `rgba(8,26,64,.35)`, border `rgba(126,180,255,.28)`, `ph-gear` 17dp `rgba(198,220,255,0.95)` |
| 3 | Identity card | `Card` | full width, padding 14, gap 11 | card tokens |
| 4 | Avatar | `ImageSlot` | 56×56, radius 18 | dashed 1dp `rgba(126,180,255,.45)`, caption `img` `600 10px` |
| 5 | Display name | `Text` | `flex:1` | `800 19px` `#FFFFFF` = `Naveen` |
| 6 | Handle + joined | `Text` | — | `600 12px` `rgba(198,220,255,0.8)` = `@naveen · joined Mar 2026` |
| 7 | Rank pill | `Tag.gold` | right, radius 11, padding 4/9 | bg `rgba(255,200,74,.18)`, border 1dp `rgba(255,200,74,.45)`, `800 11px` `#FFC84A` = `RANK 4` |
| 8 | Season score | `Text` | — | `800 15px` `#FFC84A` = `₹12,480` |
| 9 | Stat tile | `StatTile` ×4 | 2×2 grid, gap 11, padding 12, radius 17 | value `800 19px` `#FFFFFF`; label `600 12px` `rgba(198,220,255,0.8)` |
| 10 | Nav row | `NavRow` ×2 | full width, min-height 48, padding 12/14, radius 17 | label `700 15px` `#FFFFFF`; caret `ph-caret-right` 16dp `rgba(198,220,255,.6)` |
| 11 | Section label | `SectionLabel` | — | `800 11px` `.12em` `rgba(198,220,255,0.8)` = `Recent matches` |
| 12 | Recent row | `MatchRow` ×2 | full width, padding 11/12, radius 17 | name `700 14px` `#FFFFFF`; result `600 12px` `rgba(198,220,255,0.8)`; the placement number is coloured `#FFC84A` when 1st, otherwise inherits |
| 13 | Skeleton | `Skeleton` | mirrors #3, #9, #10 boxes | bars `rgba(126,180,255,.16)`, radius 8 |

### Stat tiles (exact, in order)

| Value | Label |
| --- | --- |
| `38` | `Matches played` |
| `14` | `Wins` |
| `37%` | `Win rate` |
| `₹48,200` | `Best net worth` |

### Recent matches (sample rows as drawn)

| Name | Result |
| --- | --- |
| `Friday Night` | `1st · ₹42,800` |
| `Office League` | `3rd · ₹18,050` |

## 4. States

| State | Behaviour |
| --- | --- |
| default | As drawn, two recent rows maximum |
| loading | Header intact; identity card, stat grid and nav rows render as skeletons; the Recent matches section is hidden until data arrives |
| empty (no matches) | Stat tiles show `0`, `0`, `0%`, `₹0`; the Recent matches section is replaced by one line, `600 13px` `rgba(198,220,255,0.8)`: `No finished matches yet.` |
| error | Toast `E_PROFILE_LOAD_FAILED` — `Couldn't load your profile.` with `Retry`; the last cached profile stays on screen |
| offline | Renders the cached profile with a `600 12px` `#FF9A93` line under the header: `Offline — showing your last saved stats.` |
| first-run | Same as empty |
| disconnected / reconnecting / spectating / disabled | Not applicable |

## 5. Interactions

| Trigger | Result |
| --- | --- |
| Back / Android back | pop to `/modes` |
| Gear | push `/settings` |
| Avatar tap | push `/settings/account` |
| `Match history` | push `/profile/history` |
| `Leaderboard` | push `/profile/leaderboard` |
| Recent row tap | push `/result/[matchId]` for that match |
| Pull to refresh | re-issue `GET /me/profile`, skeletons stay hidden, a 2dp accent progress line shows under the header |

## 6. Data contract

Reads `GET /me/profile` → `{ displayName, handle, joinedAt, rank, seasonScore, stats: { played, wins, winRate, bestNetWorth }, recent: [{ matchId, name, placement, netWorth }] }`.
Emits nothing. No socket subscriptions.

## 7. Responsive

- 360dp as designed. Tablet: content capped at 560dp centred; the stat grid becomes 4 × 1.
- Landscape: identity card full width, then stat grid left / nav rows + recent right.
- Font scale 130%: stat tiles grow to fit two-line labels; the grid keeps 2 × 2.
- Safe area added to padding; the content column scrolls when it exceeds the frame.

## 8. Accessibility

- Identity card is one focus stop: `Naveen, at naveen, joined March 2026, rank 4, season score 12,480 rupees`.
- Each stat tile: `Matches played, 38`.
- Nav rows are buttons with the visible label.
- Contrast: `#FFC84A` on `#17489F` = 7.5:1; `rgba(198,220,255,0.8)` on card = 6.0:1 — pass.

## 9. Animation

| What | Duration | Easing |
| --- | --- | --- |
| Skeleton → content cross-fade | 200ms | `ease-out` |
| Stat value count-up on first load | 400ms | `ease-out` |
| Row press | 90ms | `ease-out` |

## 10. Acceptance criteria

1. The four stat tiles appear in the documented order with the documented labels.
2. Money is always `₹` with Indian grouping; win rate is a whole-number percentage.
3. The rank pill shows `RANK <n>` in gold and is absent when the player is unranked.
4. Loading shows skeletons for the identity card, stat grid and nav rows only.
5. `Match history` and `Leaderboard` navigate to their routes in that order.
6. Recent rows open the corresponding match result screen.
7. Offline shows the cached profile plus the offline line, never an empty screen.
8. Back returns to `/modes`.
9. At 130% font scale no stat label is truncated.
10. Pull to refresh never replaces visible content with skeletons.
