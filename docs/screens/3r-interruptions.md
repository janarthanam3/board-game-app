# 3r · Match interruption states

> Generated from `Royal Navy 1080 v2.dc.html` — option 3r, screens "Host left — toast", "Room closed by host", "Not enough players", "Ended while you were away" (Session 9 export) · 19 September 2026.

## 1. Purpose and navigation position

Four server-driven interruptions. None is a route the user navigates to; each is pushed by a socket
event over the lobby (`1b`) or the match (`1c`).

| State | Fired by | Surface |
| --- | --- | --- |
| Host left | `lobby:hostLeft` during a running match | toast over the HUD; play continues |
| Room closed by host | `lobby:closed` before the match starts | full-screen takeover of the lobby |
| Not enough players | `match:insufficientPlayers` | full-screen takeover with a countdown |
| Ended while you were away | `match:endedWhileAway`, delivered on resync | full-screen takeover after `3k` |

> **Canvas note.** The "Host left" screen links to an option id `3s` that no longer exists in the
> design file (the turn-timer ring was removed in Session 7). The link is not reproduced; the
> question is logged in `docs/OPEN-QUESTIONS.md`.

## 2. Layout maps

### 2.1 Host left (toast over the live HUD)

```
│ Friday Night                                     │
│ Round 12 · Priya is host                         │
│ board · play continues                           │
│ ┌ toast ──────────────────────────────────────┐  │
│ │ ⚑ Host left                                  │ │
│ │   Naveen left the match. Priya is now host.  │ │
│ └───────────────────────────────────────────────┘│
```

### 2.2 Room closed by host

```
│ Lobby                                            │
│ Friday Night · waiting for host                  │
│ ┌ centred block ──────────────────────────────┐  │
│ │        The host closed this room             │ │
│ │  "Naveen left before the match started.      │ │
│ │   Nothing was charged and your slot is free."│ │
│ │        [ Back to modes ]                     │ │
│ └───────────────────────────────────────────────┘│
```

### 2.3 Not enough players

```
│ Friday Night                                     │
│ Round 12 · 1 player left                         │
│ ┌ centred block ──────────────────────────────┐  │
│ │              ( 10 )  countdown ring          │ │
│ │        Not enough players                    │ │
│ │  "Only one player is left. The match will    │ │
│ │   end in 10 seconds."                        │ │
│ │  Meera        disconnected                   │ │
│ │  Karthik      bankrupt · round 11            │ │
│ │  Priya        left the match                 │ │
│ │        [ End now ]                           │ │
│ └───────────────────────────────────────────────┘│
```

### 2.4 Ended while you were away

```
│ Friday Night                                     │
│ reconnected · round 20                           │
│ ┌ centred block ──────────────────────────────┐  │
│ │            RECONNECTED                       │ │
│ │  This match ended while you were away        │ │
│ │            3rd                               │ │
│ │  You finished third of four                  │ │
│ │  ₹6,800 final · Naveen won with ₹22,400      │ │
│ │  "Your last four turns were auto-played      │ │
│ │   while you were offline."                   │ │
│ │  [ See result ]        [ Back to modes ]     │ │
│ └───────────────────────────────────────────────┘│
```

## 3. Element inventory

| # | Element | Component | Tokens |
| --- | --- | --- | --- |
| 1 | Toast | `Toast` | as `3j` element 1; icon `ph-crown-simple` 18dp `#FFC84A`; title `700 14px` `#FFFFFF` = `Host left`; body `600 12px` `rgba(198,220,255,0.8)` = `<old host> left the match. <new host> is now host.`; 4000ms (longer than the standard 2600ms — it reports a permanent change) |
| 2 | Context header | `Row` | match name `700 19px` `#FFFFFF`; meta `600 12px` `rgba(198,220,255,0.8)` = `Round <n> · <new host> is host` / `Round <n> · <n> player left` / `reconnected · round <n>` / `<match> · waiting for host` |
| 3 | Takeover block | `Card` | centred, max 320, radius 20, padding 17, gap 13; bg `linear-gradient(180deg,#17489F,#123B88)`, border 1dp `rgba(126,180,255,.45)`, shadow `0 18px 44px rgba(4,12,32,.55)` |
| 4 | Takeover title | `Text` | `800 19px` `#FFFFFF` |
| 5 | Takeover body | `Text` | `600 13px` `rgba(198,220,255,0.9)` |
| 6 | Countdown ring | `CountdownRing` | 72dp, track 4dp `rgba(8,26,64,.5)`, progress 4dp `#FFC84A` sweeping to empty; number `800 23px` `#FFFFFF`; turns `#FF9A93` at 3 |
| 7 | Departure row | `Row` ×n | name `700 14px` `#FFFFFF`; reason `600 12px` — `disconnected` `#FFC84A`, `bankrupt · round <n>` `#FF9A93`, `left the match` `rgba(198,220,255,0.8)` |
| 8 | Reconnected kicker | `Text` | `800 11px` `.14em` `#5FC0FF` = `RECONNECTED` |
| 9 | Placement | `Text` | `800 35px` `#FFC84A` = `3rd` |
| 10 | Placement line | `Text` | `700 15px` `#FFFFFF` = `You finished third of four` |
| 11 | Result line | `Text` | `600 13px` `rgba(198,220,255,0.9)` = `₹<n> final · <winner> won with ₹<n>` |
| 12 | Auto-play note | `Text` | `600 12px` `#FFC84A` = `Your last <n> turns were auto-played while you were offline.` |
| 13 | Primary action | `Button.primaryGold` | min-height 44, radius 16, `700 15px` `#3A2402`; labels `Back to modes`, `End now`, `See result` |
| 14 | Secondary action | `Button.ghost` | min-height 44, radius 16, `700 15px` `rgba(198,220,255,0.95)` = `Back to modes` |

