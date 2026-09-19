# 1v · Actions sheet

> Generated from `Royal Navy 1080 v2.dc.html` — option 1v, screen "Actions" (Session 9 export) · 19 September 2026.

## 1. Purpose and navigation position

The hub for everything a player can do on their turn beyond rolling. Route
`/match/[matchId]/actions`, presented as a sheet over the HUD, guarded by `actor's turn`. Opened
from the pause sheet and from the HUD's action affordance. Each row pushes its own screen:
`1u` Build, `1w` Sell, `1q` Mortgage, `1r` Redeem, `1p` Trade, `1s`/`1t` Auction.

## 2. Layout map

```
┌ HUD behind ─────────────────────────────────────┐
│ Friday Night · Round 12 · 6 players             │
│ board (GO · CHEST · JAIL · GO TO)               │
│ player strip: P1 ₹2,980 · P3 ₹5,480 · P5 ₹6,840 │
│               P2 ₹6,000 · P4 ₹4,970 · P6 ₹2,120 │
│ ┌ sheet · bottom · radius 20 top · padding 17 ─┐ │
│ │ Actions                                       ││
│ │ Player 1 · ₹2,980                             ││
│ │ [icon] Build      house or hotel         ›    ││
│ │ [icon] Sell       back to bank           ›    ││
│ │ [icon] Mortgage   raise cash             ›    ││
│ │ [icon] Redeem     clear mortgage         ›    ││
│ │ [icon] Trade      with a player          ›    ││
│ │ [icon] Auction    open bidding           ›    ││
│ └────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────┘
```

Row order is fixed: Build, Sell, Mortgage, Redeem, Trade, Auction.

## 3. Element inventory

| # | Element | Component | Tokens |
| --- | --- | --- | --- |
| 1 | Scrim | `Scrim` | inset 0, `rgba(5,15,40,.64)`; the HUD stays rendered beneath |
| 2 | Sheet | `BottomSheet` | full width, top radius 20, padding 17, gap 11; bg `linear-gradient(180deg,#17489F,#123B88)`, top border 1dp `rgba(126,180,255,.45)`, shadow `0 -12px 34px rgba(4,12,32,.5)`; grabber 36 × 4dp `rgba(126,180,255,.35)` |
| 3 | Title | `Text` | `800 19px` `#FFFFFF` = `Actions` |
| 4 | Actor line | `Text` | `600 12px` `rgba(198,220,255,0.8)` = `<name> · ₹<cash>` |
| 5 | Action row | `ActionRow` ×6 | card tokens, min-height 56, radius 16, padding 11/12, gap 11; label `700 15px` `#FFFFFF`; hint `600 12px` `rgba(198,220,255,0.8)`; caret `ph-caret-right` 16dp `rgba(198,220,255,.6)` |
| 6 | Row icon chip | `IconChip` | 32×32, radius 11, border 1dp; per row below |
| 7 | Disabled row | `ActionRow.disabled` | 45% opacity; the hint is replaced by the reason in `600 12px` `#FFC84A` |

### Rows (verbatim)

| Label | Hint | Icon | Chip fill / border / glyph |
| --- | --- | --- | --- |
| `Build` | `house or hotel` | `ph-house-line` 16dp | `rgba(122,219,37,.18)` / `rgba(122,219,37,.45)` / `rgb(122,219,37)` |
| `Sell` | `back to bank` | `ph-hand-coins` 16dp | `rgba(255,200,74,.18)` / `rgba(255,200,74,.45)` / `rgb(255,200,74)` |
| `Mortgage` | `raise cash` | `ph-bank` 16dp | `rgba(95,192,255,.18)` / `rgba(95,192,255,.45)` / `rgb(95,192,255)` |
| `Redeem` | `clear mortgage` | `ph-arrow-counter-clockwise` 16dp | `rgba(95,192,255,.18)` / `rgba(95,192,255,.45)` / `rgb(95,192,255)` |
| `Trade` | `with a player` | `ph-arrows-left-right` 16dp | `rgba(167,123,255,.18)` / `rgba(167,123,255,.45)` / `rgb(167,123,255)` |
| `Auction` | `open bidding` | `ph-gavel` 16dp | `rgba(255,200,74,.18)` / `rgba(255,200,74,.45)` / `rgb(255,200,74)` |

