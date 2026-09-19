# 3q · Report and block

> Generated from `Royal Navy 1080 v2.dc.html` — option 3q, screens "Player long-press", "Report player — reason", "Block confirmed" (Session 9 export) · 19 September 2026.

## 1. Purpose and navigation position

Moderation from a player row. Three overlays over the lobby (`1b`) or the in-match player list
(`1c`): an action sheet, a reason picker, and the confirmation toast. Not routes. Android back
dismisses the topmost overlay.

## 2. Layout map

All three render over the host screen (lobby header stays visible: `Friday Night · 4 of 6 players`).

### 2.1 Long-press sheet (bottom sheet)

```
┌ sheet · radius 20 top · padding 17 · gap 11 ────┐
│ Karthik                              800/17      │
│ Joined by room code · not a friend   600/12      │
│ [ Add friend ]                                   │
│ [ Report player ]                                │
│ [ Block player ]   danger                        │
│ [ Cancel ]                                       │
└──────────────────────────────────────────────────┘
```

### 2.2 Reason picker (bottom sheet, replaces 2.1)

```
┌ sheet ───────────────────────────────────────────┐
│ Report Karthik                       800/17      │
│ Pick the closest reason              600/12      │
│ ( ) Offensive name                               │
│ ( ) Cheating                                     │
│ ( ) Harassment                                   │
│ ( ) Other                                        │
│ Add a note (optional)                            │
│ [ textarea · placeholder "What happened?" ]      │
│ [ Cancel ]            [ Send report ]            │
└──────────────────────────────────────────────────┘
```

### 2.3 Block confirmed (toast over the updated lobby)

Lobby header now reads `Friday Night · 3 of 6 players`; the match log line
`lobby · Karthik removed` is appended.

```
┌ toast · radius 16 · padding 12 ─────────────────┐
│ ✓ Karthik is blocked                             │
│   They won't appear in friend suggestions or     │
│   join your rooms.                    [ Undo ]   │
└──────────────────────────────────────────────────┘
```

## 3. Element inventory

| # | Element | Component | Size / anchor | Tokens |
| --- | --- | --- | --- | --- |
| 1 | Scrim | `Scrim` | inset 0 | `rgba(5,15,40,.64)` |
| 2 | Sheet | `BottomSheet` | full width, top radius 20, padding 17, gap 11 | bg `linear-gradient(180deg,#17489F,#123B88)`, top border 1dp `rgba(126,180,255,.45)`, shadow `0 -12px 34px rgba(4,12,32,.5)`; 36 × 4dp grabber `rgba(126,180,255,.35)` centred |
| 3 | Sheet title | `Text` | — | `800 17px` `#FFFFFF` = `Karthik` / `Report Karthik` |
| 4 | Sheet subtitle | `Text` | — | `600 12px` `rgba(198,220,255,0.8)` = `Joined by room code · not a friend` / `Pick the closest reason` |
| 5 | Sheet action | `Button.ghost` ×2 | full width, min-height 48, radius 16 | bg `rgba(8,26,64,.35)`, border 1dp `rgba(126,180,255,.45)`, `700 15px` `rgba(198,220,255,0.95)`; labels `Add friend`, `Report player` |
| 6 | Danger action | `Button.danger` | full width, min-height 48, radius 16 | bg `rgba(240,82,74,.14)`, border 1dp `rgba(240,82,74,.6)`, `700 15px` `#FF9A93` = `Block player` |
| 7 | Cancel | `Button.ghost` | full width, min-height 44 | as #5, label `Cancel` |
| 8 | Reason option | `RadioRow` ×4 | full width, min-height 48, radius 16, padding 12 | card tokens; dot 20dp, border 1dp `rgba(126,180,255,.45)`, selected fill `#5FC0FF` with a 1dp `rgba(95,192,255,.45)` ring on the row; label `700 15px` `#FFFFFF` |
| 9 | Note label | `Text` | — | `600 12px` `rgba(198,220,255,0.8)` = `Add a note (optional)` |
| 10 | Note field | `Textarea` | full width, min-height 76, radius 14 | border 1dp `rgba(126,180,255,0.27)`; placeholder `What happened?` `rgba(198,220,255,.45)`; text `600 14px` `#FFFFFF`; 300-character limit with a counter at 250+ |
| 11 | Send report | `Button.primaryGold` | `flex:1`, min-height 44 | bg `linear-gradient(180deg,#FFC84A,#E0A31C)`, `700 15px` `#3A2402` = `Send report` |
| 12 | Toast | `Toast` | full width minus 17dp, radius 16, padding 12, gap 9 | bg `rgba(12,42,99,.9)`, border 1dp `rgba(126,180,255,.45)`, shadow `0 12px 28px rgba(4,12,32,.5)` |
| 13 | Toast icon | `ph-check-circle` | 18dp | `#7ADB25` |
| 14 | Toast title / body | `Text` | `flex:1` | `700 14px` `#FFFFFF` = `Karthik is blocked`; `600 12px` `rgba(198,220,255,0.8)` = `They won't appear in friend suggestions or join your rooms.` |
| 15 | Undo | `TextButton` | right, hit area 44dp | `700 13px` `#5FC0FF` = `Undo` |