### Copy (verbatim)

| State | Title | Body |
| --- | --- | --- |
| Host left | `Host left` | `Naveen left the match. Priya is now host.` |
| Room closed | `The host closed this room` | `Naveen left before the match started. Nothing was charged and your slot is free.` |
| Not enough players | `Not enough players` | `Only one player is left. The match will end in 10 seconds.` |
| Ended while away | `This match ended while you were away` | `Your last four turns were auto-played while you were offline.` |

## 4. Rules behind each state

| State | Rule |
| --- | --- |
| Host left (in match) | Host is a lobby role only. Mid-match it transfers to the **longest-seated remaining player**; the match itself is unaffected — no pause, no vote, no state change beyond the badge |
| Room closed | Only possible **before** `match:started`. Every guest is returned to `/modes`; nothing is charged or recorded |
| Not enough players | Triggered when fewer than two **active** players remain (bankrupt, left and disconnected all count as inactive). A 10000ms countdown runs; the match then ends and resolves by net worth. A reconnect during the countdown cancels it |
| Ended while away | Shown on resync when the match ended during a disconnect. Turns taken by the server on the player's behalf are counted and reported. The player's result stands and is recorded in history |

## 5. States

| State | Behaviour |
| --- | --- |
| host left, you are the new host | Toast body becomes `<old host> left the match. You're now host.` |
| host left in the lobby | Not this toast — it becomes `Room closed`, since a lobby without its host is closed |
| countdown running | The ring sweeps once per second; `End now` skips to the resolution immediately |
| countdown cancelled | The block dismisses with a 200ms fade and the HUD resumes; a match-log line `<name> reconnected` is appended |
| ended while away, you won | Placement reads `1st`, the line becomes `You won`, and the result line drops the winner clause |
| ended while away, you were bankrupt | Placement shows the final position; the auto-play note is omitted when no turns were auto-played |
| offline | These states arrive only over the socket — they cannot appear while offline; `3k` covers that case |
| local modes | None of these states exist |
| loading / empty / spectating / first-run | Spectators get only `Host left` and `Not enough players`, without actions |

## 6. Interactions

| Trigger | Result |
| --- | --- |
| Toast (host left) | auto-dismiss at 4000ms; swipe dismisses; a match-log line is appended either way |
| `Back to modes` | `router.replace('/modes')` |
| `End now` | emit `match:endNow`; the server resolves immediately and pushes `match:ended` |
| `See result` | push `/result/[matchId]` (`2b`) |
| Android back | on takeovers, mapped to the secondary action (`Back to modes`); never a silent dismiss |

## 7. Data contract

Subscribes: `lobby:hostLeft`, `lobby:closed`, `match:insufficientPlayers`
(`{ secondsRemaining, inactivePlayers }`), `match:endedWhileAway`
(`{ placement, playerCount, finalNetWorth, winner, autoPlayedTurns }`), `match:ended`.
Emits: `match:endNow`.
The countdown is server-authoritative — the client renders `secondsRemaining` and never runs its
own clock past it.

## 8. Responsive

- Phones: takeover blocks are centred, 320dp max, with the actions inside the block.
- Tablet: 360dp max; the toast caps at 420dp.
- Landscape: the block caps at 80% height and scrolls internally.
- Font scale 130%: the placement number drops to 28dp; departure rows stack name over reason.

## 9. Accessibility

- Takeovers are `accessibilityViewIsModal` and announce their title on present.
- The countdown is `accessibilityLiveRegion="assertive"` and announces at 10, 5, 3, 2, 1.
- The host-left toast is announced politely and names both players.
- Departure reasons are text, never colour-only.
- Contrast: `#FFC84A` on the block = 7.5:1; `#FF9A93` = 5.4:1 at 13dp bold — pass.

## 10. Animation

| What | Duration | Easing |
| --- | --- | --- |
| Toast in / out | 200ms / 180ms | `ease-out` / `ease-in` |
| Takeover present (scrim + scale 0.96 → 1) | 240ms | `cubic-bezier(0.2,0.8,0.2,1)` |
| Countdown ring sweep | 1000ms per second | `linear` |
| Countdown cancel dismiss | 200ms fade | `ease-in` |
| Placement number entry | 320ms scale 0.9 → 1 | `cubic-bezier(0.2,0.8,0.2,1)` |

## 11. Acceptance criteria

1. Host leaving mid-match shows only the toast; play is never interrupted.
2. Host transfer goes to the longest-seated remaining player and the header updates.
3. Host leaving pre-start closes the room for everyone with the exact copy in §3.
4. The not-enough-players countdown starts at 10 seconds, is server-driven, and can be skipped with
   `End now`.
5. A reconnect during the countdown cancels it and resumes play.
6. The inactive-player list states each player's reason (`disconnected`, `bankrupt · round <n>`,
   `left the match`).
7. `Ended while you were away` reports placement, final net worth, the winner, and the number of
   auto-played turns.
8. The auto-play note is omitted when no turns were auto-played.
9. Android back on a takeover maps to `Back to modes`, never a silent dismiss.
10. Every one of these states also appends a match-log line.
