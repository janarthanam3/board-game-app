# 1b · Host setup and lobby

> Generated from `Royal Navy 1080 v2.dc.html` — option 1b, screens "Host a game", "Lobby" (Session 9 export) · 19 September 2026.

## 1. Purpose and navigation position

Creating an online room and waiting for players. Routes `/host` (setup) and `/lobby/[matchId]`
(lobby). `/host` is pushed from the Online multiplayer row on `3c`; back returns to `/modes`.
The lobby's back opens the leave-match dialog. `Invite friends` opens `3g`; `See all rules` opens
`3l`.

## 2. Layout map

### 2.1 Host a game

```
┌──────────────────────────────────────────────────┐
│ ‹  Host a game                                   │
│ Game name                                        │
│ [ Place ]   [ Date ]        ← two suggestion     │
│                               chips              │
│ Board                        [ Browse catalogue ]│
│ ┌ board card ─────────────────────────────────┐  │
│ │ [CLASSIC art]  Classic          OFFICIAL    │  │
│ │                Royal Navy                   │  │
│ │                24 tiles · 41,600 plays      │  │
│ │                            [ Change board ] │  │
│ └───────────────────────────────────────────────┘│
│ Starting cash                    ₹10,000         │
│ "From Classic · rules are set by the board"      │
│ [ Create room ]  gold, 50dp                      │
└──────────────────────────────────────────────────┘
```

### 2.2 Lobby

```
┌──────────────────────────────────────────────────┐
│ ‹            Lobby                          ⋯    │
│ ── ROOM CODE ─────────────────────────────────   │
│ 7K2Q                         "tap to share · QR" │
│ ── RULES ───────────────────── [See all rules]   │
│ Chennai Edition · @arvind                        │
│ Starting cash ₹15,000   Round cap 20             │
│ Colour sets own 3 of 5  Auction on decline  on   │
│ Players (4 / 6)              [ Invite friends ]  │
│ ┌ dv-scroll ────────────────────────────────┐    │
│ │ [avatar] Arvind      HOST                  │   │
│ │ [avatar] Priya       ready                 │   │
│ │ [avatar] Meera       ready                 │   │
│ │ [avatar] Karthik     waiting…              │   │
│ │ [ + ]    tap to invite a friend            │   │
│ └──────────────────────────────────────────────┘ │
│ ── YOUR PIECE ────────────────────────────────   │
│ [piece slot] "tap to choose"      Colour  [+4]   │
│ [ Start game ]  gold, 50dp                       │
└──────────────────────────────────────────────────┘
```

## 3. Element inventory

Card tokens as elsewhere. Section label = `800 11px` `.12em` `rgba(198,220,255,0.8)` + hairline.

