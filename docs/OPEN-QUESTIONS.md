# OPEN QUESTIONS

> Generated from `Royal Navy 1080 v2.dc.html` — 49 options / 93 screens (Session 9 export) · 19 September 2026.

Each item blocks something. None is answered here — answering is the product owner's call. Every
entry gives the screen or rule affected, why it blocks, options, and a recommendation.

**Rule:** no task in `TASKS.md` may be started if it depends on an unanswered question here. Tasks
that do are marked `BLOCKED-BY-OQ` in `TASKS.md` with the question id.

---

## OQ-1 · Turn-timer expiry has no frame (review C3)

**Affects:** `1c` Play, `docs/screens/1c-play.md`, turn state machine, `docs/05-game-rules.md`
§turn timer.

**Why it blocks:** C3 asked for a timer ring around the active token and a "Turn skipped — out of
time" notification card with an auto-action variant. Both were built and then **removed from the
design file by hand** (recorded in the change log). The turn timer itself is a board rule that
exists and is enforced server-side, so expiry *will* happen — with no designed feedback, whoever
builds it invents it. Phase E's turn-timer task cannot start.

**Options**
1. Rebuild C3 as originally specified: amber ring at 10 s, red at 5 s, plus the two cards.
2. No ring; expiry shows only the "Turn skipped" notification card.
3. No visual at all; expiry is silent and only appears in the match log.

**Recommendation:** (1). The ring was designed, tested against the HUD and then removed without a
replacement; a 30 s default timer with no countdown affordance is the single most likely source of
"it stole my turn" complaints.

---

## OQ-2 · Queued deal offer has no frame (review C5)

**Affects:** `1v` Actions, `1p` Deal, trade flow, socket event `trade:offered`.

**Why it blocks:** C5 specified that an offer arriving while the player is in another modal queues
rather than interrupts, shows a badge "1" on the Actions button, adds a "Pending offers" row inside
the Actions sheet, and shows a 60-second countdown on the offer card. This was built and then
removed by hand. The server will still deliver offers at arbitrary times, so the client needs a
defined behaviour.

**Options**
1. Rebuild C5 as specified (badge + Pending offers row + 60 s countdown).
2. Offers always interrupt with the deal card, whatever the player is doing.
3. Offers are dropped if the target is in a modal, and the offerer is told "Priya is busy".

**Recommendation:** (1). (2) makes trades a grief vector during an auction; (3) silently loses a
legitimate action.

---

## OQ-3 · "Board updated to version 2" toast has no frame (review C8)

**Affects:** `1b` Host setup → lobby, `1f` Board detail, publishing flow.

**Why it blocks:** a player can read version 1's rules on Board detail, the author publishes version
2, and the player then hosts — getting version 2 having read version 1. C8's toast was built and then
removed. The server behaviour (new matches get the latest version) is settled by D5, so only the
notice is missing.

**Options**
1. Rebuild the toast: "Chennai Edition updated to version 2 while you were looking. Rules may have
   changed." with a "See rules" action.
2. Pin the version the player was reading for the rest of the session and host that version.
3. Say nothing; the lobby rules card always shows the live version and players may notice.

**Recommendation:** (1). (2) contradicts D5's "new matches get the latest version".

---

## OQ-4 · No HUD variant at 130% font scale (review D6)

**Affects:** `1c` Play, `docs/12-accessibility-and-responsive.md`, the responsive test matrix.

**Why it blocks:** the HUD is the densest screen in the app — player cash rows, action bar, and a
board-centre card can be on screen together. D6 asked for one frame at 130% system text with 56 dp
rows; it was built and then removed. Every other screen can be reasoned about from its 100% layout;
the HUD cannot, and the accessibility gate in Phase H needs a target to compare against.

**Options**
1. Rebuild the 130% HUD frame and treat it as the accessibility reference.
2. Cap the HUD's text scaling at 115% (`allowFontScaling` with `maxFontSizeMultiplier`) and document
   the cap as intentional.
3. Let the HUD reflow freely at 130% and accept whatever the implementer produces.

**Recommendation:** (1), with (2) as the fallback if the reflow cannot be made to fit — but capping
text scale is an accessibility regression and should be a decision, not an accident.

---

## OQ-5 · Does the auction-live card still need a quick-bid path?

**Affects:** `1n` notification cards, `1s`/`1t` Auction, auction state machine.

**Why it blocks:** A10 resolved the two-auction-interfaces contradiction by making the card a route
into the full auction screen. The card's green button was then changed by hand from "Bid ₹2,700" to
"Open full auction", so the card's actions are now **Skip** and **Open full auction** and no bid can
be placed from the board. The change log raises this as an open question. The auction screen's own
bid controls are unaffected either way, but the socket contract differs: option (1) needs a
`auction:bid` accepted from the card context.

