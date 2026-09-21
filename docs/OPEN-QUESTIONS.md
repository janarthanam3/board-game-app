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

Raised 20 September 2026 during C1. Does not block a task. C5 (21 September) added two more of
the same kind: `bank.pendingAuctions` (lots a bank-bankruptcy queues for the next round, §14) and
`auction.resumeStage` (which turn stage a mid-turn auction returns to) — same options apply.

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