| # | Element | Component | Tokens |
| --- | --- | --- | --- |
| 1 | Setup header | `ScreenHeader` | caret 19dp; title `700 19px` `#FFFFFF` = `Host a game` |
| 2 | Name field | `Input` | height 50, radius 17, border 1dp `rgba(126,180,255,0.27)`, `700 15px` `#FFFFFF`; label `600 14px` `rgba(198,220,255,0.95)` = `Game name` |
| 3 | Suggestion chips | `ChipRow` | `Place`, `Date` — tapping inserts the device's place name or today's date into the field |
| 4 | Board section | `Row` | label `600 14px` = `Board`; `Browse catalogue` `Button.small` `#5FC0FF` tokens |
| 5 | Board card | `BoardCard` | card tokens, padding 12, gap 11; art 56×56 radius 14 with the `CLASSIC` label; title `700 16px` `#FFFFFF` = `Classic`; `OFFICIAL` tag `700 10px` `.1em` `#FFC84A` on `rgba(255,200,74,.18)`; author `600 12px` `rgba(198,220,255,0.8)` = `Royal Navy`; meta `600 12px` = `24 tiles` · `41,600 plays`; `Change board` `Button.small` |
| 6 | Starting cash row | `ReadonlyRow` | label `Starting cash`; value `800 15px` `#FFC84A` = `₹10,000`; note `600 12px` `rgba(198,220,255,0.8)` = `From Classic · rules are set by the board` |
| 7 | Create room | `Button.primaryGold` | full width, height 50, radius 16, `800 16px` `#3A2402` = `Create room` |
| 8 | Lobby header | `Row` | caret left, `Lobby` `700 19px` centred, `⋯` overflow 39×39 radius 14 right |
| 9 | Room code | `CodeBlock` | code `800 35px` `#FFFFFF`, letter-spacing `.16em`; hint `600 12px` `rgba(198,220,255,0.8)` = `tap to share · QR`; whole block is one 60dp tap target |
| 10 | Rules summary | `Card` | board line `700 14px` `#FFFFFF` + author `600 12px`; four key/value pairs in a 2×2 grid — keys `600 12px` `rgba(198,220,255,0.8)`, values `800 13px` `#FFC84A` (money) or `700 13px` `#FFFFFF`; `See all rules` `Button.small` |
| 11 | Players header | `Row` | `Players (<n> / <m>)` `600 14px` `rgba(198,220,255,0.95)`; `Invite friends` `Button.small` `#5FC0FF` tokens |
| 12 | Player row | `PlayerRow` | avatar 36×36 radius 12; name `700 15px` `#FFFFFF`; status right — `HOST` tag `700 10px` `.1em` `#FFC84A` on `rgba(255,200,74,.18)`, `ready` `700 12px` `#7ADB25`, `waiting…` `600 12px` `rgba(198,220,255,0.8)` |
| 13 | Invite row | `PlayerRow.empty` | dashed 1dp `rgba(126,180,255,.45)`, `ph-plus` 18dp `#5FC0FF`, label `600 13px` `rgba(198,220,255,0.8)` = `tap to invite a friend` |
| 14 | Piece picker | `Row` | label `800 11px` `.12em` = `YOUR PIECE`; slot 44×44 dashed radius 13 with hint `600 12px` `rgba(198,220,255,0.8)` = `tap to choose`; `Colour` label with a `+4` overflow chip `700 12px` `rgba(198,220,255,0.95)` on `rgba(126,180,255,.16)` |
| 15 | Start game | `Button.primaryGold` | full width, height 50, `800 16px` `#3A2402` = `Start game` |

## 4. States

| State | Behaviour |
| --- | --- |
| setup default | Name empty, board `Classic`, starting cash from the board |
| name empty | `Create room` disabled at 45% opacity |
| creating | `Create room` shows a spinner; on success `router.replace('/lobby/[matchId]')` |
| lobby host | `Start game` visible and enabled once ≥ 2 players are present **and** every non-host is `ready` |
| lobby guest | `Start game` is replaced by a `Ready` toggle button with identical geometry; the host's start state is shown as `600 12px` `rgba(198,220,255,0.8)`: `Waiting for the host to start.` |
| not enough players | `Start game` disabled with the hint `Needs at least 2 players.` |
| someone not ready | `Start game` disabled with the hint `<n> players aren't ready.` |
| player joins / leaves | Row animates in or out; the `Players (n / m)` count updates; a match-log line is appended |
| host leaves | See `3r` — the lobby is closed and every guest is returned to `/modes` with the room-closed screen |
| piece taken | Taking a colour another player holds is refused with the toast `<name> has that colour.` |
| loading | Room code and rules summary render as skeletons until `lobby:state` arrives |
| error (create) | Toast from the error catalog; the setup screen stays filled in |
| offline | `/host` is unreachable from `3c`; if connectivity drops in the lobby, the reconnect overlay (`3k`) covers the screen |
| disconnected / reconnecting | Overlay `3k`; the lobby underneath keeps its last state |
| spectating | Not applicable — spectators never see the lobby |