**Options**
1. Keep Skip + Open full auction. One bidding surface only.
2. Restore a quick-bid button at the current minimum increment alongside Open full auction.
3. Card shows Skip + Bid, and Open full auction moves to a text link.

**Recommendation:** (1). It is what the design now shows, it removes the minimum-increment
disagreement the review flagged, and it keeps one place where a bid can be made.

---

## OQ-6 · Create hub says "Your drafts"; the boards list says pending / completed

**Affects:** `1w2` Create hub, `2a2` Boards list, board status model in `docs/08-database.md`.

**Why it blocks:** Session 8 removed the draft concept from the board builder and replaced the
boards-list filter chips with **Pending / Completed**, with a `published` badge on top. The Create
hub still lists "Your drafts" with progress bars. These are two different state models for the same
object, and the database needs one.

**Options**
1. `pending` / `completed` / `published` everywhere; Create hub's section becomes "Your boards" and
   its progress bars show slot fill for pending boards only.
2. Keep `draft` as the internal state name and treat pending/completed as display labels derived
   from slot fill (`completed` = all slots filled and no errors).
3. Three independent flags: `slotsFilled`, `hasErrors`, `publishedVersionId`, with no named state.

**Recommendation:** (2). It matches the publish gate (slots filled → board errors → rule errors →
publish) that Session 8 made explicit, so the label is always computable and never goes stale.

---

## OQ-7 · Who may re-publish, and what happens to a board whose author deletes their account?

**Affects:** `3o` Account delete confirm, `docs/08-database.md`, publishing flow.

**Why it blocks:** the delete-account copy says match history, custom boards and published boards are
permanently removed, while D5 says an unpublished frozen version stays in the database so match
history and leaderboards still resolve. Those two cannot both be literally true. Account deletion is
a Play Store requirement, so this must be settled before Phase G.

**Options**
1. Delete the account, unpublish every board immediately, keep frozen versions with the author
   shown as "deleted player"; running matches finish.
2. Hard-delete everything including frozen versions, and accept that historical match rows lose
   their board reference (show "board unavailable").
3. Delete the account, transfer published boards to an "orphaned" system owner so they stay playable.

**Recommendation:** (1). It satisfies the deletion requirement for personal data, matches D5's
"users see it as deleted; the data survives", and keeps history resolvable. The account screen's copy
would need one clause added, which is a copy change and therefore the owner's call.

---

## OQ-8 · Solo AI difficulty numbers

**Affects:** `3c2` Solo vs AI setup, `docs/05-game-rules.md` §AI, Phase F.

