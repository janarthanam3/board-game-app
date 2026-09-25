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

**ANSWERED 24 September 2026 — option (2).** The stored state is `draft` / `published`. Pending and
completed are **derived** from slot fill and error state, reusing the publish gate's logic so the
label can never drift from the board's real contents.

**Constraint on D1:** the `2a2` boards list filters on Pending / Completed, so the derived label
must be **queryable and indexable** — not computed in application code per row. D1 implements it as
a Postgres generated column or a maintained counter on `boards`, and documents which, and why, in
`docs/08-database.md`.

Note for whoever runs D1: `docs/08-database.md` is a derived doc (Rule 0) and is edit-denied in
`.claude/settings.json`, so the choice is recorded in the migration's comments and this entry, and
the doc is regenerated from the design rather than hand-patched.

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
   that is exactly what building a hotel produces (rulebook §8: 4 houses → hotel). C1 treated a
   hotel as build level 5 for the comparison. **Changed 23 September 2026 (phase-C audit):** that
   reading made two *legal* actions break the invariant — BUILD hotel over a 4/3/3/3/3 group, and
   SELL hotel at all — and left a group of hotels unsellable, so raise cash could strand a player
   with a full estate. The comparison is now over houses on tiles that do **not** hold a hotel
   ("max difference of 1 house", §4/§8), which is the only reading where every legal action keeps
   the invariant. Option 3 below is therefore superseded.

Raised 20 September 2026 during C1. Does not block a task. C5 (21 September) added two more of
the same kind: `bank.pendingAuctions` (lots a bank-bankruptcy queues for the next round, §14) and
`auction.resumeStage` (which turn stage a mid-turn auction returns to) — same options apply.

**Options**
1. Confirm the three additions and regenerate `SPEC.md` to include them.
2. Different names or placement for the ledger and position fields (the additions are minimal;
   moving them costs little now, more once the reducer uses them).
3. For (3), treat a hotel tile as level 4 instead of 5 (a hotel would then never be "one above"
   its neighbours; building a second hotel in the group would be the constrained step).

**Recommendation:** (1), with item 3 amended as described above: the comparison runs over houses on
tiles that do **not** hold a hotel. That is the only reading under which every legal action keeps
the invariant and a group of hotels can still be sold down. Level 5 — the original recommendation
here, and option 3 — is superseded: both let a legal BUILD or SELL hotel break `evenBuild`, and
level 5 additionally strands a hotel-heavy estate in raise cash. `SPEC.md`'s `evenBuild` row still
states the old comparison and should be regenerated when this question is answered (Rule 0).

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

---

## OQ-17 · Five rule gaps met while writing the actions reducer

**Affects:** `packages/game-engine/src/reducer/*` (task **C5**, implemented with the defaults
below); later the `1t` auction sheet, the `1n` tax card and the `1z` deck editor.

**Why it matters:** each item is a play-affecting value or behaviour the rulebook (§05) and
`SPEC.md` leave open. The reducer had to pick something to be testable; every pick is one line
and is marked in code with `OQ-17`. None blocks C5, but all must be settled before the phase-D
server freezes the wire behaviour.

1. **Jail entry charge on a third double or a `sendToJail` card.** §12 lists the ₹100 entry charge
   only under "landing on a GET IN-active corner". Engine: charged on landing, **not** charged
   when sent by a third double or a card (`sentToJail.entryCharge` is 0 for those reasons).
2. **The free-parking pot payout.** §13 says Chennai Edition "pays out the accumulated fine pot to
   whoever lands on it" and calls that "a board-level money-destination setting, not a separate
   tile type" — but no tile kind or corner section is named as "it". Engine: fines and taxes
   accumulate in `bank.finePot` when a payment's destination is the pot; **nothing pays it out**.
3. **"Player's choice" tax mode.** `1x` offers Flat / Percent / Player's choice, and the tax card
   shows "Pay flat / Pay 10%", but `SPEC.md` has no action carrying the choice. Engine: resolves
   as **Flat** (the editor's default mode) with a code comment.
4. **"Hotel returns houses to the bank" switched off.** §8 gives only the on-value. Engine: with the
   toggle off the four houses leave the tile and are **not** returned to `bank.houses`, so the
   bank's house supply shrinks by four for the rest of the match. (On the shipped board the toggle
   is on, and the fuzz suite runs with it on.)
