# 1a · Auth — landing and sign in

> Generated from `Royal Navy 1080 v2.dc.html` — option 1a, screens "Auth landing", "Sign in" (Session 9 export) · 19 September 2026.

## 1. Purpose and navigation position

Account entry. Two screens in one route: `/auth?mode=landing` (marketing panel + two actions) and
`/auth?mode=signin` (segmented sign in / sign up form). Guard: unauthenticated only — a valid session
redirects to `/modes`. Android back exits the app from `landing`; from `signin` it returns to
`landing`.

## 2. Layout map

Both frames 360 × 780dp, padding **20dp**, flex-column, gap 17dp.

### 2.1 Landing
```
┌ 360 × 780 · padding 20 · gap 17 ────────────────┐
│ ┌ hero placeholder · flex:1 · dashed ─────────┐ │
│ │      "board / hero art"                     │ │
│ │      "placeholder"                          │ │
│ └──────────────────────────────────────────────┘ │
│  "Play the board,"                              │
│  "skip the paper money."       700/29 white     │
│  ▬▬▬▬▬▬▬▬  8dp bar, width 80%                   │
│  ▬▬▬▬▬     8dp bar, width 55%                   │
│  ┌ actions · gap 11 ─────────────────────────┐  │
│  │ [ Create account ]  green, 800/17          │  │
│  │ [ Sign in ]         navy + gold border     │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

### 2.2 Sign in
```
┌ 360 × 780 · padding 20 · gap 17 ────────────────┐
│  ‹ Back        Sign in            (spacer)      │  700/16 row
│  [ Sign in | Sign up ]  segmented, radius 17    │
│  Email                                          │
│  [ input 50dp ]                                 │
│  Password                                       │
│  [ input 50dp ]                                 │
│  "Forgot password?"                             │
│  [ Continue ]  green, 800/17                    │
└──────────────────────────────────────────────────┘
```

## 3. Element inventory

| # | Element | Component | Size / anchor | Tokens |
| --- | --- | --- | --- | --- |
| 1 | Frame | `ScreenFrame` | 360×780, padding 20, gap 17 | bg `linear-gradient(180deg,#133D8C,#0B2456 58%,#0E2E66)`, border 2dp `#2C6BE0`, radius 16 |
| 2 | Hero placeholder | `ImageSlot` | `flex:1`, radius 17, padding 14, dashed 1dp `rgba(126,180,255,.4)` | bg `linear-gradient(180deg,rgba(126,180,255,0.09),rgba(8,26,64,.5))`, inset highlight `rgba(255,255,255,.05)`; caption `600 16px`, `rgba(198,220,255,0.8)`, copy `board / hero art` / `placeholder` on two lines |
| 3 | Headline | `Text` | two lines, flush left | `700 29px Baloo 2`, `#FFFFFF`, copy `Play the board,` / `skip the paper money.` |
| 4 | Text bar 1 | `View` | height 8, radius 3.9, width 80% | `rgba(126,180,255,0.14)` |
| 5 | Text bar 2 | `View` | height 8, radius 3.9, width 55% | `rgba(126,180,255,0.14)` |
| 6 | Create account | `Button.primaryGreen` | full width, radius 18, padding 17 | bg `linear-gradient(180deg,#7ADB25,#3FA209)`, shadow `inset 0 2.1px 0 rgba(255,255,255,.55), 0 6px 0 #2C7A06, 0 11px 22px rgba(5,15,40,.4)`, label `800 17px`, `#FFFFFF`, letter-spacing `.1em` |
| 7 | Sign in (landing) | `Button.outlineGold` | full width, radius 18, padding 15 | bg `linear-gradient(180deg,#17489F,#123B88)`, border 2dp `#FFC84A`, label `800 17px`, `#FFFFFF`, letter-spacing `.1em`, shadow `inset 0 1.4px 0 rgba(255,255,255,.12), 0 4px 0 rgba(5,15,40,.5)` |
| 8 | Header row | `Row` | space-between | `700 16px`, `rgba(198,220,255,.9)`; left `‹ Back`, centre `Sign in`, right empty spacer |
| 9 | Segmented control | `Segmented` | full width, radius 17, border 1dp `rgba(126,180,255,0.27)`, each half padding 11 | active: bg `rgba(95,192,255,.16)`, text `#5FC0FF`; inactive: `rgba(198,220,255,.9)`; labels `Sign in`, `Sign up` |
| 10 | Field label | `Text` | gap 7 above input | `600 15px`, `rgba(198,220,255,.9)`; copy `Email`, `Password` |
| 11 | Text input | `Input` | height 50, radius 17, border 1dp `rgba(126,180,255,0.27)` | text `600 15px`, `#FFFFFF`; no fill |
| 12 | Forgot password | `TextButton` | left-aligned, hit area 44dp | `600 15px`, `rgba(198,220,255,0.8)`, copy `Forgot password?` |
| 13 | Continue | `Button.primaryGreen` | as #6 | copy `Continue` |

Sign-up mode reuses #9–#13 with a third field **Display name** above Email, same input token; the
primary label stays `Continue`.

## 4. States

| State | Behaviour |
| --- | --- |
| default | As drawn; Continue enabled (validation happens on press) |
| loading | Continue shows an inline 18dp spinner in place of its label, control disabled, inputs read-only |
| error (field) | The offending input's border becomes 1dp `#F0524A` with a `600 12px` `#FF9A93` message 6dp beneath it |
| error (server) | Error card identical to 3a element 11, inserted directly above Continue |
| offline | On press: error card `You're offline. Connect and try again.`, no request sent |
| disabled | Continue disabled at 45% opacity while a request is in flight |
| first-run | Reached from `3b` slide 3 / Skip; no difference in rendering |
| disconnected / reconnecting / spectating | Not applicable |

## 5. Interactions

| Trigger | Validation | Optimistic UI | Server | Success | Failure |
| --- | --- | --- | --- | --- | --- |
| Landing → `Create account` | — | — | — | `/auth?mode=signin` with the Sign up half active | — |
| Landing → `Sign in` | — | — | — | `/auth?mode=signin`, Sign in half active | — |
| Segmented tap | — | swap form immediately, keep typed email | — | — | — |
| `Continue` (sign in) | email matches RFC-5322 simple pattern; password ≥ 8 chars | loading state | `POST /auth/login` | store tokens, `router.replace('/modes')` | `E_AUTH_INVALID_CREDENTIALS` → server error card `Email or password is wrong.` |
| `Continue` (sign up) | display name 3–16 chars, `^[A-Za-z0-9 _-]+$`; email pattern; password ≥ 8 chars with one letter and one digit | loading state | `POST /auth/register` | store tokens, `router.replace('/modes')` | `E_AUTH_EMAIL_TAKEN` → field error on Email: `That email already has an account.` |
| `Forgot password?` | — | — | `POST /auth/forgot` | toast `Check your email for a reset link.` | generic server error card |
| `‹ Back` / Android back | — | — | — | `/auth?mode=landing` | — |

## 6. Data contract

Reads: nothing persisted except a remembered email address (`lastEmail`, plain async storage).
Writes: `accessToken`, `refreshToken` to expo-secure-store.
Endpoints: `POST /auth/login`, `POST /auth/register`, `POST /auth/forgot`.
No socket connection on this screen.

## 7. Responsive

- 360dp as designed; content column caps at 480dp on tablet, centred.
- Landscape: the hero placeholder collapses to `height: 140` and the page scrolls.
- Keyboard: the form is inside a `KeyboardAvoidingView`; Continue stays visible above the keyboard;
  the segmented control may scroll off.
- Safe area added to the 20dp padding.
- Font scale 130%: the headline reflows to three lines and the hero placeholder shrinks first
  (`minHeight: 120`). Inputs grow to 58dp; nothing truncates.

## 8. Accessibility

- Inputs: `accessibilityLabel` = visible label; `textContentType` email / password;
  `autoComplete` on; password has a show/hide toggle at 44 × 44dp inside the field's right edge.
- Segmented control: `accessibilityRole="tablist"`, each half `tab` with `selected` state.
- Errors announced with `accessibilityLiveRegion="assertive"`.
- Focus order: Back → segmented → Display name (sign up) → Email → Password → Forgot → Continue.
- Contrast: `#FFFFFF` on `#3FA209` = 4.6:1 (pass at 17dp bold); `#5FC0FF` on the active segment tint
  = 6.9:1; hint text `rgba(198,220,255,0.8)` on the ground = 8.2:1.

## 9. Animation

| What | Duration | Easing |
| --- | --- | --- |
| Landing → sign in push | 260ms slide from the right | `cubic-bezier(0.2,0.8,0.2,1)` |
| Segmented indicator slide | 180ms | `ease-out` |
| Button press (translateY +2dp, shadow 6 → 3dp) | 90ms | `ease-out` |
| Field error shake (±4dp, 2 cycles) | 240ms total | `ease-in-out` |

## 10. Acceptance criteria

1. Landing shows the hero placeholder, the two-line headline verbatim, both 8dp bars at 80% / 55%,
   and the two buttons in the order Create account, Sign in.
2. Both landing buttons reach the same route; only the active segment half differs.
3. Sign in validates email format and an 8-character minimum before any request.
4. Sign up adds exactly one field (Display name) above Email.
5. A wrong password shows the server error card with the copy in §5 and leaves the email filled.
6. A successful auth writes both tokens to secure store and replaces the route with `/modes`.
7. `Forgot password?` always shows the same toast, whether or not the email exists.
8. With the keyboard open on a 360 × 640dp device, Continue stays visible.
9. All targets ≥ 44dp, including `Forgot password?` and `‹ Back`.
10. Android back from sign in returns to landing, never to `/onboarding`.