## 4. Row availability (authoritative)

Every row is always **visible**; unavailable rows are disabled with a stated reason.

| Row | Enabled when | Disabled reason copy |
| --- | --- | --- |
| Build | You hold at least one colour set at its threshold, the bank has stock, and you can afford one house | `Hold a colour set to build.` / `The bank has no houses left.` / `Not enough cash to build.` |
| Sell | You own at least one building or tile that can be sold back | `Nothing to sell.` |
| Mortgage | You own at least one unmortgaged tile with no buildings on its group | `Sell your buildings first.` / `Nothing to mortgage.` |
| Redeem | You hold at least one mortgaged tile | `Nothing is mortgaged.` |
| Trade | At least one other player is active and the board allows trading | `No one to trade with.` / `Trading is off on this board.` |
| Auction | An auction is live | `No auction running.` |

The reason is the row's hint; it also becomes a toast if the row is tapped.

## 5. States

| State | Behaviour |
| --- | --- |
| default | As drawn, cash updating live |
| not your turn | The sheet cannot be opened; the HUD's affordance is disabled with the hint `Waiting for <name>.` |
| auction live | The `Auction` row is enabled and gains a `live` chip in `#FF9A93` tokens; opening the sheet during an auction scrolls it into view |
| raise cash pending | The sheet opens in a restricted mode: only Sell, Mortgage and Trade are enabled, and the title becomes `Raise ₹<n>`; see `1d` |
| in jail | Build, Sell, Mortgage, Redeem and Trade follow the board's `Block build, sell, mortgage and trade` corner rule — when it is on, all five are disabled with `Blocked while in jail.` |
| loading | Never — the data is in the match snapshot |
| error | A rejected action returns here with the error toast; the sheet stays open |
| offline (local modes) | Identical |
| spectating / bankrupt | Not reachable |

## 6. Interactions

| Trigger | Result |
| --- | --- |
| Row tap (enabled) | push the row's screen; the sheet stays mounted beneath so back returns to it |
| Row tap (disabled) | toast the reason; no navigation |
| Scrim tap / swipe down / Android back | dismiss to the HUD |
| Cash change while open | the actor line updates live and rows re-evaluate their availability immediately |

## 7. Data contract

Reads the match snapshot: your holdings, buildings, mortgages, the bank's house and hotel stock,
the board's rules, and the auction state. Emits nothing itself — each child screen emits its own
`match:action`.

## 8. Responsive

- Phones: full-width bottom sheet, safe-area bottom padding.
- Tablet: centred dialog capped at 420dp.
- Landscape: the sheet caps at 70% height and scrolls internally.
- Font scale 130%: rows grow to 68dp and the sheet scrolls rather than compressing rows.

## 9. Accessibility

- `accessibilityViewIsModal`; focus starts on `Actions`, returns to the opener on dismiss.
- Each row: `Build, house or hotel` — disabled rows append `, unavailable, <reason>`.
- The actor line is announced on present.
- All rows are 56dp.
- Contrast: `#FFFFFF` on card = 8.6:1; disabled reasons `#FFC84A` = 7.5:1 — pass.

## 10. Animation

| What | Duration | Easing |
| --- | --- | --- |
| Sheet present / dismiss | 240ms / 200ms | `cubic-bezier(0.2,0.8,0.2,1)` / `ease-in` |
| Row press | 90ms | `ease-out` |
| Availability change (opacity tween) | 160ms | `ease-out` |
| Push to a child screen | 260ms slide from the right | `cubic-bezier(0.2,0.8,0.2,1)` |

## 11. Acceptance criteria

1. Six rows render in the order Build, Sell, Mortgage, Redeem, Trade, Auction.
2. Labels and hints match §3 verbatim; icon chips use the documented colours.
3. Unavailable rows are disabled and visible, never hidden, and state their reason.
4. Tapping a disabled row toasts the same reason.
5. The actor line shows the player's name and live cash.
6. Row availability re-evaluates immediately when cash or holdings change.
7. The sheet is unreachable off-turn.
8. Raise-cash mode restricts the sheet to Sell, Mortgage and Trade and retitles it.
9. The jail block rule disables the five affected rows when the board sets it.
10. Back from a child screen returns to this sheet, not to the HUD.
