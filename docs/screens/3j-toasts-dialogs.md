# 3j · Toasts and dialogs

> Generated from `Royal Navy 1080 v2.dc.html` — option 3j, screen "Toasts + dialog" (Session 9 export) · 19 September 2026.

## 1. Purpose and navigation position

The app's transient-feedback inventory: one toast component and one confirm-dialog component, with
the exact copy for the drawn cases. Not a route. The leave dialog is fired by the pause sheet
(`3i`); the reconnect toast by the reconnect overlay (`3k`). Every other screen's toasts use the
same component and the copy in `docs/13-error-catalog.md`.

## 2. Layout map

```
┌ toast · width = frame − 34 · radius 16 · padding 12 ┐
│ [icon 18]  Title              700/14                 │
│            Body               600/12                 │
└──────────────────────────────────────────────────────┘
        anchored 17dp above the safe-area bottom,
        one at a time, 2.6s auto-dismiss

┌ dialog · max 320 · radius 20 · padding 17 · gap 13 ─┐
│ Leave this match?                        800/19      │
│ "You'll be marked bankrupt and your properties       │
│  return to the bank. This can't be undone."  600/13  │
│ [ Stay ]                    [ Leave ]  danger        │
└──────────────────────────────────────────────────────┘
```

## 3. Element inventory

| # | Element | Component | Tokens |
| --- | --- | --- | --- |
| 1 | Toast | `Toast` | full width minus 34dp, radius 16, padding 12, gap 9; bg `rgba(12,42,99,.9)`, border 1dp `rgba(126,180,255,.45)`, shadow `0 12px 28px rgba(4,12,32,.5)` |
| 2 | Toast icon | Phosphor | 18dp; per kind in §4 |
| 3 | Toast title | `Text` | `700 14px` `#FFFFFF` |
| 4 | Toast body | `Text` | `600 12px` `rgba(198,220,255,0.8)` |
| 5 | Toast action | `TextButton` | optional, right, hit area 44dp, `700 13px` `#5FC0FF` |
| 6 | Scrim | `Scrim` | inset 0, `rgba(5,15,40,.64)` |
| 7 | Dialog | `Dialog` | max width 320, radius 20, padding 17, gap 13; bg `linear-gradient(180deg,#17489F,#123B88)`, border 1dp `rgba(126,180,255,.45)`, shadow `0 18px 44px rgba(4,12,32,.55)` |
| 8 | Dialog title | `Text` | `800 19px` `#FFFFFF` |
| 9 | Dialog body | `Text` | `600 13px` `rgba(198,220,255,0.9)` |
| 10 | Dismiss action | `Button.ghost` | `flex:1`, min-height 44, radius 16, `700 15px` `rgba(198,220,255,0.95)` |
| 11 | Confirm action | `Button.dangerSolid` | `flex:1`, min-height 44, radius 16, bg `linear-gradient(180deg,#F0524A,#C4231F)`, shadow `0 4px 0 #8C1F17`, `700 15px` `#FFFFFF` |

## 4. Toast inventory (verbatim)

All five are auto-dismiss at **2600ms**, one at a time, newest replacing the current one.

| Kind | Icon | Colour | Title | Body |
| --- | --- | --- | --- | --- |
| blocked | `ph-warning-circle` | `#FFC84A` | `Not enough cash` | `You need ₹420 more to build here.` |
| blocked | `ph-hourglass` | `#FFC84A` | `Not your turn` | `Player 3 is rolling.` |
| blocked | `ph-users-three` | `#FFC84A` | `Room is full` | `6 of 6 seats taken.` |
| success | `ph-coins` | `#7ADB25` | `Rent collected` | `Player 2 paid you ₹1,200.` |
| success | `ph-plugs-connected` | `#7ADB25` | `Reconnected` | `State synced from the server.` |

Amounts and names are interpolated live; the sentence shapes are fixed. Error toasts elsewhere in
the app take their title and body from `docs/13-error-catalog.md` and use the `ph-warning-circle`
icon in `#FF9A93` on the same component.

## 5. Dialog inventory

