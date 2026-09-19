# 13 · Error catalog

> Generated from `Royal Navy 1080 v2.dc.html` — 49 options / 93 screens (Session 9 export) · 19 September 2026.

Every error the user can reach. `code` is what crosses the wire and what appears in logs;
**Copy** is exactly what the user sees — do not rewrite it at the call site. Recovery says what the
UI offers.

Presentation: `toast` = `Toast` component, 3 s · `inline` = under the field or row in `danger` ·
`dialog` = `Dialog` with the listed buttons · `screen` = a full state (`3a` error, `3k` overlay,
`3r`).

## Network and session

| Code | HTTP | Copy | Presentation | Recovery |
| --- | --- | --- | --- | --- |
| `E_OFFLINE` | — | "You're offline. Reconnecting…" | screen (`3k`) | Auto-retry 1/2/4/8/16 s, then Retry button |
| `E_BACKEND_DOWN` | 503 | "Can't reach the deck. Try again." | screen (`3a` error variant) | Retry |
| `E_TIMEOUT` | 504 | "That took too long. Try again." | toast | Retry the action |
| `E_RATE_LIMITED` | 429 | "Too many tries. Wait a moment." | toast | Blocks for the remaining window |
| `E_UNAUTHENTICATED` | 401 | "Please sign in again." | screen → `/auth` | Silent refresh first; only shown if refresh fails |
| `E_FORBIDDEN` | 403 | "You can't do that." | toast | — |
| `E_VERSION_UNSUPPORTED` | 426 | "Update Royal Navy to keep playing." | dialog (single button "OK") | — |

## Auth and account

| Code | HTTP | Copy | Presentation | Recovery |
| --- | --- | --- | --- | --- |
| `E_EMAIL_TAKEN` | 409 | "That email is already registered." | inline | Offer sign-in |
| `E_HANDLE_TAKEN` | 409 | "That handle is taken." | inline | Suggest `handle2` |
| `E_HANDLE_INVALID` | 422 | "Handles use letters, numbers and underscores, 3–20 characters." | inline | — |
| `E_CREDENTIALS_INVALID` | 401 | "Email or password is wrong." | inline | — |
| `E_PASSWORD_WEAK` | 422 | "Use at least 8 characters." | inline | — |
| `E_PASSWORD_WRONG` | 401 | "Current password is wrong." | inline | — |
| `E_DELETE_CONFIRM_MISMATCH` | 422 | "Type DELETE to confirm." | inline (`3o`) | — |
| `E_ACCOUNT_DELETED` | 410 | "This account was deleted." | screen → `/auth` | — |

## Rooms, lobby and matches

| Code | HTTP | Copy | Presentation | Recovery |
| --- | --- | --- | --- | --- |
| `E_ROOM_NOT_FOUND` | 404 | "No room with that code." | inline (`1b` join field) | Re-enter |
| `E_ROOM_FULL` | 409 | "That room is full." | toast | — |
| `E_ROOM_STARTED` | 409 | "That match has already started." | toast | — |
| `E_ROOM_CLOSED` | 410 | "The host closed this room" | screen (`3r`) | "Back to modes" |
| `E_BLOCKED_BY_HOST` | 403 | "You can't join this room." | toast | — |
| `E_NOT_ENOUGH_PLAYERS` | 409 | "Only one player is left. The match will end in 10 seconds." | screen (`3r`) | Countdown + "End now" |
| `E_NOT_IN_MATCH` | 403 | "You're not in this match." | screen → `/modes` | — |
| `E_MATCH_NOT_LIVE` | 409 | "That match isn't running." | toast | — |
| `E_MATCH_ENDED_WHILE_AWAY` | 410 | "This match ended while you were away" | screen (`3r`) | "See result" / "Back to modes" |
| `E_MATCH_UNAVAILABLE` | 503 | "The match is catching up. One moment." | screen (`3k`) | Auto-retry |
| `E_HOST_ONLY` | 403 | "Only the host can do that." | toast | — |
| `E_SEAT_COLOUR_TAKEN` | 409 | "Someone already has that colour." | inline (`1b`) | Pick another |

## Turn and play

| Code | Copy | Presentation | Recovery |
| --- | --- | --- | --- |
| `E_NOT_YOUR_TURN` | "It's not your turn." | toast | Actions sheet rows are disabled with this reason |
| `E_STALE_SEQ` | *(silent)* | none | Client requests a full sync automatically |
| `E_FORBIDDEN_ACTOR` | "You can't act for another player." | toast | Logged as a possible client bug |
| `E_ACTION_ILLEGAL` | "You can't do that right now." | toast | `details.reason` names the guard |
| `E_DEBT_BLOCKING` | "Settle what you owe first." | toast | Reopens `1d` |
| `E_INSUFFICIENT_CASH` | "Not enough cash." | inline on the action's Pay button | Route to `1d` when it is a forced payment |
| `E_TILE_OWNED` | "Someone already owns that tile." | toast | — |
| `E_TILE_MORTGAGED` | "That tile is mortgaged." | inline | — |
| `E_BUILD_NEEDS_SET` | "You need the colour set to build." | inline (`1u`) | Shows the threshold, e.g. "3 of 5" |
| `E_BUILD_UNEVEN` | "Build evenly is on for this board." | inline (`1u`) | — |
| `E_BUILD_HOUSE_LIMIT` | "Four houses before a hotel." | inline | — |
| `E_SUPPLY_EXHAUSTED` | "The bank has no houses left." | toast | Hotel variant: "no hotels left" |
| `E_MORTGAGE_HAS_BUILDINGS` | "Sell the buildings first." | inline (`1q`) | Row disabled with this meta |
| `E_REDEEM_INSUFFICIENT` | "Not enough cash to redeem." | inline (`1r`) | Button disabled |
| `E_BID_TOO_LOW` | "Bid at least ₹{min}." | inline (`1t`) | Stepper snaps to the minimum |
| `E_BID_OVER_CASH` | "That's more than your cash." | inline (`1t`) | — |
| `E_AUCTION_PASSED` | "You passed on this auction." | toast | — |
| `E_AUCTION_OVER` | "That auction has ended." | toast | Closes the screen |
| `E_OFFER_EXPIRED` | "That offer expired." | toast | Closes the card |
| `E_TRADE_INVALID` | "That trade no longer works." | dialog ("OK") | `details.reason` says which side failed |
| `E_TRADE_SELF` | "You can't trade with yourself." | toast | — |
| `E_CARD_NOT_HELD` | "You don't have that card." | toast | — |
| `E_JAIL_BLOCKED` | "Not while you're in jail." | toast | — |
| `E_BAIL_INSUFFICIENT` | "Not enough cash for bail." | inline (`1n` in-jail card) | Roll remains available |

