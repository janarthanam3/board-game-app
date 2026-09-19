# 3o · Account

> Generated from `Royal Navy 1080 v2.dc.html` — option 3o, screens "Account", "Delete account — confirm" (Session 9 export) · 19 September 2026.

## 1. Purpose and navigation position

Identity, sign-in credentials, and account deletion. Route `/settings/account`, pushed from `3f`
and from the avatar on `3e`. Back returns to `/settings`. The delete confirm is a dialog over this
screen, not a route.

## 2. Layout map

Frame 360 × 780, padding 17, flex-column, gap 13, scrolling column.

```
┌──────────────────────────────────────────────────┐
│ ‹  Account                                      │
│    Signed in as naveen@gmail.com                │
│ ── PROFILE ───────────────────────────────────  │
│ Display name                    Naveen       ✎  │
│ naveen@gmail.com                                │
│ Email · cannot be changed                       │
│ ── SIGN IN ───────────────────────────────────  │
│ Change password                              ›  │
│ Last changed 4 months ago                       │
│ Linked sign-in                                  │
│ Google · naveen@gmail.com                       │
│ ── DANGER ZONE ───────────────────────────────  │
│ "Deleting your account removes your match       │
│  history, custom boards and any board you have  │
│  published. Players in your live matches keep   │
│  playing to the end."                           │
│ [ Delete account ]  danger                      │
└──────────────────────────────────────────────────┘
```

### Delete confirm dialog (over the dimmed screen)

```
┌ dialog · radius 20 · padding 17 · gap 13 ───────┐
│ Delete your account?             800/19          │
│ • Match history and stats are erased.            │
│ • 7 custom boards are deleted.                   │
│ • 2 published boards are taken offline.          │
│ • This cannot be undone.                         │
│ Type DELETE to confirm                           │
│ [ input · placeholder DELETE ]                   │
│ [ Cancel ]            [ Delete ]  danger         │
└──────────────────────────────────────────────────┘
```

## 3. Element inventory

| # | Element | Component | Size / anchor | Tokens |
| --- | --- | --- | --- | --- |
| 1 | Frame | `ScreenFrame` | 360×780, padding 17, gap 13 | standard screen tokens |
| 2 | Header | `ScreenHeader` | caret + title + subtitle | title `700 19px` `#FFFFFF` = `Account`; subtitle `600 12px` `rgba(198,220,255,0.8)` = `Signed in as naveen@gmail.com` |
| 3 | Section label | `SectionLabel` | gap 8 to hairline | `800 11px` `.12em` `rgba(198,220,255,0.8)`; copies `PROFILE`, `SIGN IN`, `DANGER ZONE` |
| 4 | Display name row | `SettingRow` | radius 17, padding 11/12 | card tokens; label `600 14px` `rgba(198,220,255,0.95)` = `Display name`; value `700 15px` `#FFFFFF` = `Naveen`; `ph-pencil-simple` 16dp `rgba(198,220,255,0.8)` |
| 5 | Email row | `SettingRow.readonly` | as #4, no caret | value `700 15px` `#FFFFFF` = `naveen@gmail.com`; meta `600 12px` `rgba(198,220,255,0.8)` = `Email · cannot be changed`; whole row at 100% opacity but non-interactive |
| 6 | Change password row | `NavRow` | as #4 with caret | label `Change password`; meta `Last changed 4 months ago` |
| 7 | Linked sign-in row | `SettingRow.readonly` | as #5 | label `Linked sign-in`; value `Google · naveen@gmail.com` with `ph-google-logo` 16dp `rgba(198,220,255,0.95)` |
| 8 | Danger explainer | `Text` | full width | `600 12px` `rgba(198,220,255,0.8)`, copy: `Deleting your account removes your match history, custom boards and any board you have published. Players in your live matches keep playing to the end.` |
| 9 | Delete account | `Button.danger` | full width, min-height 44, radius 16 | bg `rgba(240,82,74,.14)`, border 1dp `rgba(240,82,74,.6)`, label `700 15px` `#FF9A93` = `Delete account` |
| 10 | Dialog scrim | `Scrim` | inset 0 | `rgba(5,15,40,.64)` |
| 11 | Dialog | `Dialog` | max width 320, radius 20, padding 17, gap 13 | bg `linear-gradient(180deg,#17489F,#123B88)`, border 1dp `rgba(126,180,255,.45)`, shadow `0 18px 44px rgba(4,12,32,.55)` |
| 12 | Dialog title | `Text` | — | `800 19px` `#FFFFFF` = `Delete your account?` |
| 13 | Consequence line | `Text` ×4 | gap 6, bullet `ph-dot` | `600 13px` `rgba(198,220,255,0.9)`; the last line `700 13px` `#FF9A93` |
| 14 | Confirm label | `Text` | — | `600 12px` `rgba(198,220,255,0.8)` = `Type DELETE to confirm` |
| 15 | Confirm input | `Input` | height 46, radius 14 | border 1dp `rgba(126,180,255,0.27)`, text `700 15px` `#FFFFFF`, placeholder `DELETE` in `rgba(198,220,255,.45)` |
| 16 | Cancel | `Button.ghost` | `flex:1`, min-height 44 | bg `rgba(8,26,64,.35)`, border 1dp `rgba(126,180,255,.45)`, `700 15px` `rgba(198,220,255,0.95)` |
| 17 | Delete | `Button.dangerSolid` | `flex:1`, min-height 44 | bg `linear-gradient(180deg,#F0524A,#C4231F)`, shadow `0 4px 0 #8C1F17`, `700 15px` `#FFFFFF` |

