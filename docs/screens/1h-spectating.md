# 1h · Spectating

> Generated from `Royal Navy 1080 v2.dc.html` — option 1h, screen "Spectating" (Session 9 export) · 19 September 2026.

## 1. Purpose and navigation position

Watching a friend's match, public information only. Route `/match/[matchId]/spectate`, guarded by
`spectator`. Entered from `Watch` on a friend row (`3g`) and from `Watch` on `1g`. Back, or
`Leave`, returns to the caller (`/profile/friends` or `/modes`).

## 2. Layout map

Frame 360 × 780, padding 17, flex-column, gap 13.

```
┌──────────────────────────────────────────────────┐
│ Watching Friday Night                    [live]  │
│ Round 8 · Chennai Edition                        │
│ ┌ board · public view ────────────────────────┐  │
│ └───────────────────────────────────────────────┘│
│ Priya's turn                             0:14    │
│ rolled 8 · landed Marine Drive                   │
│ ── PLAYERS ───────────────────────────────────   │
│ Naveen      6 tiles                   ₹22,400    │
│ Priya       4 tiles                   ₹14,100    │
│ Meera       3 tiles                    ₹6,800    │
│ Karthik     1 tile                     ₹2,150    │
│ "Cards in hand and pending trades stay hidden    │
│  while spectating."                              │
│ [ Leave ]                                        │
└──────────────────────────────────────────────────┘
```

## 3. Element inventory

| # | Element | Component | Tokens |
| --- | --- | --- | --- |
| 1 | Frame | `ScreenFrame` | 360×780, padding 17, gap 13 | standard screen tokens |
| 2 | Title | `Text` | `700 19px` `#FFFFFF` = `Watching <match name>` |
| 3 | Subtitle | `Text` | `600 12px` `rgba(198,220,255,0.8)` = `Round <n> · <board name>` |
| 4 | Live chip | `Tag` | radius 9, padding 3/8, bg `rgba(240,82,74,.14)`, border 1dp `rgba(240,82,74,.6)`, `700 11px` `#FF9A93` = `live`, with a 6dp pulsing dot |
| 5 | Board | `BoardView.readonly` | aspect 1:1, radius 17, card ground; zoom and pan allowed, no tile selection; caption `600 11px` `rgba(198,220,255,0.75)` = `board · public view` |
| 6 | Turn line | `Text` | `700 15px` `#FFC84A` = `<name>'s turn` |
| 7 | Turn timer | `Text` | `800 15px` `#FFFFFF` = `m:ss`, turning `#FF9A93` under 5 seconds; hidden entirely when the board's turn timer is `Off` |
| 8 | Last action | `Text` | `600 12px` `rgba(198,220,255,0.8)` = `rolled <n> · landed <tile>` |
| 9 | Section label | `SectionLabel` | `800 11px` `.12em` `rgba(198,220,255,0.8)` = `PLAYERS` |
| 10 | Player row | `PlayerRow` | card tokens, min-height 48; seat swatch 10dp; name `700 15px` `#FFFFFF`; tiles `600 12px` `rgba(198,220,255,0.8)` = `<n> tiles` (singular `1 tile`); cash `800 15px` `#FFC84A`; the active player's row gains a 1dp `rgba(255,200,74,.45)` border and `rgba(255,200,74,.09)` fill |
| 11 | Privacy note | `Text` | `600 12px` `rgba(198,220,255,0.75)` = `Cards in hand and pending trades stay hidden while spectating.` |
| 12 | Leave | `Button.ghost` | full width, min-height 44, radius 16, `700 15px` `rgba(198,220,255,0.95)` = `Leave` |

## 4. What a spectator may and may not see

| Visible | Hidden |
| --- | --- |
| Board, tokens, ownership, buildings | Cards in hand |
| Each player's cash and tile count | Pending trade offers and their terms |
| Turn order, active player, turn timer | Auction bid intentions before a bid is placed |
| Public match log lines | Private prompts (raise cash, bankruptcy choices) |

