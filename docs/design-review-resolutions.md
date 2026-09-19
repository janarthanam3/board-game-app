# Design-review resolutions — Parts A–E

> Generated from `Royal Navy 1080 v2.dc.html` — 49 options / 93 screens (Session 9 export) · 19 September 2026.

This is the walk of `design-review.md` (43 items) required before implementation. Every item has a
final state. Part E is answered by `docs/DECISIONS.md` (D1–D8) and is not re-answered here.

---

## Part A — contradictions · all 16 resolved

| # | Contradiction | Final resolution | Where it lives now |
| --- | --- | --- | --- |
| A1 | Mixed `$` and `₹` | **₹ only**, Indian digit grouping, integer rupees. The seven `$` values in `1v` were converted and scaled ×10 in Session 7. | `02-design-tokens`, `05-game-rules` §money |
| A2 | Trademarked property names | **Chennai/Royal Navy names only.** Mapping: Park Place → **Bay Road**, Boardwalk → **Marina Drive**, Baltic Avenue → **Old Town**, Oriental → **Mill Street**, Reading RR → **Central Rail**, Marvin Gardens → **Park Avenue**. See the residue list below — some frames still show the old label and the mapping is applied in code and fixtures. | `08-database` seeds, `05-game-rules` §naming |
| A3 | Board size stated three ways | **Variable**: 5×5 = 16, 7×7 = 24, 11×11 = 40, or custom rows × columns. Board settings is authoritative; onboarding and Game modes no longer name a number. | `05-game-rules` §board |
| A4 | Starting cash had two owners | **Board owns it** (D1). Host setup shows a read-only row with the board's value and a caret into read-only Rule lab. No override control exists anywhere. | `screens/1b-host-setup-lobby` |
| A5 | Turn timer had two owners | **Board owns it.** Settings has no turn-timer row; it carries the meta "Turn timer is set by the board." | `screens/3f-settings` |
| A6 | Draw mode had two owners | **Per tile.** Board settings shows a read-only summary "Draw mode · set per tile · 3 shuffle, 1 fixed". | `05-game-rules` §decks |
| A7 | Jail corner contradicted itself | COMMON is **two toggles** — "Block build, sell, mortgage and trade" and "Owner still collects rent while held" — and the preview reads the toggles. Spelling fixed to "mortgage". | `screens/1x-tile-builder` |
| A8 | Rule library assumed full sets | Condition is **"Holds the colour set"** (uses the board threshold) plus a separate **"Owns every tile in the set"**. | `screens/1z-rule-control` |
| A9 | Income tax offered an unconfigurable choice | Card-space → Tax office gains a **TAX MODE** block: Flat / Percent / Player's choice, flat amount, percent, and "Percent of: Cash / Net worth". Default Flat. Non-"Player's choice" modes show a single Pay button on the card. | `05-game-rules` §tax |
| A10 | Two auction interfaces | The board card is a **route into** the full auction screen (`1s`/`1t`). Starting price is read-only "from board rules"; "minimum = property cost" removed. Whether the card keeps a quick-bid is **OQ-5**. | `flows/auction` |
| A11 | "Club" was a non-existent tile type | **Club is a utility.** Board map label "Club · ₹900 · utility"; `1x` carries a second utility example "City Club" on the dice-multiplier basis. "Club privilege" remains a **deck** name. | `05-game-rules` §utilities |
| A12 | Sell property mislabelled | "Needs full colour set" removed from Sell property; it appears under BUILD RULES as "Building needs the colour set threshold — set in Rule lab." | `05-game-rules` §building |
| A13 | Rounds vs turns vs 2h match | **"Round" everywhere**; "Turn cap" renamed **Round cap**. Classic: round cap 20, turn timer 30 s, starting cash ₹10,000, highest net worth at the cap. Custom: 10–200, default 40. | `05-game-rules` §rounds |
| A14 | Card effects were raw notes | **HOLD CARD** is a segmented "Affects · Me / Another player" plus a searchable checkbox picker. Eight "Me" effects and five "Another player" effects, with Uses / Expires / Tradeable below. | `05-game-rules` §card effects |
| A15 | LIVE badge implied matchmaking | Badge removed; subtitle "Host or join with a room code" (D6). | `screens/3c-game-modes` |
| A16 | Colour picker allowed duplicate set colours | Used colours are **disabled with a padlock** and a tooltip naming the owning set; meta "One colour, one set." (D2) | `screens/1x-tile-builder` |

### A2 residue — names still visible in the design file

The design was not fully swept. **Code, fixtures, seeds and tests must use the right-hand column.**
Each screen doc repeats this where the old name appears in its copy.

| Old name still shown | Screens | Ship as |
| --- | --- | --- |
| Park Place | `1c`, `1d`, `1j`, `1q`, `1r`, `1s`, `1u`, `1w`, `1x`, `2a`, `2b` | Bay Road |
| Boardwalk | `1c`, `1d`, `1p`, `1t` | Marina Drive |
| Baltic Avenue | `1n` (property cost, deal offer) | Old Town |
| Oriental | `1n` (deal offer) | Mill Street |
| Reading RR | `1p` | Central Rail |
| Marvin Gardens | — (already swept) | Park Avenue |

A publish-time blocklist (`TRADEMARK_LIST_PATH`) rejects all six left-hand names plus the standard
Monopoly set in board, tile, deck and rule names.

---

## Part B — missing screens · confirmed against the design file