5. **Minimum raise in an auction.** §10 says a bid is invalid "below `max(minBid, leadingBid + 1)`";
   `docs/flows/auction.md` says "≥ leading + bid step" with "Bid step ₹100". Two derived docs
   disagree. Engine: **+1** (the rulebook), so a ₹1,401 bid over ₹1,400 is accepted.

Raised 21 September 2026 during C5.

**Options**
1. Confirm every default above and regenerate the rulebook / SPEC to state them.
2. (1) charge on every entry; (2) pay the pot to whoever lands on the rest-house corner, as the
   Chennai variant reads; (3) add `chooseTax: "flat" | "percent"` to the `PAY_DEBT`-style action
   set; (4) houses stay on the tile under the hotel (rent unaffected); (5) ₹100 step.
3. Remove the ambiguous features instead: no charge on card entry, no pot payout, drop
   "Player's choice", drop the toggle, keep +1.

**Recommendation:** (1) for items 1, 3 and 5 — they are the conservative readings of the
rulebook. For item 2 the Chennai copy in `3m` should decide the landing tile (option 2). For item 4
the toggle needs a stated off-behaviour or should be removed (option 3); today it only loses
houses.

---

## OQ-18 · Three places where `docs/06-state-machines.md` and the flow docs disagree

**Affects:** `packages/game-engine/src/machines/{lifecycle,trade}.ts` (task **C5a**, implemented
per `docs/06`, the task's named authority); later the `3k` reconnect overlay and the `1p` composer.

**Why it matters:** the machines are transcribed arrow for arrow from `docs/06`, but three details
differ from the flow docs that describe the same behaviour, and the client screens will be built
from the flow docs.

1. **Reconnect backoff.** `docs/06` "Reconnect": `backoff 1,2,4,8,16s`. `docs/flows/reconnect.md`
   "Parameters": `1s, 2s, 4s, 8s, 15s`. C5a ships `RECONNECT_BACKOFF_SECONDS = [1, 2, 4, 8, 16]`.
2. **When the reconnect grace can expire.** `docs/06` draws `disconnected → graceExpired` only,
   so a seat that is mid-attempt (`reconnecting`) never times out; `reconnect.md` says the hold
   runs "from the disconnect, independent of" anything else. C5a follows the diagram: a
   `graceElapsed` event in `reconnecting` is an explicit no-op.
3. **Trade counter-offers.** `docs/flows/trade.md` has a "target counters" branch
   (`tradeResponse {accept:false, counter:true}`, `1p` reopens with the sides swapped);
   `docs/06` "Trade" has no `countered` state or arrow, and `SPEC.md`'s `RESPOND_TRADE` has no
   `counter` field. C5a models a counter as `reject` followed by a fresh `composing`.

Raised 21 September 2026 during C5a. Does not block a task.

**Options**
1. Regenerate the flow docs from the design so they match `docs/06` (16 s; grace only from
   `disconnected`; counter = reject + recompose).
2. Regenerate `docs/06` to match the flows (15 s; `reconnecting → graceExpired` arrow; a
   `countered` state and a `counter` flag on `RESPOND_TRADE`).
3. Mixed: (1) for the backoff — the design's attempt counter decides which; (2) for the grace
   arrow, since a seat must not be un-timeout-able while its socket keeps failing; (1) for the
   counter, since it needs no new wire field.

**Recommendation:** (3).

---

## OQ-19 · Card rules: six gaps between rulebook §5, `1z` §4 and what the reducer can do

**Affects:** `packages/game-engine/src/{decks,effects}.ts`, `src/reducer/cards.ts` (task **C6**,
implemented with the defaults below, each marked `OQ-19` in code); later `1z` (rule editor),
`1n` #10/#11 (the CHANCE / COMMUNITY CHEST cards) and `SPEC.md`'s action union.

**Why it matters:** the rule grammar is authored in `1z` and played by the engine; where the two
disagree, a board can be authored that the engine cannot play as written.

1. **MONEY directions.** `1z` §4.1 lists six (`Collect from one player`, `Pay to one player`
   included); rulebook §5.1 and the C1 state shape have four. The two "one player" directions
   need the drawer to choose a target, and `SPEC.md` has no action carrying that choice. Engine:
   **four directions**; the other two cannot be stored.
2. **"Affects: Another player" hold cards** (send to jail, zero cash, remove a building, force
   trade acceptance, double rent paid) likewise need a target-choice action. Engine: the block
   is **not applied**; the log records `holdCardSkipped · needsTarget`.
3. **Basis under Share / Collect.** For the two fan-out directions the design's own preview
   (Share to all players · 500 · Per player → "Pay 500 to every player") reads `Per player` as
   the amount *each* player moves. Engine: `Flat` and `Per player` both mean "amount per
   counterpart"; `Per house` / `Per tile owned` multiply that by the drawer's count. Under the
   bank directions `Per player` multiplies by the number of other solvent players.
4. **A MOVE block after a MONEY block that opened a debt.** Nothing says whether the token still
   moves. Engine: the move is **dropped** (`cardBlockSkipped · debtOpen`) because a second landing
   would resolve over an unsettled debt; the HOLD CARD block still applies.
5. **Ranges and expiry.** Rulebook §5.1: Uses 1–3, tile count 0–40, Expires `Never / End of
   round / End of match`. `1z` §4.2–4.3: Uses 1–5, tile count 1–20, Expires `Never / End of round
   / After <n> rounds`. Engine stores `never | round | match` (C1) and does not clamp counts.
6. **Card chains.** A rule can move the token onto another card space (the design's `To tile`),
   which draws again; a rule targeting its own space would loop. Engine: **at most 3 draws per
   landing** (`MAX_CARD_CHAIN`), then the landing is only logged. The number is a safety limit,
   not a design value.

Raised 21 September 2026 during C6. Does not block a task; blocks authoring the two
target-choice features.

**Options**
1. Confirm the defaults, regenerate `1z` §4 to four directions and the rulebook's ranges, and
   defer target-choice effects to a later `CHOOSE_TARGET` action (items 1, 2).
2. Add `{ kind: 'CHOOSE_TARGET'; by; playerId; atMs }` to the action union now, with a
   `chooseTarget` turn stage, and keep all six directions and thirteen effects.
3. For item 6, forbid `To tile` targets that are card spaces at publish time instead of capping.

**Recommendation:** (1) now; (2) as its own task once the `1n` decision-card pattern for a
target pick is designed. (3) for item 6 — a publish-time check is cheaper than a runtime cap.

---

## OQ-20 · Phase C gate audit: five invented roundings/prices, one un-owned feature, and four doc contradictions

**Affects:** `packages/game-engine/src/reducer/{property,debt,turn}.ts`, `src/endgame.ts`,
`src/rent.ts` (phase **C**, gate **C7**); `docs/05-game-rules.md` §7, §9, §14, §16, §21;
`docs/flows/{turn,raise-cash,bankruptcy}.md`; `TASKS.md` (item 6).

**Why it matters:** the `rules-auditor` pass at the C7 gate found values the engine had to pick
that no document states, plus places where the derived docs disagree with each other. Each item
below is implemented as described and marked `OQ-20` in code; none blocks the gate, but item 1
lets a player extract more than a tile's cost from the bank and item 6 leaves six authored card
effects unplayable.

1. **Selling a mortgaged property to the bank.** §9 and §16 never say whether a mortgaged tile
   may be sold, or at what price. Engine: allowed, at the full sell-property price, mortgage
   cleared — so Bay Road (₹1,400) mortgaged for ₹700 then sold for ₹980 yields ₹1,680.
   *Recommendation:* refuse `SELL property` on a mortgaged tile ("redeem first"), mirroring row
   18's "sell buildings first".
2. **A mortgaged deed returning to the bank** (bank bankruptcy, row 43). `flows/bankruptcy.md`
   invariant 3 says a mortgage is never silently cleared; nothing says what the bank does with
   one. Engine: the flag is cleared and the auction lot opens unmortgaged.
3. **Rounding rules absent from the rulebook:** percent tax (§2.3) — engine rounds to the rupee;
   redeem interest (§9 "+10 %") — engine rounds to the rupee (₹705 → ₹71 interest); mortgaged
   tiles at half cost in net worth (§14) — engine floors. §3's ₹5 step applies to tile price
   fields only.
4. **Utilities beyond four.** §7: "a fifth utility reuses the ×4 entry index 4" is self-
   contradictory (×4 is index 0). Engine: reuses the last entry (×20).
5. **Debt still unpayable at the next turn start.** `flows/raise-cash.md` (failure table) and
   `flows/turn.md` step 5 say it "resolves as bankruptcy" automatically; rulebook §14 only says
   raise cash reopens. Engine: reopens `1d`; the player declares. (`flows/turn.md` invariant 6,
   "a turn cannot end with an unresolved debt", contradicts its own step 5.)
6. **Playing the "Affects: Me" hold cards.** `rentWaiver`, `rentMultiplier`, `moveAnywhere`,
   `skipTurn`, `chooseDice`, `clearDebt`, `freeBuild` are granted by C6 but `USE_CARD` accepts
   only `jailPass`; `rent.ts`'s `applyRentEffects` is never called from a landing. No task in
   `TASKS.md` owns this. Also row 6: with nothing to sell, `OFFER_TRADE` stays legal beside
   `DECLARE_BANKRUPTCY` because it is the trade route — the rulebook's "only Declare bankruptcy
   remains" reads as the `1d` screen state, not the action set.
7. **Doc contradictions with no engine effect:** disconnect grace 90 s (rulebook row 27) vs
   turn hold 45 s (`flows/turn.md`, `flows/reconnect.md` — two different clocks, or one?);
   `flows/turn.md` "deck exhausted → reshuffles" vs §5.2 "with replacement, no discard pile"
   (engine follows §5.2).

Raised 21 September 2026 at the C7 gate.

**Options**
1. Confirm every engine default above and regenerate the rulebook to state them; add a task
   "C8 · Hold-card play" for item 6 (one `USE_CARD` branch per Me-effect, `applyRentEffects`
   wired into rent, `moveAnywhere` through the card-move path).
2. Item 1 → refuse the sale (recommended); item 2 → the lot opens mortgaged and the winner
   inherits the redeem cost, as a player creditor would; items 3–4 → state the rules; item 5 →
   keep reopening `1d` (the player, never the server, liquidates: raise-cash.md invariant 2).
3. Leave all as implemented and only regenerate the docs.

**Recommendation:** (2) for items 1–5, plus the C8 task from (1) for item 6.

---

## OQ-21 · Six values the full phase-C audit found unstated

**Affects:** `packages/game-engine/src/reducer/{turn,auction,property}.ts`, `src/invariants.ts`
(phase **C**); later `1x` (tile editor), `1y`/`1z` (decks and rules), `1s` (auction setup) and
`3m` (the Chennai rules sheet).

**Why it matters:** each is a behaviour the engine had to choose because no document states it.
Every one is implemented as described and marked `OQ-21` at the line. None blocks a task.

### 1. A Tax office tile never draws from its deck

§2.3 says a card space draws 1 on landing **and** that Tax office "adds a TAX MODE block"; the
design ships a Tax office deck with 6 rules. The engine charges the tax and does not draw
(`src/reducer/turn.ts`), so those 6 rules can never fire.

**Options:** (1) charge the tax, then draw and apply the rule; (2) draw only when the tile has no
tax block; (3) the tax block replaces the deck, and `1y` should stop offering a deck on a tax tile.
**Recommendation:** (1) — it is the only reading under which the design's own Tax office deck is
reachable. The order matters: tax first, then the draw, so a card move lands the token elsewhere
after the charge.

### 2. Which card is the "Free Rest house Card", and is it consumed?

§13 exempts a lander holding a "Free Rest house Card"; §5.1's `CardEffect` union has no such
effect. The engine accepts any held `skipTurn` card ("Stay put and pass the dice on.") and does
**not** consume it, so one card exempts its holder forever.

**Options:** (1) add `{kind:'freeRestHouse'}` to the union and consume one use per exemption;
(2) keep `skipTurn` as the marker but consume a use; (3) leave it permanent.
**Recommendation:** (1). `skipTurn` is documented as an effect that *causes* a skip, so reusing it
as the exemption is a contradiction in the grammar.

### 3. Does a double that releases from jail grant another roll?

§12 says "rolling a double releases without paying"; §15 says a double grants another roll, with no
jail exception. The engine releases, moves, and ends the turn — no extra roll.

**Options:** (1) no extra roll (the double is spent on the release); (2) the roll behaves like any
other, so a double taken on release rolls again; (3) release, move, and count it toward the
three-doubles jail rule without re-rolling.
**Recommendation:** (1), matching the common reading of "the double buys your way out".

### 4. Is even build measured over the holder's tiles or the whole group?

§4/§8: "no tile in a group may hold more houses than another +1". The engine compares every tile in
the group. Under Majority (hold 3 of 5) the two tiles the holder does not own sit at 0 for ever, so
the holder can never place a second house anywhere in the group.

**Options:** (1) compare only the tiles the holder owns; (2) compare the whole group as today and
accept that Majority boards cap building at one house per tile; (3) compare the whole group only
when the holder owns every tile.
**Recommendation:** (1). Under (2) the "Own 3 to double rent and build" explainer on a Majority
board promises building that cannot happen.

### 5. Where do bail, the rest-house fee and a GET IN charge go?

§6 names "fines and taxes" as the pot's sources. The engine routes all three as fines, so on a
`finesTo: 'pot'` board they land in the pot. Separately, `2.4`'s GET IN "Pay to" offers `bank` /
`pot` per tile, and the engine lets the board's `finesTo` override the tile's choice.

**Options:** (1) all three are fines and follow the board setting, with the tile-level `Pay to`
removed from `1x`; (2) the tile-level `Pay to` wins for that tile and the board setting covers the
rest; (3) only taxes and card fines reach the pot; bail and the rest-house fee always go to the
bank.
**Recommendation:** (2) — a per-tile control that the board silently overrides is a design defect,
and the design does show it per tile.

### 6. Which auction lots open at the board's starting price?

§10 lists "Starting price ₹100 from board rules" alongside "minimum bid = the tile's cost" for a
declined purchase. The engine opens declined lots at the tile's cost and bank-bankruptcy lots at
`rules.auction.startingPrice`.

**Options:** (1) as implemented; (2) every lot opens at the starting price; (3) every lot opens at
the tile's cost and the starting price applies only to a player-initiated lot (`1s`).
**Recommendation:** (1). A bank lot has no seller to protect, and the design's `1s` "Start price"
sits in the auction panel rather than on the tile.

Raised 23 September 2026 by the full phase-C `rules-auditor` pass.

---

## OQ-22 · Two more unstated values, found re-auditing the phase-C fixes

**Affects:** `packages/game-engine/src/board.ts` (`teleport`), `src/reducer/cards.ts` (task **C6**);
later `1z`'s MOVE block and its money block.

**Why it matters:** both are behaviours the engine had to choose, neither is covered by OQ-15–OQ-21,
and both change money. Each is implemented as described and marked `OQ-22` at the line.

### 1. Does a teleport pay the pass bonus when it never reaches the start tile?

§1: a teleport "pays it **only if** the rule's `collectPassBonus` flag is set". That is a necessary
condition; the engine also treats it as sufficient, so a `To tile` rule from tile 2 to tile 5 with
the flag on pays the full ₹2,000 without crossing index 0. Edge case #14 only covers a teleport
**onto** the start tile, so the paying-without-crossing case is untested and undescribed.

**Options:** (1) the flag alone pays, as implemented — simplest to author, and "Collect pass-Go
bonus" reads as a per-rule reward; (2) the flag is a permission and the bonus is paid only when the
target is index 0 or the forward path to it crosses index 0; (3) the flag pays only on a landing
exactly on index 0, which is row 14's literal case.
**Recommendation:** (2). It keeps one meaning for "passing the start tile" across forward moves and
teleports, and leaves the flag doing what its label says — permitting the bonus, not granting it.

### 2. Is a card rule's "You pay bank" a fine for §6's money destination?

§6 sends "fines and taxes" to the free-parking pot on a board that asks for it. Tax, bail, the
rest-house skip fee and a GET IN charge all route as fines (OQ-21 item 5). A card MONEY block with
direction `You pay bank` does not: it goes to the bank, so on a pot board two penalties that read
identically on the notification card end up in different places.

**Options:** (1) card money always goes to the bank, as implemented; (2) `You pay bank` is a fine
and routes through the board's setting; (3) add a per-rule "Pay to" control in `1z` beside the
direction picker.
**Recommendation:** (2). A card that says "Pay ₹500" is a fine in every sense §6 uses the word, and
(3) adds a control the design does not have.

Raised 23 September 2026 by the phase-C re-audit.

---

## OQ-23 · The board map's zoom step, and its range per mode

**Affects:** `apps/mobile/src/ui/board/*` (task **E2**); `1c` play HUD, `2a` board builder.

**Why it blocks:** the `−` / `+` zoom buttons must move the scale by some amount, and no document
states one. E2 shipped `ZOOM_STEP = 0.2` as a placeholder — an invented value under Rule 2. The
design does show three discrete percentages in use (100%, 180%, 240%).

Separately, the two screens clamp the same component differently: `1c` §6 and §11 AC5 say
100%–400%; `2a` §5 and §11 AC3 say 50%–400%. That contradiction is recorded in
`docs/design-concerns.md`; this question is what the engine-side constant should be.

**Options**
1. A continuous step of 20 percentage points (as shipped), clamped per mode: 100–400 in play,
   50–400 in build.
2. Discrete stops the design actually shows — 50 (build only), 100, 180, 240, 400 — with `−` / `+`
   walking the list, which makes the percentages in the mock-ups reproducible.
3. A multiplicative step (×1.25 per press), which keeps the same visual increment at every scale.

**Recommendation:** (2). It is the only option that reproduces the design's own readouts, and it
makes `Fit` a real stop rather than a special case.

Raised 23 September 2026 during E2.

**ANSWERED 23 September 2026 — option (2).** The zoom stops are **50 / 100 / 180 / 240 / 400**;
`−` and `+` walk that list. 50% is reachable in build mode only, so the play-mode list starts at
100% (the per-mode clamp is recorded in `docs/design-concerns.md`). Implemented in
`apps/mobile/src/ui/board/layout.ts`.

---

## OQ-24 · Five board-map values the design does not state

**Affects:** `apps/mobile/src/ui/board/*` (task **E2**); `1c` play HUD, `2a` board builder.

**Why it matters:** each is a number or a sentence E2 needed and no document gives. Every one is
implemented as described below and marked in code; none blocks the task.

1. **The price's drop-out width.** `1c` §8 and `2a` §7 both give 44 dp as the point where "board
   tile labels drop out", and docs/03 says the name and the price go "in that order" — but never
   gives the second threshold. E2 drops the name at 44 dp (per the screens) and the price at 30 dp,
   which is invented. *Options:* (a) both drop at 44 dp, so the two-stage drop docs/03 describes
   never happens; (b) name at 44, price at a stated second width; (c) price drops when its
   rendered text would clip, with no fixed number. *Recommendation:* (b) with 30 dp confirmed —
   it preserves the documented two-stage behaviour.

2. **The display-only sentence for a ring that is not 40 slots.** `2a` §4 makes the map
   display-only at Fit on 40 slots and gives the toast copy; `2a` §8 requires display-only
   behaviour on *any* map whose slots fall under 44 dp. The shipped sentence quotes "about 27dp",
   which is false on a 16-slot board, so E2 raises no toast there at all — the tap is simply
   ignored. *Options:* (a) a second, size-neutral sentence for the general case; (b) the same
   sentence with the figure removed; (c) no toast except on 40 slots, as shipped.
   *Recommendation:* (a).

3. **The name's weight/size switch point.** `1c` §3 #6 gives "name `700 7px`–`600 9px` by zoom"
   without saying where it changes. E2 switches at 56 dp of rendered tile width.
   *Recommendation:* confirm 56 dp, or give the zoom level the design intends.

4. **Board-map insets and pip anchors.** The zoom bar is "bottom-left" and the pan hint
   "bottom-right" with no inset; the owner, house and hotel pips have sizes but no anchors or
   gaps. E2 uses an 8 dp inset for both bars, a 2 dp pip inset and a 1 dp gap between house pips.
   *Recommendation:* confirm, or add them to docs/02 with the other board values.

5. **The centre art's radius.** `2a` §3.1 #6 gives its border and captions but no radius; E2
   reuses `radius.tileFace` (8). *Recommendation:* confirm, or state it.

Raised 23 September 2026 during E2's second design-check pass.

---

# Answers — 24 September 2026

OQ-15, OQ-17, OQ-19, OQ-20, OQ-21, OQ-22 and OQ-24 were all answered in one pass. Each entry
above still states the question and its options; this section records what was decided and what
it changed. Items that need a **derived doc regenerated** are listed at the end — those docs are
edit-denied under Rule 0 and must come from the design, not from a hand patch.

## OQ-15 — option 1, confirmed

The cash ledger, the token position and the hotel reading all stand. Even build compares houses
on tiles that do **not** hold a hotel, as implemented. `packages/game-engine/SPEC.md`'s
`evenBuild` row has been rewritten to state that rule.

## OQ-17

1. **Jail entry charge** — landing only. Unchanged.
2. **Free-parking pot payout** — `3m`'s Chennai copy names the landing tile; until it is
   regenerated the pot accumulates and never pays out. Unchanged in code.
3. **"Player's choice" tax** — resolves Flat. Unchanged.
4. **"Hotel returns houses"** — the toggle is **dropped**. `Ruleset.building` is gone and a hotel
   always returns its four houses to the bank (rulebook §8). No behaviour was invented for an
   "off" setting.
5. **Minimum raise** — `leading + 1`. Unchanged.

## OQ-19

1. **MONEY directions** — four, as implemented. `1z` §4.1's six need regenerating.
2. **"Affects another player" cards** — deferred to a new task, **C9 · Target-choice action**.
   Until it lands the block is skipped and logged, which a test now pins.
3. **Basis under Share / Collect** — confirmed: the amount is per counterpart.
4. **MOVE after a MONEY debt** — confirmed: the move is dropped, the hold card still applies.
5. **Ranges and expiry** — the rulebook's values win; `1z` §4.2–4.3 needs regenerating.
6. **Card chains** — a MOVE block may no longer target a card space. `checkMoveTargets()` in
   `packages/game-engine/src/publish.ts` refuses such a board at publish time;
   `MAX_CARD_CHAIN` stays as a backstop for versions published before the check existed.

## OQ-20

1. **Selling a mortgaged tile** — **refused** until it is redeemed (`E_TILE_MORTGAGED`). This
   closes the leak where mortgage-then-sell paid out more than the tile cost.
2. **A deed returning to the bank** — keeps its mortgage; the lot opens mortgaged and the winner
   inherits the redeem cost. `mortgageConsistency` therefore allows **any** bank-held mortgaged
   deed and only forbids buildings on a mortgaged tile. A `pendingAuctions`-only exception was
   tried first and the 1,000-match fuzz disproved it: a deed also reaches the bank with auctions
   switched off (edge case #43) and when a lot goes unsold (#3). `createMatch` still starts every
   tile unmortgaged, so no match can begin in that state.
3. **The three roundings** — to be stated in the rulebook; the engine keeps round / round / floor.
4. **Five or more utilities** — §7's wording to be clarified; the engine keeps the last entry.
5. **Unpayable debt at the next turn** — `1d` reopens; no automatic bankruptcy. Unchanged.
6. **Playing the "Me" hold cards** — a new task, **C8 · Hold-card play**.

## OQ-21

1. **Tax office** — charges its tax, **then draws** from its deck, every time. An unpaid tax does
   not cancel the draw: rulebook §2.3 draws 1 on landing, the debt simply keeps the turn in
   raise cash, and the drawn rule's MOVE block is skipped while a debt is open (OQ-19 item 4).
   An earlier cut held the draw back "until the debt clears" and in fact dropped it for good —
   found by the rules audit and fixed.
2. **Free Rest house Card** — a new `freeRestHouse` effect, and using it spends a use. A
   `skipTurn` card no longer stands in for it.
3. **A releasing double** — grants no extra roll. Unchanged.
4. **Even build** — measured among the tiles **the building player holds**, not the whole group.
5. **"Pay to"** — a tile's own setting wins over the board's fines destination. `Debt.payTo` now
   carries `pot` and `bank` alongside `fine` and `creditor`.
6. **Auction starting price** — confirmed: declined lots open at the tile's cost, bank lots at the
   board's starting price.

> **Item 4, settled 25 September 2026 — the holder's tiles.** The first answer said "whole colour
> group" but gave the reason that argues against it, and the contradiction was flagged rather than
> resolved. Shown the numbers, the user chose the holder's-tiles reading.
>
> *Why:* on a Majority board a holder of 3 of 5 owns three tiles and can never raise the other two,
> so under the whole-group reading the minimum is pinned at 0 and every tile they own caps at **one
> house** — three houses in the group, for ever, and no hotel, because a hotel needs four houses on
> a tile. The 2-, 3- and 4-house and hotel rents printed on every deed in that mode are unreachable,
> while the mode's own copy promises "Own 3 to double rent **and build**". Under the holder's-tiles
> reading the ladder runs 1·1·1 → 2·2·2 → 3·3·3 → 4·4·4 → hotels, exactly as on a board where the
> whole group is owned. The two readings are identical under the **All tiles** threshold, so nothing
> changes on a standard board.
>
> *This is a deliberate departure from §4's literal wording.* §4 says "no tile **in a group** may
> hold more houses than another +1"; the engine reads "in a group" as "among the holder's tiles".
> The consequence is that two holders of one group may sit at 4 · 4 · 4 beside 0 · 0, which §4 as
> written forbids. §4 should be regenerated to say so — recorded in `docs/design-concerns.md`.
>
> *A second consequence:* even build stopped being a **state invariant**. A holder at 3 · 3 · 3 who
> buys, wins or is given a fourth tile in the group joins it to their ladder at 0 houses — a spread
> of 3 that no action did anything wrong to produce, and building that newcomer to 1 is legal too.
> So `evenBuild` was removed from `checkInvariants` and the rule now lives only on BUILD and SELL in
> `reducer/property.ts`. `SPEC.md`'s invariant table records the removal and why.

## OQ-22

1. **Teleport pass bonus** — the flag is a **permission**: the jump must also land on the start
   tile or wrap forward past it. A short forward jump now pays nothing.
2. **A card's "You pay bank"** — treated as a **fine**, so a pot board collects it.

## OQ-24 — all five confirmed

The price drop-out width (30 dp), the absent display-only sentence off the 40-slot ring, the 56 dp
name switch point, the bar insets and pip anchors, and the centre-art radius all stand as
implemented. Item 4's numbers have been moved out of the component into
`packages/shared/src/tokens.ts` (`board.*`) so they live with the other design tokens;
`docs/02-design-tokens.md` needs regenerating to carry them.

## Derived docs that need regenerating from the design

These cannot be hand-patched (Rule 0, and they are edit-denied in `.claude/settings.json`):

| Doc | What it must say |
| --- | --- |
| `docs/05-game-rules.md` | §4 and §8 even build measured among the holder's tiles · §2.3 Tax office draws as well as charging · §7 the five-utility wording · §8 the dropped "Hotel returns houses" toggle · §9 the three rounding rules · §13 the `freeRestHouse` card and its use · §1 the teleport bonus as a permission |
| `docs/screens/1z-rule-control.md` | §4.1 four MONEY directions · §4.2–4.3 the rulebook's ranges and expiry values |
| `docs/screens/3m-*.md` | which tile pays out the free-parking pot |
| `docs/02-design-tokens.md` | the board-map insets and pip anchors now in `tokens.board` |
| `docs/08-database.md` | the derived pending / completed column from OQ-6 |

---

## OQ-25 · What does it cost to buy a mortgaged deed from the bank?

**Affects:** `packages/game-engine/src/reducer/property.ts` (`validateBuy` / `applyBuy`); `1i` the
buy decision and `1n` #3 `PROPERTY COST`.

**Why it matters:** OQ-20 item 2 (answered) keeps the mortgage on a deed the bank takes back, so a
player can now land on an unowned **mortgaged** tile — reachable when auctions are off (edge case
#43) or after a lot goes unsold (#3). Nothing states what BUY costs there. The engine charges the
full tile cost and hands over the deed still mortgaged, so the buyer pays full price for a tile
that earns no rent until they also pay the redeem cost. The `PROPERTY COST` card shows the plain
cost, with no hint that the deed is encumbered.

**Options**
1. Full cost, mortgage inherited — as implemented. Simple, and it matches the auction lot, where
   the winner also inherits the mortgage.
2. Cost **less** the mortgage value, deed arriving mortgaged — the buyer pays for what they get.
3. Cost **plus** the redeem cost, deed arriving clear — one payment, no encumbrance.

**Recommendation:** (1) for the money, with a card change: `PROPERTY COST` must say the deed is
mortgaged and name the redeem cost, or the price is misleading. (2) double-counts the discount,
since the bank already paid the mortgage out to the previous owner.

Raised 24 September 2026 by the rules audit of the answered questions.

---

## OQ-26 · Does a teleport that does not move pay the pass bonus?

**Affects:** `packages/game-engine/src/board.ts` (`teleport`); the MOVE block in `1z` §4.2; later
the `moveAnywhere` hold card (task C8).

**Why it matters:** OQ-22 item 1 (answered) made the `collectPassBonus` flag a permission — the
jump must also land on the start tile or wrap forward past it. A jump whose target **is** the tile
the token already stands on satisfies "lands on the start tile" when that tile is Start, so the
engine pays the full salary for a move of zero tiles. §1, §21 #14 and the OQ-22 answer all read
the same way, so the engine follows them; nothing states whether a no-movement jump was meant to
count.

The case is hard to reach today — a card draw needs a card space, and slot 01 is the start corner
— but `moveAnywhere` (C8) lets a player pick any tile, including the one they are on.

**Options**
1. Pay, as the three sources read and as implemented.
2. Do not pay, and amend §1 and §21 #14 to say the token must actually move.
3. Refuse the move outright: a `To tile` whose target is the token's own tile is not a move, and
   `1z` blocks it at authoring time the way it blocks a card-space target (OQ-19 item 6).

**Recommendation:** (3). It removes the question rather than answering it, matches the
publish-time check the design already accepted for card-space targets, and leaves §1 alone.

Raised 24 September 2026 by the rules audit; an earlier fix pass implemented option (2) without
asking, which was an invented rule and has been reverted.