### Consequence lines (verbatim, counts are live)

`Match history and stats are erased.` · `<n> custom boards are deleted.` ·
`<n> published boards are taken offline.` · `This cannot be undone.`

## 4. States

| State | Behaviour |
| --- | --- |
| default | As drawn |
| loading | Counts in the dialog are fetched when the dialog opens; until they land the two count lines render as 90 × 13dp skeleton bars |
| editing display name | Inline field, 3–16 characters, `^[A-Za-z0-9 _-]+$`; Save appears as a 44dp gold button under the row |
| error (name taken) | Field border `#F0524A`, message `600 12px` `#FF9A93`: `That name is taken.` |
| delete disabled | The Delete button is disabled (45% opacity) until the input equals `DELETE` exactly, case-sensitive |
| deleting | Delete shows a spinner; both buttons disabled; the dialog cannot be dismissed |
| offline | The whole screen renders at 45% opacity with a banner under the header: `You're offline. Account settings need a connection.`; no row is tappable |
| error (server) | Toast with the error-catalog copy; the dialog stays open |
| first-run / spectating / reconnecting / disconnected | Not applicable |

## 5. Interactions

| Trigger | Validation | Server | Result |
| --- | --- | --- | --- |
| Edit display name | 3–16 chars, allowed set, not taken | `PATCH /me { displayName }` | row updates; toast `Name updated.` |
| `Change password` | — | — | push the change-password form (current, new, confirm; new ≥ 8 chars with a letter and a digit) |
| Email row tap | — | — | no-op; the row is informational |
| `Delete account` | — | `GET /me/deletion-preview` | open the dialog with live counts |
| Type in confirm input | exact match `DELETE` | — | enables Delete |
| `Delete` | input valid | `DELETE /me` | clear tokens and local caches, `router.replace('/auth')`, toast `Your account has been deleted.` |
| `Cancel` / scrim tap / Android back | — | — | dismiss the dialog, clear the typed text |

Live matches the player is in continue server-side; the account's seat is replaced by the
disconnected-player rules in `docs/05-game-rules.md`.

## 6. Data contract

`GET /me` → `{ displayName, email, provider, providerEmail, passwordChangedAt }`.
`GET /me/deletion-preview` → `{ customBoards, publishedBoards }`.
`PATCH /me`, `DELETE /me`. No socket subscriptions.

## 7. Responsive

- 360dp as designed; the column scrolls.
- Tablet: capped at 560dp centred; the dialog stays 320dp.
- Landscape: single scrolling column; the dialog is vertically scrollable if it exceeds the height.
- Font scale 130%: the danger explainer grows to six lines; the dialog scrolls internally, its
  buttons stay pinned to the dialog's bottom.

## 8. Accessibility

- Dialog: `accessibilityViewIsModal`, focus moves to the title on open and returns to
  `Delete account` on cancel.
- The confirm input has `autoCapitalize="characters"`, `autoCorrect={false}`.
- Read-only rows are announced with `, cannot be changed`.
- Contrast: `#FF9A93` on the danger tint = 5.9:1; `#FFFFFF` on `#F0524A` = 4.6:1 at 15dp bold — pass.

## 9. Animation

| What | Duration | Easing |
| --- | --- | --- |
| Dialog present (scrim fade + dialog scale 0.96 → 1) | 220ms | `cubic-bezier(0.2,0.8,0.2,1)` |
| Dialog dismiss | 180ms | `ease-in` |
| Delete enable (opacity 0.45 → 1) | 120ms | `ease-out` |
| Row press | 90ms | `ease-out` |

## 10. Acceptance criteria

1. Sections read `PROFILE`, `SIGN IN`, `DANGER ZONE` in that order.
2. The email row is visibly read-only and carries the copy `Email · cannot be changed`.
3. The danger explainer matches §3 verbatim.
4. The dialog lists all four consequence lines, with live board counts.
5. Delete stays disabled until the input is exactly `DELETE`.
6. Confirming deletes the account, clears tokens and local caches, and lands on `/auth`.
7. Cancel clears the typed text so reopening starts disabled again.
8. Offline blocks every action on this screen with the documented banner.
9. Back returns to `/settings`.
10. All targets ≥ 44dp.
