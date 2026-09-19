# Flow · Account and privacy

> Generated from `Royal Navy 1080 v2.dc.html` (Session 9 export) · 19 September 2026.
> Screens: `1a` auth, `3f` settings, `3o` account, `3p` privacy, `3q` report and block.

## Sequence

```mermaid
sequenceDiagram
  participant U as User
  participant A as App
  participant S as Server
  participant DB as Postgres

  U->>A: sign up / sign in (1a)
  A->>S: POST /auth/register | /auth/login
  S-->>A: {accessToken, refreshToken}
  A->>A: store both in expo-secure-store

  U->>A: Settings (3f) -> Account (3o)
  U->>A: edit display name
  A->>S: PATCH /me {displayName}
  S->>DB: update, enforce uniqueness

  U->>A: Privacy (3p)
  U->>A: Download my data
  A->>S: POST /me/export
  loop poll every 2s, max 60s
    A->>S: GET /me/export/:id
  end
  S-->>A: ready {url}
  A->>A: Android share sheet, royal-navy-data-<date>.json

  U->>A: Delete account (3o)
  A->>S: GET /me/deletion-preview
  S-->>A: {customBoards, publishedBoards}
  U->>A: type DELETE, confirm
  A->>S: DELETE /me
  S->>DB: erase profile, history, boards; unpublish published versions
  S->>S: live matches keep running with the seat intact
  A->>A: clear tokens and caches, replace to /auth
```

## Steps

| # | Step | Screen | Endpoint | Result |
| --- | --- | --- | --- | --- |
| 1 | Register or sign in | `1a` | `POST /auth/register` / `/auth/login` | tokens stored, `/modes` |
| 2 | Refresh on cold start | `3a` | `POST /auth/refresh` | silent; failure routes to `/auth` |
| 3 | Change display name | `3o` | `PATCH /me` | unique, 3–16 chars |
| 4 | Change password | `3o` | `POST /auth/password` | new ≥ 8 chars with a letter and a digit |
| 5 | Visibility switches | `3p` | `PATCH /me/privacy` | leaderboard visibility, stranger requests |
| 6 | Export data | `3p` | `POST /me/export`, `GET /me/export/:id` | JSON through the share sheet |
| 7 | Blocked players | `3p` | `GET /me/blocks`, `DELETE /me/blocks/:id` | list and unblock |
| 8 | Report or block a player | `3q` | `POST /reports`, `POST /me/blocks` | report reasons, block with a 6s undo |
| 9 | Sign out | `3f` | — | clear tokens; local boards and matches stay |
| 10 | Delete account | `3o` | `GET /me/deletion-preview`, `DELETE /me` | type-to-confirm, then erase |

## Deletion semantics

| Data | On account deletion |
| --- | --- |
| Profile, handle, email | Erased |
| Match history and stats | Erased |
| Local boards on the device | Deleted with the app data; the server never had them |
| Published board versions | Taken offline (unpublished), then anonymised — matches already running on them keep running to the end |
| Live matches the player is in | Continue; the seat is resolved by the disconnected-player rules |
| Reports the player filed | Retained, anonymised, for moderation |
| Blocks the player set | Erased |

The confirm dialog states exactly this, with live counts.

## Failure branches

| Branch | Handling |
| --- | --- |
| Email already registered | `E_AUTH_EMAIL_TAKEN`, field error on Email |
| Wrong credentials | `E_AUTH_INVALID_CREDENTIALS`, server error card, email preserved |
| Refresh token expired or revoked | Silent sign-out, `/auth`, no error card |
| Display name taken | Field error `That name is taken.` |
| Export already in flight | The row is disabled; only one export at a time |
| Export times out at 60s | Row reads `Couldn't prepare the file.`; tapping retries |
| Confirm text mismatched | Delete stays disabled — exact, case-sensitive `DELETE` |
| Deletion fails server-side | Dialog stays open with an inline error; nothing is erased |
| Offline | Every account and privacy action is blocked with the documented banner; local settings still work |
| Report of a player who left | Still accepted — reports are by user id, not by match membership |

## Invariants

1. Tokens live only in `expo-secure-store`, never in async storage or a log line.
2. Email is immutable in v1 and the UI says so.
3. Deletion is irreversible and requires the exact typed confirmation.
4. Blocking never ejects a player from a running match; it prevents future matchmaking.
5. Privacy switches take effect on the next fetch, with no cached leak.
6. The privacy screen is reachable by deep link for the Play Store data-deletion listing.