The server never sends hidden fields to a spectator socket — this is enforced server-side, not by
client filtering.

## 5. States

| State | Behaviour |
| --- | --- |
| default | As drawn, updating live |
| joining | Board and rows as skeletons until the first snapshot; the live chip reads `joining…` in `rgba(198,220,255,0.8)` |
| paused (all players disconnected) | Live chip becomes `paused` in `#FFC84A`; turn timer hidden; turn line replaced by `Waiting for players to reconnect.` |
| reconnecting (spectator's own socket) | `3k` overlay; the last snapshot stays beneath |
| refused | Full-screen error state: `Can't watch this match` / `The host has spectating turned off.` with `Back` — error `E_SPECTATE_REFUSED` |
| match ended | The body is replaced by the final standings and a `See result` action to `/result/[matchId]` (read-only for a non-member: standings only) |
| player eliminated | Their row moves to the bottom with `out` in `#FF9A93` instead of cash |
| timer off | Element 7 is absent; nothing takes its place |
| offline | Not reachable; existing sessions show `3k` then drop to `/modes` |
| disabled / first-run | Not applicable |

## 6. Interactions

| Trigger | Result |
| --- | --- |
| Pinch / drag the board | zoom 100%–400%, pan; no tile is selectable |
| Tap a board tile | show a read-only tooltip: name, owner, buildings — never the owner's hand |
| Tap a player row | show that player's public summary sheet (name, tiles, cash, net worth) |
| Long-press a player row | open `3q` (report / block) — `Add friend` is present, `Invite` is not |
| `Leave` | emit `match:unspectate`, pop to the caller |
| Android back | same as `Leave`, no confirm |

## 7. Data contract

Socket room `match:<matchId>:spectators`. Subscribes: `spectate:state` (a redacted snapshot),
`spectate:event` (public log lines only), `match:ended`. Emits: `match:spectate`,
`match:unspectate`.
The redacted snapshot omits `hand`, `pendingTrades`, `privatePrompts` for every player.

## 8. Responsive

- 360dp as designed; the player list scrolls when there are more than five players.
- Tablet: board left, turn block and players right.
- Landscape: same split; the privacy note stays under the list.
- Font scale 130%: rows grow to 60dp; the turn line and timer stack.

## 9. Accessibility

- Turn changes announce politely: `Priya's turn`.
- The timer is `accessibilityLiveRegion="polite"` and announces only at 30s, 10s and 5s remaining.
- The live chip's pulsing dot is decorative; `live` is the text.
- Player rows: `Naveen, 6 tiles, 22,400 rupees`.
- The privacy note is read once, after the player list.
- Contrast: `#FF9A93` on its tint = 5.9:1; `#FFC84A` on card = 7.5:1 — pass.

## 10. Animation

| What | Duration | Easing |
| --- | --- | --- |
| Token move, per tile | 180ms | `ease-in-out` |
| Turn handover highlight | 200ms | `ease-out` |
| Live dot pulse | 1600ms loop, opacity 1 → 0.4 | `ease-in-out` |
| Cash change count | 320ms | `ease-out` |
| Row reorder on elimination | 260ms | `cubic-bezier(0.2,0.8,0.2,1)` |

## 11. Acceptance criteria

1. The header reads `Watching <match>` with `Round <n> · <board>` beneath and a live chip.
2. The board is zoomable and pannable but no tile can be selected.
3. The turn block shows the active player, the timer (when the board sets one) and the last public
   action, updating live.
4. Player rows show tile count and cash, with correct singular `1 tile`.
5. Cards in hand and pending trades are never present in the spectator payload.
6. The privacy note renders verbatim.
7. A refused join shows `E_SPECTATE_REFUSED` with the documented copy.
8. When every player disconnects the screen shows the paused state rather than a stale timer.
9. `Leave` and Android back both exit without a confirm.
10. Match end replaces the body with standings and a route to the result screen.
