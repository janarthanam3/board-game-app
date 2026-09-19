# 3k · Reconnect overlay

> Generated from `Royal Navy 1080 v2.dc.html` — option 3k, screen "Reconnect / offline" (Session 9 export) · 19 September 2026.

## 1. Purpose and navigation position

What covers the HUD when the socket drops. Not a route — a blocking overlay above
`/match/[matchId]` (and above the lobby). Fires on socket disconnect; dismisses itself on a
successful resync, or hands over to `3r` when recovery fails.

## 2. Layout map

```
┌ HUD behind, dimmed and non-interactive ─────────┐
│ Friday Night                                     │
│ Round 12 · 6 players                             │
│ board (GO · CHEST · JAIL · GO TO), dimmed        │
│ ┌ overlay panel · centred · radius 20 ─────────┐ │
│ │ Connection lost                     800/19    ││
│ │ "Reconnecting… attempt 2 of 5. Your turn is   ││
│ │  held for 45s."                     600/13    ││
│ │ [ Retry now ]                                 ││
│ │ [ Leave ]                                     ││
│ └────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────┘
```

The HUD stays rendered beneath at 45% opacity — the player keeps their bearings; it is never
replaced by a blank screen.

## 3. Element inventory

| # | Element | Component | Tokens |
| --- | --- | --- | --- |
| 1 | Scrim | `Scrim` | inset 0, `rgba(5,15,40,.64)`; HUD beneath at 45% opacity, `pointerEvents: none` |
| 2 | Panel | `Dialog` | max width 320, radius 20, padding 17, gap 13; bg `linear-gradient(180deg,#17489F,#123B88)`, border 1dp `rgba(126,180,255,.45)`, shadow `0 18px 44px rgba(4,12,32,.55)` |
| 3 | Status icon | `ph-wifi-slash` | 24dp `#FFC84A`, with a 1600ms opacity pulse while attempting |
| 4 | Title | `Text` | `800 19px` `#FFFFFF` = `Connection lost` |
| 5 | Body | `Text` | `600 13px` `rgba(198,220,255,0.9)` = `Reconnecting… attempt <n> of <max>. Your turn is held for <n>s.` |
| 6 | Retry now | `Button.primaryGold` | full width, min-height 44, radius 16, `700 15px` `#3A2402` = `Retry now` |
| 7 | Leave | `Button.ghost` | full width, min-height 44, radius 16, `700 15px` `rgba(198,220,255,0.95)` = `Leave` |

## 4. Reconnect policy (authoritative)

| Parameter | Value |
| --- | --- |
| Max attempts | 5 |
| Backoff | 1000ms, 2000ms, 4000ms, 8000ms, 15000ms (no jitter — the attempt number is shown to the player) |
| Turn hold | The server holds a disconnected player's turn for **45000ms** from the disconnect, regardless of the board's turn timer |
| On hold expiry (their turn) | The server plays the default action per `docs/05-game-rules.md` § Turn timer expiry — roll and resolve, decline optional purchases, no builds, no trades |
| On hold expiry (not their turn) | Play continues; the player keeps their seat and can still rejoin |
| After 5 failed attempts | The overlay hands over to `3r` — `Ended while you were away` or `Host left`, whichever the server reports on the next successful contact; with no contact at all, `Connection lost` becomes terminal with a single `Back to Game modes` action |
| On success | The client requests a full snapshot, replaces local state wholesale (no merge), dismisses the overlay and fires the `Reconnected` toast from `3j` |

The client never resolves game actions on its own while disconnected. Queued local input is
discarded on resync — the server snapshot is the truth.

## 5. States

| State | Behaviour |
| --- | --- |
| attempting | As drawn; the body counts the attempt and the remaining turn hold, updating every second |
| retrying now | Button shows an 18dp spinner and the attempt counter increments immediately |
| your turn held | The hold countdown is shown in `#FFC84A`; under 10s it turns `#FF9A93` |
| not your turn | The body's second sentence becomes `<name> is playing.` — no hold countdown |
| hold expired | Body becomes `Your turn was played for you.`; the overlay stays until the socket recovers |
| recovered | Overlay dismisses; the `Reconnected` toast appears; the board animates to the new state in one 320ms transition, not a replay of missed moves |
| failed (5 attempts) | Hands over to `3r`, or shows the terminal state in §4 |
| airplane mode | Attempts stop; the body becomes `You're offline. Turn on your connection to rejoin.`; `Retry now` stays available |
| lobby variant | Same panel; the body omits the turn-hold sentence and reads `Reconnecting… attempt <n> of <max>.` |
| local modes | Never shown — pass-and-play and solo have no socket |
| loading / empty / spectating | Spectators see the same overlay with `Leave` only |

## 6. Interactions

| Trigger | Result |
| --- | --- |
| `Retry now` | cancel the backoff wait and attempt immediately; does not consume an extra attempt beyond the count shown |
| `Leave` | confirm with the `3j` leave dialog (online bankruptcy copy), then `router.replace('/modes')` |
| Android back | no-op — the overlay is blocking |
| App backgrounded and returned | attempt immediately on foreground, resetting the backoff to 1000ms |

## 7. Data contract

Socket lifecycle only. On reconnect the client emits `match:resync { matchId, lastEventId }` and the
server replies with a full `match:state` snapshot plus any log lines the client missed.
No REST call; no partial patching.

## 8. Responsive

- Phones: panel 320dp centred; the HUD behind keeps its layout.
- Tablet: panel 360dp centred.
- Landscape: panel stays centred and never exceeds 70% height.
- Font scale 130%: the body grows to four lines; buttons stay 44dp and stack as drawn.

## 9. Accessibility

- `accessibilityViewIsModal`; focus starts on the title.
- The body is `accessibilityLiveRegion="assertive"` and re-announces on each attempt, not each
  second.
- The countdown announces at 30s, 10s and 5s only.
- The HUD behind is `accessibilityElementsHidden` while the overlay is up.
- Contrast: `#FFC84A` on the panel = 7.5:1; `#FF9A93` = 5.4:1 at 13dp bold — pass.

## 10. Animation

| What | Duration | Easing |
| --- | --- | --- |
| Overlay present (scrim fade + panel scale 0.96 → 1) | 200ms | `cubic-bezier(0.2,0.8,0.2,1)` |
| Icon pulse | 1600ms loop, opacity 1 → 0.4 | `ease-in-out` |
| Dismiss on recovery | 180ms fade | `ease-in` |
| Board catch-up after resync | 320ms single transition | `ease-in-out` |

Missed moves are never replayed as animation — the board transitions once to the current state.

## 11. Acceptance criteria

1. The overlay appears within 1000ms of the socket dropping, over a still-visible dimmed HUD.
2. The body shows the attempt number, the maximum, and the remaining turn hold in seconds.
3. Backoff follows 1s, 2s, 4s, 8s, 15s across five attempts.
4. The server holds a disconnected player's turn for 45 seconds, independent of the board timer.
5. `Retry now` attempts immediately without inflating the attempt count beyond what is displayed.
6. On recovery the client takes a full snapshot, discards queued input, and fires the `Reconnected`
   toast.
7. The board catches up in one transition rather than replaying missed moves.
8. Five failed attempts hand over to `3r`, or to the terminal state when the server is unreachable.
9. Android back does nothing while the overlay is up.
10. The overlay never appears in pass-and-play or solo modes.
