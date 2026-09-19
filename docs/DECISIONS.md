# Royal Navy — design decisions

Answers to the eight open questions in `design-review.md` Part E.

**These are settled.** If the design file, `docs/`, or generated code contradicts anything here, this
file wins — stop and flag the contradiction rather than guessing.

Last updated: 14 September 2026.

---

## D1 · Host cannot override board rules

Rules come from the board. A host picks a board and plays it; there is no match-time editing of
starting cash, round cap, timers or any other rule.

**Consequences**
- Host setup shows starting cash as a read-only row inherited from the board. No "Override" button.
- The lobby rules card is read-only for everyone, host included.
- A match stores a reference to a published board version, not a copy of its rules.
- Settings has no turn timer row — that is a board rule.

---

## D2 · One colour, one set

Two different colour groups on the same board cannot share a colour. The swatch is the set
identifier, so sets need no names anywhere in the UI.

**Consequences**
- The tile builder's Color picker disables any colour already used by another group on this board,
  with a meta line explaining why.
- The colour set manager identifies sets by swatch alone.
- Practical ceiling of roughly 10 groups per board, limited by how many colours stay
  distinguishable at phone size. Acceptable for boards of 16 to 40 tiles.

---

## D3 · A colour group below its threshold is a hard error

If a group has fewer tiles than its threshold, the board cannot be saved. A group of 2 tiles with a
threshold of 3 can never be held by anyone, which makes those tiles permanently worthless.

**Consequences**
- READY TO PLAY becomes two-tier: red errors that disable Save, amber warnings that do not.
- The Fix action offers two routes: lower the threshold to the tile count, or open the colour set
  manager to add tiles.
- The same validation must run again at **publish** time. Published versions are immutable, so a
  broken one would be stuck in the catalogue until unpublished.

---

## D4 · Rule library — locked when used, edit as a copy

The rule library is global. Rules feed decks; decks feed card space tiles; tiles feed boards.
Editing must never silently change something already built.

**Model**
- Every rule row shows its usage: "used in 3 decks". Every deck row shows "used on 2 boards".
- A rule used by any deck is locked. A deck used by any board is locked. Locked items show a
  padlock and a disabled edit button.
- Tapping edit on a locked item offers **Edit as a copy** — an unassigned duplicate, freely
  editable. It does not simply refuse.
- After editing the copy, **Replace everywhere** is offered, previewing exactly what it affects:
  "Replace the original in 3 decks? Affects: Chance, Community fund, Tax office. On boards: Chennai
  Edition, Mumbai Nights." Buttons: Replace / Keep both.
- **Replace everywhere cannot touch a published board version.** Published versions are frozen.
  Changing one means publishing a new version.

**Why not plain references or plain copies**
References would silently change finished boards. Plain copies would leave no way to fix a rule
across boards. This model gives the safety of copies with a three-tap path to propagate a fix.

---

## D5 · Local building, server catalogue, immutable publishing

**Building**
- Players build boards locally on their device. Unlimited local boards, edited and deleted freely.
- Local boards are playable in pass-and-play and solo vs AI without publishing.

**Publishing**
- Publishing creates an **immutable version** on the server.
- 3 published boards per account.
- Editing a published board never blocks. The local copy stays editable; publishing again creates
  version 2.
- Matches already running finish on their version. New matches get the latest version.
- A published board carries **copies** of its decks and rules. This is what keeps D4 solved and what
  makes a board work on a device whose rule library is entirely different.

**Unpublishing**
- Removes the board from the catalogue and frees the slot immediately.
- The frozen version stays in the database so match history, results and leaderboard entries still
  resolve. Users see it as deleted; the data survives.

**Online play**
- Online matches use published boards from the catalogue only. Local boards are never sent to
  clients.

**Moderation** — required, since this is user-generated content visible to strangers
- Report board, from the catalogue and from the lobby.
- Publish-time text filtering on board, tile, deck and rule names, including a blocklist of
  trademarked property names.
- An admin flag that unpublishes immediately.
- A terms-of-service clause permitting content removal.

**Scope:** all of this is in v1.

---

## D6 · Room codes only

No public matchmaking queue, no skill rating, no live lobby.

**Consequences**
- Remove the "LIVE" badge from Online multiplayer in the game modes picker. It implies a live lobby
  that will not exist.
- Subtitle becomes "Host or join with a room code".
- Friends becomes the primary discovery path. The only routes into a match are a shared code or a
  friend invite.
- The catalogue is about content, not people. A published board is found in the catalogue, then
  played with people you already know.

---

## D7 · Minimum viable board

"Corner" means the tile type, not the grid position. A Corner space tile may sit anywhere on the
ring.

**Hard errors — block Save and Publish**
- Exactly one start tile. Not zero, not two.
- No empty slots. Every ring position has a tile.
- Every card space has a deck assigned.
- Every colour group has at least as many tiles as its threshold. (See D3.)
- Minimum 12 tiles.

**Warnings — allow Save and Publish, but flag**
- No jail tile — "Go-to-jail card effects will have nowhere to send players."
- Fewer than 2 colour groups — "Players will rarely be able to build."
- Fewer than 4 properties — "Very little to buy."
- More than 30% card spaces — "Most landings will be random events."
- No tax or fine tiles — "Money only enters the game, never leaves. Matches may not end."

**Consequences**
- The READY TO PLAY panel grows from 4 checks to roughly 10, in two tiers.
- Custom row and column steppers need their own validation: rows + columns must produce at least 12
  ring positions, so a 3×4 grid (10 positions) is rejected at the stepper, before the panel.
- Jail is optional, so a board with no jail is valid.

---

## D8 · Match length — 30 minutes for Classic, unlimited for custom

**Classic board defaults**
- Round cap 20
- Turn timer 30s
- Starting cash ₹10,000
- Win condition: highest net worth at the cap

Twenty rounds at four players is 80 turns; at roughly 20 seconds average this lands near 27 minutes.

Starting cash is ₹10,000 rather than ₹15,000 deliberately. At a 20-round cap, bankruptcies are rare —
elimination normally begins around round 25 to 30 — so most matches will end on net worth with
everyone still alive. Tighter money makes the short game tense and keeps matches inside 30 minutes.

**Custom boards**
- Round cap range 10 to 200, default 40. No hard limit.
- The estimated-match-length panel in Rule lab matters more here — it is the only thing warning a
  creator they have built a three-hour board.

**Terminology**
Use "round" everywhere. One round is every player taking one turn. Rename "Turn cap" to "Round cap".

---

## Still open

Nothing from Part E. New questions raised by these answers get appended below with a date.