### Reason options (verbatim, in order)

`Offensive name` · `Cheating` · `Harassment` · `Other`

## 4. States

| State | Behaviour |
| --- | --- |
| default (sheet) | All four actions enabled |
| already a friend | The `Add friend` action is replaced by `Remove friend` with the same ghost tokens |
| reason unselected | `Send report` disabled at 45% opacity |
| sending | `Send report` shows an 18dp spinner; the sheet cannot be dismissed |
| sent | Sheet dismisses; toast `Report sent. We'll review it.` (no Undo) |
| error | Sheet stays open; inline error line above the buttons, `600 12px` `#FF9A93`: `Couldn't send that report. Try again.` |
| blocked | Toast 2.3 for 6000ms with Undo |
| undone | Toast replaced by `Karthik is unblocked.` for 2500ms; the player is re-admitted to the lobby only if a seat is still free |
| offline | Report and block both fail immediately with the inline error; nothing is queued |
| in-match variant | Blocking a player mid-match does **not** remove them from the running match; the toast body becomes `They'll finish this match. You won't be matched again.` |
| spectating | The sheet offers only `Report player` and `Block player` |

## 5. Interactions

| Trigger | Validation | Server | Result |
| --- | --- | --- | --- |
| Long-press a player row | not yourself | — | present sheet 2.1, 40ms haptic |
| `Add friend` | not already friends | `POST /friends/requests { userId }` | dismiss, toast `Friend request sent.` |
| `Report player` | — | — | swap to sheet 2.2 (crossfade, no scrim flash) |
| Reason tap | — | — | select, enable `Send report` |
| `Send report` | a reason is selected | `POST /reports { userId, reason, note, matchId }` | dismiss, toast `Report sent. We'll review it.` |
| `Block player` | — | `POST /me/blocks { userId }` + socket `lobby:kick` when the blocker is the host | the player leaves the lobby, the header count drops, a match-log line `lobby · <name> removed` is appended, toast 2.3 |
| `Undo` | within the toast's 6000ms | `DELETE /me/blocks/:userId` | unblock; the log line is appended with `lobby · <name> unblocked` — the earlier line is not deleted |
| `Cancel` / scrim / back | — | — | dismiss the topmost overlay |

A non-host blocking a player removes them from that player's own view and prevents future
matchmaking, but does not kick them from the room.

## 6. Data contract

Reads the player row's `{ userId, displayName, joinSource, isFriend }` from lobby state.
Endpoints: `POST /friends/requests`, `POST /reports`, `POST /me/blocks`, `DELETE /me/blocks/:userId`.
Socket: emits `lobby:kick` (host only); subscribes to `lobby:state` for the updated player count.

## 7. Responsive

- Sheets are full-width at the bottom on phones; on tablets they are centred dialogs capped at 420dp.
- Landscape: the sheet caps at 60% height and scrolls internally; the action row stays pinned.
- Safe area added to the sheet's bottom padding.
- Font scale 130%: reason rows grow to 60dp; the note field keeps its 76dp minimum.

## 8. Accessibility

- Sheets are `accessibilityViewIsModal`; focus starts on the title, returns to the originating row
  on dismiss.
- Reason options are `accessibilityRole="radio"` inside a `radiogroup`.
- The toast is `accessibilityLiveRegion="polite"`; Undo is separately focusable and its 6000ms
  window extends to 12000ms when a screen reader is active.
- Long-press is not the only path: each player row also exposes an `accessibilityAction` named
  `More options`.
- Contrast: `#FF9A93` on the danger tint = 5.9:1; `#5FC0FF` on the toast ground = 6.4:1 — pass.

## 9. Animation

| What | Duration | Easing |
| --- | --- | --- |
| Sheet present (translateY 100% → 0) | 240ms | `cubic-bezier(0.2,0.8,0.2,1)` |
| Sheet dismiss | 200ms | `ease-in` |
| Sheet 2.1 → 2.2 cross-fade | 160ms | `ease-out` |
| Toast in / out | 200ms rise + fade / 180ms fade | `ease-out` / `ease-in` |
| Player row removal from the lobby | 180ms collapse | `ease-in` |

## 10. Acceptance criteria

1. Long-press on a player row presents the sheet with that player's name and join source.
2. Sheet actions appear in the order Add friend, Report player, Block player, Cancel.
3. The reason picker lists exactly the four reasons in §3, in order, single-select.
4. `Send report` is disabled until a reason is picked and posts reason plus optional note.
5. The note field caps at 300 characters.
6. Blocking from the host seat removes the player, decrements the lobby count, and appends
   `lobby · <name> removed` to the match log.
7. The block toast shows the exact title and body copy and offers Undo for 6000ms.
8. Undo restores the block state and appends its own log line without deleting the first.
9. Blocking mid-match does not eject the player from the running match and uses the alternate
   toast body.
10. Every overlay is dismissible with Android back, topmost first.
