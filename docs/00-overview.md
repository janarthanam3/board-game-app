# 00 · Overview

> Generated from `Royal Navy 1080 v2.dc.html` — 49 options / 93 screens (Session 9 export) · 19 September 2026.

## What the product is

Royal Navy is an Android board game for 2–6 players. Players move around a ring of tiles, buy
property, collect rent, and try to hold the highest net worth when the round cap is reached. What
separates it from the genre is that **the board is content**: a player can build a board of 16, 24,
40 or a custom number of tiles, set what every tile costs and does, write the rules that card spaces
draw from, publish up to three boards, and host online matches on anyone's published board.

## The three play modes

| Mode | Players | Network | Boards allowed |
| --- | --- | --- | --- |
| Online multiplayer | 2–6 | Room code, Socket.IO | Published boards only |
| Pass and play | 2–6 | None | Local and published |
| Solo vs AI | 1 + 1–5 AI | None | Local and published |

There is no public matchmaking queue, no skill rating and no live lobby (D6). The only routes into a
match are a shared six-character room code or a friend invite.

## The content model in one paragraph

A **rule** is one effect ("Bank pays you ₹3,000"). A **deck** is an ordered or shuffled set of rules.
A **card space** tile draws from a deck. A **board** is a ring of tiles plus a ruleset (money,
colour-set threshold, jail, rounds and pace). Rules and decks live in a global per-user library; a
rule used by a deck is locked and is edited by copy-and-replace (D4). Boards are built locally and
unlimited; publishing freezes a **version** on the server and consumes one of three slots (D5). A
published board carries copies of its decks and rules, so it plays identically on a device whose
library is completely different.

## Who does what

- **Client** (`apps/mobile`) renders state, validates optimistically, and sends intents. It never
  decides a random outcome and never decides legality on its own authority.
- **Server** (`apps/server`) owns the match. It holds the authoritative state in Redis, applies every
  action through the shared engine, broadcasts the resulting state diff, and persists the finished
  match to Postgres.
- **Engine** (`packages/game-engine`) is a pure reducer. Same input, same output, on both sides.
  The client uses it for prediction and for pass-and-play/solo, where there is no server at all.

## Scope of v1

In:

- All three play modes, 2–6 players.
- Board builder (5×5 / 7×7 / 11×11 / custom), tile builder, rule library, card-deck builder, Rule lab.
- Publishing, catalogue, board detail, unpublish, report board, report/block player.
- Auctions, trades, mortgage/redeem, building, raise-cash, bankruptcy, jail, spectating, match log,
  match result with per-player breakdown, board analytics.
- Account and privacy including in-app account deletion (Play Store requirement).
- Solo AI at three difficulties. Seeded, replayable matches.

Out (explicitly, and out means out):

- iOS build. The design is 360×780 Android-first; iOS is a later project.
- Public matchmaking, chat, voice, spectator chat, cosmetics, purchases, ads.
- Board sharing by link or file. Distribution is the catalogue only.
- Cross-device sync of local boards.

## Reading order for a new developer

`00-overview` → `01-architecture` → `05-game-rules` (skim the tables, read the formulas) →
`04-navigation-map` → then the screen doc for whatever you are building.

## Design-to-code inventory

The design file holds **49 options** (labelled `1a`…`3u`) containing **93 screens**. An option is one
flow step with its state variants side by side; a screen is one 360×780 frame. `docs/screens/`
therefore has one file per option, named `<option-id>-<slug>.md`, and each file documents every
screen inside that option separately. `docs/04-navigation-map.md` maps option ids to routes.