| Dialog | Title | Body | Actions |
| --- | --- | --- | --- |
| Leave match (online, fired by `3i`) | `Leave this match?` | `You'll be marked bankrupt and your properties return to the bank. This can't be undone.` | `Stay` (ghost) · `Leave` (danger) |

Other confirm dialogs in the app (delete account, unpublish, shrink board, delete tile) use the
same component with their own copy, documented in their screens' specs. The destructive action is
always on the right and is never the default focus.

## 6. Behaviour rules

| Rule | Detail |
| --- | --- |
| One at a time | A new toast replaces the current one immediately; there is no stack and no queue beyond depth 1 |
| Duration | 2600ms, extended to 6000ms when a screen reader is active, and indefinite when the toast carries an action |
| Dismissal | Swipe in any direction, tap the action, or timeout. Tapping the body does nothing |
| Position | 17dp above the safe-area bottom; it never covers a primary action — when a screen's primary button occupies that band, the toast rises above it |
| Interruption | A dialog takes priority: any visible toast is dismissed when a dialog opens |
| Persistence | Toasts never persist across navigation; a toast fired during a route change is shown on the destination |
| Match log | Every toast that reports a game event also appends a match-log line; the toast is the transient face of a permanent record |

## 7. States

| State | Behaviour |
| --- | --- |
| default | As drawn |
| with action | The action sits right of the body; the auto-dismiss timer is disabled |
| offline | Offline-caused toasts use the error shape and are not repeated more than once per 10000ms |
| dialog pending action | Both buttons disable and the confirm shows an 18dp spinner while a request is in flight; the dialog cannot be dismissed |
| dialog failure | The dialog stays open with an inline `600 12px` `#FF9A93` error line above the buttons |
| reduced motion | Toasts fade only, with no rise; dialogs fade with no scale |
| loading / empty / spectating / first-run / disabled | Not applicable |

## 8. Interactions

| Trigger | Result |
| --- | --- |
| Toast swipe | dismiss immediately, 140ms |
| Toast action tap | run the action, dismiss |
| Dialog dismiss action / scrim tap / Android back | close without acting |
| Dialog confirm | run the action; the dialog closes on success, stays open on failure |

## 9. Responsive

- Phones: toast is full width minus 34dp; dialog is 320dp max.
- Tablet: toast caps at 420dp and is centred; dialog stays 320dp.
- Landscape: toast keeps its bottom anchor; the dialog scrolls internally if it exceeds 80% height.
- Font scale 130%: the toast grows to three lines; the dialog's buttons stack vertically when their
  labels no longer fit side by side, confirm last.

## 10. Accessibility

- Toasts are `accessibilityLiveRegion="polite"`, success and blocked alike; error toasts use
  `assertive`.
- A toast with an action is focusable; a toast without one is not.
- Dialogs are `accessibilityViewIsModal`, focus starting on the title, returning to the trigger on
  dismiss.
- Icon colour is never the only signal — the title always states the outcome.
- Contrast: `#FFFFFF` on the toast ground = 12.4:1; `#7ADB25` on it = 7.6:1; `#FFC84A` = 7.3:1 — pass.

## 11. Animation

| What | Duration | Easing |
| --- | --- | --- |
| Toast in (opacity + 12dp rise) | 200ms | `ease-out` |
| Toast out | 180ms fade | `ease-in` |
| Toast replace (out then in) | 120ms + 200ms | `ease-in` / `ease-out` |
| Dialog present (scrim fade + scale 0.96 → 1) | 220ms | `cubic-bezier(0.2,0.8,0.2,1)` |
| Dialog dismiss | 180ms | `ease-in` |

## 12. Acceptance criteria

1. All five drawn toasts render with their exact titles and bodies, with live interpolation.
2. Toasts auto-dismiss at 2600ms and only one is visible at any moment.
3. A toast carrying an action does not auto-dismiss.
4. Toasts never cover a screen's primary action.
5. Opening a dialog dismisses any visible toast.
6. The leave dialog shows the exact title and body in §5, with `Stay` left and `Leave` right.
7. The destructive action is never the default focus in any dialog.
8. A failed confirm keeps the dialog open with an inline error.
9. Screen readers get 6000ms and an announcement for every toast.
10. Reduced-motion settings remove the rise and scale animations.
