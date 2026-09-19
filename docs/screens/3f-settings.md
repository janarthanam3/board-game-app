# 3f · Settings

> Generated from `Royal Navy 1080 v2.dc.html` — option 3f, screen "Settings / default" (Session 9 export) · 19 September 2026.

## 1. Purpose and navigation position

App-level preferences. Route `/settings`, pushed from the gear on `3e` and from the pause sheet
(`3i`). Back returns to the caller.

## 2. Layout map

Frame 360 × 780, padding 17, flex-column, gap 13.

```
┌──────────────────────────────────────────────────┐
│ ‹  Settings                                     │
│ ── Game ──────────────────────────────────────  │
│ Sound effects                          [toggle] │
│ Music                                  [toggle] │
│ Haptics                                [toggle] │
│ Event cards                 Decisions only   ›  │
│   [ All | Decisions only | Off ]  segmented     │
│   "Decisions only keeps cards with buttons —    │
│    rent due, property cost, auction, deal,      │
│    jail. Suppressed events still appear in the  │
│    match log."                                  │
│ "Turn timer is set by the board."               │
│ ── Account ───────────────────────────────────  │
│ Account                                      ›  │
│ Notifications                                ›  │
│ Language                    English          ›  │
│ Privacy                                      ›  │
│ [ Sign out ]                                    │
│ "Royal Navy 1.0.0 · build 104"  centred         │
└──────────────────────────────────────────────────┘
```

**There is no starting-cash control and no turn-timer control on this screen** — both are board
properties (decision D1). The line `Turn timer is set by the board.` states that in the UI; keep it.

## 3. Element inventory

| # | Element | Component | Size / anchor | Tokens |
| --- | --- | --- | --- | --- |
| 1 | Frame | `ScreenFrame` | 360×780, padding 17, gap 13, scrolling column | standard screen tokens |
| 2 | Header | `ScreenHeader` | caret + title | `700 22px` `#FFFFFF` = `Settings` |
| 3 | Section label | `SectionLabel` | gap 8 to hairline | `800 11px` `.12em` `rgba(198,220,255,0.8)`; copies `Game`, `Account` |
| 4 | Toggle row | `ToggleRow` ×3 | full width, min-height 48, radius 17, padding 11/12 | card tokens; label `600 14px` `rgba(198,220,255,0.95)`; switch 44×26, on-track `rgba(122,219,37,.45)` with `#7ADB25` knob, off-track `rgba(8,26,64,.5)` with `rgba(198,220,255,0.8)` knob |
| 5 | Event cards row | `SettingRow` | as #4 | label `Event cards`; value `600 13px` `#5FC0FF` = the current mode; caret `ph-caret-right` 16dp |
| 6 | Event cards segmented | `Segmented` | three halves, radius 17 | labels `All`, `Decisions only`, `Off`; default `Decisions only` |
| 7 | Event cards body | `Text` | full width | `600 12px` `rgba(198,220,255,0.8)`, copy: `Decisions only keeps cards with buttons — rent due, property cost, auction, deal, jail. Suppressed events still appear in the match log.` |
| 8 | Turn timer note | `Text` | full width | `600 12px` `rgba(198,220,255,0.75)`, copy: `Turn timer is set by the board.` |
| 9 | Nav row | `NavRow` ×4 | as #4 with caret | labels `Account`, `Notifications`, `Language`, `Privacy`; `Language` carries the value `English` in `600 13px` `#5FC0FF` |
| 10 | Sign out | `Button.danger` | full width, min-height 44, radius 16 | bg `rgba(240,82,74,.14)`, border 1dp `rgba(240,82,74,.6)`, label `700 15px` `#FF9A93` = `Sign out` |
| 11 | Build line | `Text` | centred, foot | `600 12px` `rgba(198,220,255,0.75)` = `Royal Navy 1.0.0 · build 104` |

## 4. States

| State | Behaviour |
| --- | --- |
| default | As drawn; toggles reflect the stored preferences (all three default on) |
| loading | None — every value is local; the screen paints immediately |
| saving | A toggle animates immediately; if the server sync for notifications fails, it reverts and a toast shows `Couldn't save that setting.` |
| offline | Local preferences still work. `Account`, `Notifications` and `Privacy` rows render at 45% opacity with the hint `Needs a connection` and cannot be tapped |
| error | Toast only; no blocking dialog anywhere on this screen |
| in-match (opened from the pause sheet) | Identical, except `Sign out` is hidden — leaving a match must go through the pause sheet |
| first-run / spectating / disconnected / reconnecting | No difference |

## 5. Interactions

| Trigger | Validation | Result |
| --- | --- | --- |
| Sound effects / Music / Haptics | — | write to local settings store, effective immediately (music fades over 400ms) |
| Event cards segmented | — | write `eventCardMode`; affects `1n` notification cards from the next event onward, never retroactively |
| `Account` | connectivity | push `/settings/account` |
| `Notifications` | connectivity | push the OS notification settings sheet; if permission is denied, show the row's hint `Blocked in Android settings` |
| `Language` | — | open a picker; v1 ships `English` only, so the row opens a sheet with a single checked option (see OPEN-QUESTIONS Q-I18N-01) |
| `Privacy` | connectivity | push `/settings/privacy` |
| `Sign out` | — | confirm dialog `Sign out?` / `You'll need to sign in again to play online.` / `Cancel`, `Sign out`; on confirm clear both tokens, clear the socket, `router.replace('/auth')`. Local boards and local matches are **not** deleted |
| Back | — | pop to the caller |

## 6. Data contract

Local settings store (MMKV/async storage): `sfx`, `music`, `haptics`, `eventCardMode`, `language`.
Server: `PATCH /me/preferences` for notification opt-ins only.
No socket subscriptions.

## 7. Responsive

- 360dp as designed; the column scrolls when the content exceeds the frame.
- Tablet: capped at 560dp centred.
- Landscape: single column, scrolling.
- Font scale 130%: the Event cards body grows to four lines; rows grow to 60dp; nothing truncates.

## 8. Accessibility

- Toggles: `accessibilityRole="switch"` with the label and current state.
- The Event cards segmented control is a `tablist`; element 7 is its `accessibilityHint`.
- `Sign out` is `accessibilityRole="button"` and its confirm dialog traps focus.
- Contrast: `#FF9A93` on the danger tint = 5.9:1; `#5FC0FF` on card = 6.2:1 — pass.

## 9. Animation

| What | Duration | Easing |
| --- | --- | --- |
| Toggle knob | 160ms | `cubic-bezier(0.2,0.8,0.2,1)` |
| Segmented indicator | 180ms | `ease-out` |
| Music fade on toggle off | 400ms | `linear` |
| Row press | 90ms | `ease-out` |

## 10. Acceptance criteria

1. Sections appear in the order `Game` then `Account`.
2. The Game section contains exactly Sound effects, Music, Haptics, Event cards — no starting cash,
   no turn timer control.
3. The note `Turn timer is set by the board.` is present verbatim.
4. Event cards defaults to `Decisions only` and its explainer matches §3 verbatim.
5. Changing Event cards takes effect on the next match event only.
6. `Language` shows `English` and opens a single-option picker.
7. `Sign out` confirms first and clears both tokens, leaving local boards intact.
8. The build line reads `Royal Navy 1.0.0 · build 104`, sourced from the app config.
9. Opened from the pause sheet, `Sign out` is not rendered.
10. Offline disables the three connection-dependent rows and leaves the toggles usable.