## 5. Interactions

| Trigger | Validation | Server | Result |
| --- | --- | --- | --- |
| Suggestion chip | — | — | insert place or date into the name field |
| `Browse catalogue` / `Change board` | — | — | push `/catalogue` (`1e`); the pick returns a board version id and refreshes the card and the starting-cash row |
| `Create room` | name 1–24 characters | `POST /matches` | replace to `/lobby/[matchId]`; the host is seated first |
| Tap the room code | — | — | Android share sheet with `royalnavy://join/<CODE>`; long-press copies the code and toasts `Code copied.`; the `QR` affordance opens a 240dp QR sheet |
| `See all rules` | — | — | push `3l` |
| `Invite friends` / invite row | a seat is free | — | push `3g` |
| Long-press a player row | not yourself | — | open `3q` |
| Piece slot | — | socket `lobby:setPiece` | choose a piece and colour; taken colours are shown struck through |
| `Ready` (guest) | a piece is chosen | socket `lobby:ready` | toggle ready |
| `Start game` (host) | ≥ 2 players, all ready | socket `match:start` | every client replaces to `/match/[matchId]` |
| `⋯` overflow | — | — | sheet: `Copy room code`, `Match log`, `Leave match` (danger) |
| Back / Android back | — | — | leave-match dialog (`3j`) |

## 6. Data contract

`POST /matches { name, boardVersionId }` → `{ matchId, code }`.
Socket room `lobby:<matchId>`. Subscribes: `lobby:state` (full snapshot: players, ready flags,
pieces, rules summary), `lobby:playerJoined`, `lobby:playerLeft`, `lobby:hostLeft`, `match:started`.
Emits: `lobby:ready`, `lobby:setPiece`, `lobby:invite`, `lobby:kick` (host), `match:start` (host).
Rules shown here are read from the board version — never from the match (decision D1).

## 7. Responsive

- 360dp as designed; the player list is the only scroller, `Start game` is pinned.
- Tablet: room code and rules summary side by side; the player list below, two columns.
- Landscape: room code + rules left, players + start right.
- Font scale 130%: the room code drops to 30dp; player rows grow to 72dp.

## 8. Accessibility

- Room code: `accessibilityLabel="Room code 7 K 2 Q, double tap to share"` — spelled out letter by
  letter.
- Player rows announce their status: `Karthik, waiting`.
- `Start game` announces why it is disabled through `accessibilityHint`.
- The piece picker announces taken colours as `, taken by Priya`.
- Contrast: `#FFC84A` on card = 7.5:1; `#7ADB25` on card = 7.8:1 — pass.

## 9. Animation

| What | Duration | Easing |
| --- | --- | --- |
| Player row join (fade + 6dp rise) | 200ms | `ease-out` |
| Player row leave (collapse) | 180ms | `ease-in` |
| Ready state change | 140ms colour tween | `ease-out` |
| Room code copy feedback | 900ms toast | `ease-out` |
| Start → match transition | 320ms fade through black | `ease-in-out` |

## 10. Acceptance criteria

1. `Create room` is disabled until the game name has at least one character.
2. The board card shows title, author, tile count and play count, with `OFFICIAL` only on official
   boards.
3. Starting cash on setup is read-only and carries the note `From Classic · rules are set by the board`.
4. The lobby shows a four-character room code, shareable by tap and copyable by long-press.
5. The rules summary shows starting cash, round cap, colour sets and auction-on-decline, sourced
   from the board version.
6. `See all rules` opens the read-only rules screen (`3l`).
7. The player list shows the host tag, ready states and an invite row while seats remain.
8. `Start game` is host-only and enabled only with ≥ 2 players and everyone ready.
9. Guests see a `Ready` toggle and the waiting line instead of `Start game`.
10. Back from the lobby always confirms before leaving.
11. Two players cannot hold the same colour.
12. All clients transition to the match together on `match:started`.