**Why it blocks:** the design specifies three tiers with one-line descriptions ("Easy — buys
carefully, never trades") and a Fast mode toggle. It does not specify the decision thresholds. The
rulebook needs exact numbers for two developers to implement identical behaviour, and inventing them
is forbidden by Rule 2. `05-game-rules.md` §AI therefore carries a **proposed** table, clearly marked,
which must be confirmed or replaced.

**Options**
1. Confirm the proposed table in `05-game-rules.md` §AI as-is.
2. Replace the thresholds with owner-supplied values.
3. Ship Easy only in v1 and hide the difficulty control until the tiers are tuned by play-testing.

**Recommendation:** (1) then tune by play-testing. The table is deliberately simple — cash floor,
bid ceiling as a multiple of tile cost, and a trade-acceptance margin — so tuning is three numbers
per tier, not a rewrite.

---

## OQ-9 · Is there any server-side match history for pass-and-play and solo?

**Affects:** `3h` Match history, `3d` Leaderboard, `3u` Board analytics, `docs/08-database.md`.

**Why it blocks:** the history and leaderboard screens do not distinguish local from online matches.
If solo and pass-and-play results are uploaded, the leaderboard can be farmed against AI; if they are
not, `3u`'s per-board analytics miss every offline match, and the design's "played 1,240 times" count
on catalogue cards means online plays only.

**Options**
1. Local matches stay on the device: shown in Match history with a "local" chip, excluded from the
   leaderboard and from catalogue play counts.
2. Local matches upload for analytics but never affect the leaderboard.
3. Everything uploads and counts.

**Recommendation:** (1). It needs no trust in the client and matches D6's framing that the
leaderboard is about people you actually played.

---

## OQ-10 · The Report board sheet no longer exists

**Affects:** `1f` Board detail, `POST /catalogue/:id/report`, Play Store compliance for
user-generated content (D5).

**Why it blocks:** D5 requires in-app reporting of published boards, and Board detail still shows the
small "Report board" text action at the bottom. The sheet it opened (reason picker: Offensive names /
Copied or trademarked content / Broken or unplayable / Other, optional note, Submit report,
confirmation toast "Report sent. Thanks — we'll take a look.") was removed with the publishing set in
Session 7. The action currently leads nowhere.

**Options**
1. Rebuild the sheet as B21 specified.
2. Reuse the player report-and-block sheet (`3q`) with board-appropriate reasons.
3. Remove the "Report board" action and handle board reports out of band (email).

**Recommendation:** (2). `3q` already has the exact pattern — long-press sheet → reason picker →
toast — so reusing it costs one reason list and keeps one moderation UI instead of two. (3) is not
viable if the app is to be published.

---

## OQ-11 · Rule and deck locking (D4) is not in the design file

**Affects:** `1z` Rule library, `1y` Card decks, `E_RULE_LOCKED`, the whole copy-and-replace model.

**Why it blocks:** D4 is a settled decision — a rule used by a deck is locked, a deck used by a board
is locked, editing offers "Edit as a copy", and "Replace everywhere" previews what it affects and
never touches a published version. The v2 design shows the usage **counts** ("46 rules · 27 used in
decks", "4 decks · 27 rules assigned") but no padlock, no disabled edit, no dialog and no replace
flow. Without it, editing a rule silently changes decks and boards that already use it, which D4
exists to prevent.

**Options**
1. Rebuild B23's locking UI: padlock + disabled edit, the "This rule is in use" dialog, "Edit as a
   copy", and the "Replace everywhere" preview dialog with the frozen-versions meta.
2. Ship without locking: edits propagate to every local deck and board that references the rule,
   with a one-line warning on the editor.
3. Ship copy-on-edit silently: editing a used rule always creates a copy and rebinds nothing.

**Recommendation:** (1). It is the settled decision, and (2) is exactly the silent-change failure D4
was written to avoid. If (1) cannot be scheduled, (3) is safer than (2) but leaves no way to fix a
rule across boards.

---

## OQ-12 · The `hello` socket event exists in TASKS.md but not in the API contract

**Affects:** `apps/server/src/plugins/socket.ts`, `docs/07-api-contract.md` "Server → client", task
**A3** (acceptance: "a socket client connects and receives `hello`"), task **D4**.

**Why it matters:** `docs/07-api-contract.md` lists every server → client event and `hello` is not
among them — the contract says the *client* opens the exchange with `match:subscribe`. The
`socket-contract` skill treats an undocumented event as invented behaviour. A3 was implemented as
written (the event is emitted, marked `SKELETON ONLY` in code) so the phase gate can pass, but the
implementation and the contract now disagree, which Rule 0 forbids leaving unresolved.

Raised 20 September 2026 during A3. Does not block a task; must be settled before **D4** closes.

**Options**
1. Remove `hello` in D4 when the real `/match` events land; the connect test then asserts on the
   `match:subscribe` ack instead. The contract stays as generated.
2. Regenerate `docs/07-api-contract.md` to include `hello { namespace }` as a connection
   acknowledgement, if the design intends one.
3. Keep it as a test-only event behind `NODE_ENV=test`.

**Recommendation:** (1). Socket.IO already provides a `connect` event, so `hello` adds nothing the
client needs, and (3) would make test and production sockets behave differently.

---

## OQ-13 · Where does Android back go from Spectating (`1h`)?

**Affects:** `/match/[matchId]/spectate`, `docs/04-navigation-map.md` route table, task **B4**
(implemented) and **E1**/`1h`.

**Why it matters:** the route table says back from `/match/[matchId]/spectate` goes to
"`/profile/friends` or `/modes`", but `/profile/friends` is not a route anywhere in the map —
friends live at `/lobby/[matchId]/friends` (reached from the lobby, per "Group order"). B4
implemented back → `/modes` so the route tree is complete; the alternative is undefined.

Raised 20 September 2026 during B4. Does not block a task.

**Options**
1. Back always goes to `/modes` (as implemented).
2. Back returns to the caller (`router.back()`), which is the lobby friends list when spectating
   was entered from there, else `/modes`.
3. Add a `/profile/friends` route to the map (a design change — no `3g` frame exists under profile).

**Recommendation:** (2). It matches how `1e` and `2c` already describe "caller" back behaviour and
needs no new screen.

---

## OQ-14 · Four component details the design does not specify

**Affects:** `Dialog`, `Stepper`, `Skeleton`, `Row` in `apps/mobile/src/components`; task **B3**.

**Why it matters:** `docs/03-design-system.md` names these elements but gives no value for one
detail of each, and no screen spec supplies it either. B3 implemented each with the nearest
existing token so the component ships, but the choice is the developer's, not the design's:

1. Dialog destructive icon tile: "39 dp `danger.fill` icon tile" — **radius** not given.
   Implemented with `radius.control` (14).
2. Stepper minus/plus buttons: "36×36 dp" — **fill, border and radius** not given. Implemented
   with the IconButton surface (`surface.inset`, `divider`, `radius.control`).
3. Skeleton "shimmer sweep" (3c §9): the sweep band's **colour** is not given. Implemented with
   `rgba(255,255,255,.05)` (the ImageSlot inset highlight token), 40% of the bar wide.
4. Row selected state: "1 dp `gold.flat` ring, inset glow" — the glow's **colour, blur and
   spread** are not given (and inset shadows do not render on Android). Only the ring is drawn.

Raised 20 September 2026 at the Phase B gate. Does not block a task.

**Options**
1. Confirm the four choices above as the design.
2. Supply the values from the design file and regenerate `03`.
3. Drop the undefined details (no tile radius → 0; flat stepper buttons; no shimmer; no glow).

**Recommendation:** (2) if the design file has them, otherwise (1) — each choice reuses an
existing token so it stays consistent with the rest of the system.

---

## OQ-15 · Three gaps in `packages/game-engine/SPEC.md`'s state shape and invariants

**Affects:** `packages/game-engine/src/state.ts`, `invariants.ts`; task **C1** (implemented), **C5**.

**Why it matters:** the spec is the contract two developers must implement identically, and three
things it relies on are not in it:

1. **The cash ledger.** `cashConservation` is defined against "a running ledger total", but the
   `bank` shape lists only `houses`, `hotels`, `finePot`. C1 added
   `bank.ledger: { issued: number; absorbed: number }` (money the bank has put into play and taken
   out) so the invariant is checkable.
2. **Token position.** `PlayerState` has no field for the tile a token stands on, yet movement,
   rent and the board map all need it. C1 added `position: TileIndex`.
3. **Even build with hotels.** `evenBuild` compares `houses` only. A hotel tile has `houses === 0`,
   so a hotel beside a four-house tile in the same group would violate the invariant, although
   that is exactly what building a hotel produces (rulebook §8: 4 houses → hotel). C1 treats a
   hotel as build level 5 for the comparison.

Raised 20 September 2026 during C1. Does not block a task.

**Options**
1. Confirm the three additions and regenerate `SPEC.md` to include them.
2. Different names or placement for the ledger and position fields (the additions are minimal;
   moving them costs little now, more once the reducer uses them).
3. For (3), treat a hotel tile as level 4 instead of 5 (a hotel would then never be "one above"
   its neighbours; building a second hotel in the group would be the constrained step).

**Recommendation:** (1). Level 5 for a hotel is the only reading under which the rulebook's own
build sequence (4 houses, then a hotel, then the next tile's hotel) never trips the invariant.

---

## OQ-16 · `percentFromAmount` cannot produce the 21 % / 54 % the design displays

**Affects:** rulebook §3 "The formula" and "Worked examples"; `docs/10-testing-strategy.md`
(pricing.ts required case "percent-from-amount 300/1400 → 21 %"); `1x` tile editor's derived
read-only side; `packages/game-engine/src/pricing.ts` (task **C4**, implemented).

**Why it matters:** §3 gives `percentFromAmount(cost, amt) = round(amt / cost × 1000) / 10` (one
decimal) and in the same breath says a flat ₹300 on ₹1,400 "displays as 21 %" and ₹750 "as 54 %".
The formula gives 21.4 % and 53.6 %. The design file is the authority and shows 21 and 54, so
either the formula is wrong (integer rounding for derived percents) or the design's editor rounds
for display only. C4 implements the formula as written — it affects display only, never money —
and its tests assert 21.4 and 53.6 so the choice is visible.

Raised 21 September 2026 during C4. Does not block a task (the `1x` screen task will need it).

**Options**
1. Derived percent rounds to the nearest whole percent (matches 21 and 54; 35/1,400 would show
   3 % rather than 2.5 % if ever typed flat).
2. Keep one decimal (the formula) and accept that the design's 21 % / 54 % were rounded by hand
   in the mock-up; regenerate the worked examples to 21.4 % and 53.6 %.
3. One decimal, but drop the decimal when it is within ±0.5 of a whole number — reproduces every
   design value, at the cost of a rule the design never states.

**Recommendation:** (1) if the design file's editor never shows a decimal on a derived value;
otherwise (2). (3) is an invention.