## Builders and publishing

| Code | Copy | Presentation | Recovery |
| --- | --- | --- | --- |
| `E_BOARD_NAME_TAKEN` | "You already have a board with that name." | inline (`2a` board name) | Replaces the "Name available" check |
| `E_BOARD_NAME_FILTERED` | "Pick a different name." | inline | `details.kind = 'profanity' \| 'trademark'` |
| `E_GRID_TOO_SMALL` | "At least 12 tiles needed." | inline at the stepper (`2a5`) | Stepper refuses the value |
| `E_SLOT_OCCUPIED` | "That slot already has a tile." | toast | — |
| `E_SLOTS_EMPTY` | "2 slots still empty" | ValidationPanel error row (`2a`) | "Fix" jumps to the first empty slot |
| `E_SET_BELOW_THRESHOLD` | "Purple set has 2 tiles, threshold 3" + meta "This set can never be held" | ValidationPanel error | "Fix" offers lower-threshold or add-tiles |
| `E_NO_START_TILE` | "Exactly one start tile is needed." | ValidationPanel error | — |
| `E_CARD_SPACE_NO_DECK` | "Every card space needs a deck." | ValidationPanel error | "Fix" opens the tile |
| `E_TOO_FEW_TILES` | "At least 12 tiles are needed." | ValidationPanel error | — |
| `E_BOARD_INVALID` | "Fix the errors before publishing." | inline on Publish (`2a` PUBLISH CHECKS) | Step 2/3 shows the count and Fix |
| `E_RULE_CONTRADICTION` | "Two rules contradict each other." | ValidationPanel error in Rule lab | `details.rules[]` |
| `E_PUBLISH_SLOTS_FULL` | "All 3 slots used. Unpublish a board to free one." | inline + caret to published boards | — |
| `E_PUBLISH_UNCHANGED` | "Nothing has changed since version {n}." | toast | — |
| `E_TILE_NAME_TAKEN` | "A tile with that name exists on this board." | inline (`1x`) | — |
| `E_RULE_NAME_TAKEN` | "Must be unique across the rule library." | inline (`1z`) | — |
| `E_DECK_NAME_TAKEN` | "Must be unique across card decks." | inline (`1y`) | — |
| `E_COLOUR_IN_USE` | "Used by the {set} set" | tooltip on the locked swatch (`1x`) | Pick an unused colour |
| `E_RULE_LOCKED` | "This rule is in use" + "Locked items can't be edited directly." | dialog: "Edit as a copy" / Cancel | Per D4 — *the dialog itself is **OQ-11*** |
| `E_BOARD_UNAVAILABLE` | "That board isn't available." | toast (catalogue / deep link) | Returns to `/catalogue` |

## Local storage and content

| Code | Copy | Presentation | Recovery |
| --- | --- | --- | --- |
| `E_LOCAL_DB_FAIL` | "Couldn't save on this device." | dialog ("Retry" / "Cancel") | Retries the write once |
| `E_LOCAL_DB_CORRUPT` | "Your local boards couldn't be read." | dialog ("Export a copy" / "Start fresh") | Export dumps raw JSON to the share sheet |
| `E_ART_TOO_LARGE` | "Use a PNG up to 512 px." | inline (`1x` art upload) | — |
| `E_ART_UNSUPPORTED` | "PNG only." | inline | — |
| `E_STORAGE_FULL` | "No space left on this device." | toast | — |

## Internal — never shown raw

| Code | Behaviour |
| --- | --- |
| `E_INVARIANT_VIOLATED` | Server refuses the action, logs `engine_invariant_violated` at error, sends a full sync. The user sees `E_ACTION_ILLEGAL`. |
| `E_ENGINE_PANIC` | Same, plus the match is flagged for review. The user sees "Something went wrong. The match is safe." |
| `E_SCHEMA_MISMATCH` | Payload failed its zod schema. Logged with the path; the user sees `E_ACTION_ILLEGAL`. |

## Copy rules

1. One sentence, sentence case, no exclamation marks.
2. Say what happened and what to do — never "an error occurred".
3. Never show a code to the user. Codes belong in logs and in `docs/bug-log.md`.
4. Money in copy uses ₹ and Indian grouping, interpolated as `{min}`, `{amount}`.
5. Where the design already contains the wording (the ValidationPanel rows, `3r`'s bodies, the jail
   and raise-cash metas), that wording **is** the copy — this table quotes it verbatim.