| # | Screen | Built? | Option |
| --- | --- | --- | --- |
| B1 | Solo vs AI setup | yes | `3c2` |
| B2 | Pass and play setup + handover | yes | `3c3` |
| B3 | Raise cash | yes, three route screens | `1d` |
| B4 | Out of the match | yes | `1g` |
| B5 | Colour set manager | **deliberately not built** — the threshold rule lives in Rule lab's COLOUR SETS block and per-set tile counts live in Board settings. A separate manager would put one rule in two places (D1). Not an open question; a recorded decision. | — |
| B6 | Board size change warning | yes — shrink confirm + custom-grid validation | `2a5` |
| B7 | Board builder at 40 tiles | yes — 11×11 at Fit and at 240% | `2a` |
| B8 | READY TO PLAY two tiers | yes — ERRORS · 2 / WARNINGS · 3 | `2a` board settings |
| B9 | Lobby rules card | yes — read-only RULES card | `1b` |
| B10 | Rule lab read-only | yes | `3l` |
| B11 | Spectating | yes | `1h` |
| B12 | How to play | yes | `3m` |
| B13 | Match log full screen | yes | `2c` |
| B14 | Builder empty states | yes — three | `3n` |
| B15 | Account + Privacy | yes — Account, delete confirm, Privacy | `3o`, `3p` |
| B16 | Report and block players | yes — long-press sheet, reason picker, blocked toast | `3q` |
| B17 | Board catalogue | yes — default + no results | `1e` |
| B18 | Board detail | yes — default + all rules read-only | `1f` |
| B19 | Publish flow | **built in Session 7, removed in Session 7 at the owner's request.** Publishing now lives as the **PUBLISH CHECKS** card in Board settings (slots filled → board errors → rule errors → publish) plus the header Publish button in the builder. The dedicated Publish screen, the 3-slot pips and the freeze dialog are gone. | `2a` |
| B20 | My published boards | **removed with B19.** Published boards appear in the boards list (`2a2`) with a gold "published · v2" badge; unpublish is the header action on the builder plus the unpublish confirm sheet. | `2a2`, `2a` |
| B21 | Report board | **removed with B19** as a screen; "Report board" remains as the small text action at the bottom of Board detail. The sheet itself is no longer designed → **OQ-10**. | `1f` |
| B22 | Local vs published in the board list | yes, then revised: chips are **All / Pending / Completed**, with a gold `published · v2` badge and "Editing creates version 3 when you publish again." | `2a2` |
| B23 | Rule library usage counts and locking | **partially built then removed.** Usage counts survive as the header counts ("46 rules · 27 used in decks", "4 decks · 27 rules assigned"). The padlock, the "This rule is in use" dialog, "Edit as a copy" and "Replace everywhere" are not in the v2 file → **OQ-11**. D4 still stands as the intended model. | `1z`, `1y` |

---

## Part C — real-time gaps

| # | Gap | State |
| --- | --- | --- |
| C1 | Host leaves mid-match | **Built** — `3r` "Host left" toast (auto-dismiss 3 s) and "Room closed by host" lobby state with "Back to modes". |
| C2 | Match ended while disconnected | **Built** — `3r` "Ended while you were away" with final placement, "See result" / "Back to modes". |
| C3 | Turn-timer expiry | **Built then removed** → **OQ-1**. |
| C4 | Too few players | **Built** — `3r` "Not enough players", 10 s countdown, "End now". |
| C5 | Queued deal offer | **Built then removed** → **OQ-2**. |
| C6 | Bankruptcy resolution | **Built** — `1o` two outcomes: "12 tiles → Naveen" and "12 tiles → bank auction · Auctions begin next round." |
| C7 | Deck fallback for unmatched rolls | **Built** — deck editor row "IF NO RULE MATCHES THE ROLL": Whole deck / Nothing / Next in order, default Nothing, meta "Player lands, no effect." |
| C8 | Board updated between browsing and hosting | **Built then removed** → **OQ-3**. |

---

## Part D — improvements · in or out of v1

| # | Improvement | v1 | Evidence |
| --- | --- | --- | --- |
| D1 | Set-progress pips on the property card | **IN** | `1j` — "3 of 5 · set held" / "2 of 5 · need 1 more", pips take the set colour when held. |
| D2 | Event-cards setting | **IN** | `3f` — Event cards: All / Decisions only / Off with the suppression meta. |
| D3 | Onboarding leads on customisation | **IN** | `3b` slide 3 "Make it yours". |
| D4 | Create menu restructured | **IN** | `1w2` Create hub — four author rows plus **Browse boards**. |
| D5 | First-run builder banners | **IN** | Dismissible banners on `2a`, `1x`, `1z`. |
| D6 | Accessibility pass (130% HUD frame) | **OUT of the design file** → **OQ-4**. The responsive/font-scale requirements in `12-accessibility-and-responsive.md` are still binding for every screen. |
| D7 | Six-player net-worth chart | **IN** | `2b` — six SVG lines, viewer solid, others muted, tappable legend chips, "Tap a player to highlight". |

Not from the review, built anyway and therefore **in v1**: `3u` Board analytics (matches, players,
median length, finish rate, matches-per-day bars, most-landed tiles, win rate by starting order,
where matches end, balance warning, Export / Edit v4 footer).

---

## Part E — architecture questions

All eight are answered in `docs/DECISIONS.md` (D1–D8) and are treated as settled: host cannot
override board rules; one colour one set; below-threshold group is a hard error; rule library locks
when used with edit-as-a-copy; local building with an immutable server catalogue and 3 slots; room
codes only; minimum viable board; 30-minute Classic and unlimited custom.

Nothing in Part E is open. Questions **created** by the design after those answers are in
`OPEN-QUESTIONS.md` as OQ-1 … OQ-11.
