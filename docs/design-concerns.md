# Design concerns

> Generated from `Royal Navy 1080 v2.dc.html` — 49 options / 93 screens (Session 9 export) · 19 September 2026.

Implement the design as it is. These are recorded, not acted on. Each entry says what was
implemented, what the concern is, and what would change if the concern were accepted. Nothing here
authorises a deviation.

---

## 1 · The project's bound design system is not the design file's vocabulary

**Implemented:** the design file's own vocabulary — Baloo 2, navy gradients (`#133D8C → #0B2456 →
#0E2E66`), gold primary actions, 17 dp padding.

**Concern:** the project has the **Nocturne** design system attached (Inter, `#161826` ground, single
blurple accent `#9184D9`, outlined primary buttons, 8 px radii). The two are incompatible on every
axis: typeface, ground, accent, button treatment, radius scale, density. The design file has never
been migrated, and the change log records this as a standing decision.

**If accepted:** every screen doc's token references change, and every button in the app becomes an
outline rather than a gold fill. That is a full re-skin, not a tweak. It should be a deliberate
project, with the design file migrated first and these docs regenerated from it.

---

## 2 · Colour-value noise

**Implemented:** six text tokens (`0.95 / 0.8 / 0.75 / 0.72` alphas plus `#FFFFFF` and `#EDF3FF`).

**Concern:** the design file contains floating-point noise variants — `rgba(198,220,255,
0.8500000000000001)`, `0.8999999999999999`, `0.8200000000000001`, `0.7` — that are visually
indistinguishable from their neighbours and appear to be arithmetic artefacts rather than intent.

**Action taken:** these are mapped to the nearest token. This is the **only** normalisation applied
anywhere in this package, and it is applied in `02-design-tokens.md` explicitly.

---

## 3 · The frame height is a reference, not a device

**Implemented:** 360 × 780 layouts, with the region the design marks `overflow-y:auto` becoming the
scroll region and header/footer pinned.

**Concern:** no shipping Android phone is 780 dp tall at 360 dp wide (a Pixel 6 is about 360 × 800
dp *including* system bars, leaving roughly 360 × 730 of app area). Several screens were tightened
during design specifically to fit 780 — the board builder map dropped 260 → 210 dp, header actions
became 39 dp icon buttons. On a real device with safe-area insets the available height is smaller
still.

**If accepted:** the tightened screens (`2a`, `1d`, `1w`) would get a second pass at a real device
height rather than at 780.

---

## 4 · Gold means two things

**Implemented:** gold as designed — primary action buttons *and* selection state (the ringed
catalogue card, the selected segment).

**Concern:** in `1e` Board catalogue the selected card is ringed gold while the bottom bar's
"Use this board" is also gold, so two different meanings of gold are on screen together. The change
log records the decision that "gold means selected in the catalogue" and that Classic is marked
official by its OFFICIAL tag alone, which resolves the *badge* ambiguity but not the
selection-versus-action one.

**If accepted:** selection would move to the blue stroke (`#2C6BE0`) and gold would be reserved for
actions.

---

## 5 · Board naming is inconsistent across screens

**Implemented:** the names exactly as each screen shows them.

**Concern:** the design uses **Classic**, **Chennai Edition**, **Kochi Edition**, **Mumbai Nights**
and **Trivandrum Edition** in different places for what the review discusses as one worked example.
`2c` Publish was relabelled Kochi Edition in Session 7 while the review text and the lobby rules
card still say Chennai Edition.

**If accepted:** one example board name would be chosen for every non-Classic illustration. Note this
is example *content*, not structure — it does not affect implementation beyond fixture data, and the
fixtures in `docs/08-database.md` use Classic plus one custom board named **Chennai Edition**.

---

## 6 · Tile legibility at 11×11 on a 360 dp screen

**Implemented:** the 11×11 board map at the designed 202 dp inner grid, with 7–9 dp tile type.

**Concern:** 7 dp text is below the 12 pt floor any accessibility guidance would set, and at 130%
font scale the tile labels cannot grow without breaking the grid. The design answers this with the
100% / 240% zoom pair, which is the right mechanism, but the un-zoomed state remains decorative
rather than readable.

**If accepted:** the un-zoomed 11×11 map would show colour and ownership only, with names appearing
above a zoom threshold.

---

## 7 · The board builder footer changed meaning between sessions

**Implemented:** the Session 9 footer — a single inline stats line ("1,284 in game · 312 plays today
· 46 open · ₹84,200 held") on the published board, and the slot-progress row on an unpublished one.

**Concern:** the same footer slot carries two unrelated kinds of information depending on publish
state, and the PUBLISH CHECKS card is pinned in the same region. A developer reading only one of the
two builder screens will implement the wrong footer.

**If accepted:** the footer would carry slot progress always, and publish impact would move into the
unpublish sheet where the rest of the impact stats already live.

---

## 8 · Seventeen notification cards is a lot of modal

**Implemented:** all seventeen board-centre cards (`1n`), each dismissible by tapping outside or by
its timer, with decision cards keeping their buttons.

**Concern:** the review raised this (D2) and the answer shipped is the Settings → Event cards control
(All / Decisions only / Off). That is a good mitigation, but the default is All, so a new player's
first match is modal-heavy.

**If accepted:** the default would be "Decisions only" and "All" would be opt-in.

---

## 9 · The tile preview's rent ladder does not match the editor's percentages

**Implemented:** both, exactly as drawn — the editor's derived values from its percentages, and the
preview card's own figures.

**Concern:** in `1x` the Property editor at cost ₹1,400 shows base rent ₹35 and houses ₹70 / ₹140 /
₹280 / ₹420 with hotel ₹750, while the **preview card directly below** shows 1 house ₹175, 2 houses
₹500, 3 houses ₹1,100 and hotel rent ₹1,500. The same tile cannot have both ladders. The same
mismatch appears on the property card in `1c` (cost ₹280, house cost ₹150, **hotel cost ₹150**) where
house cost and hotel cost are identical.

**Action taken:** the **editor** is treated as the data model in `05-game-rules.md` §3, since it is
the surface that defines the fields. The preview and card figures are treated as illustrative
content, not as rules. Fixtures use editor-consistent numbers.

**If accepted:** the preview would be regenerated from the editor's values so a designer never sees
two ladders at once.

---

## 10 · "How to play" prose disagrees with the board editors

**Implemented:** `3m`'s sentences verbatim, and the editors' numbers as the rules.

**Concern:** `3m` describes Chennai Edition as bail ₹500 / three turns, houses at "the tile price ÷ 2",
"holding all five triples it", and auction bids rising "in ₹100 steps with 15 seconds on the clock".
The editors offer no rent-tripling tier at all, house cost is a free percentage (21 % in the example,
not 50 %), the jail corner's get-out amount is ₹5,000, and the auction timer is a board rule shown as
20 s in Rule lab and 30 s on the auction screen. `3m` is specified as *generated* from the board's
ruleset, so it cannot describe mechanics the ruleset has no field for.

**Action taken:** `3m` is implemented as a **generator** over the board's real ruleset
(`docs/screens/3m-how-to-play.md` gives the sentence templates). Its example copy is treated as
illustrative. The rent-tripling tier has no field and is therefore not implemented.

**If accepted:** either a third set-tier ("own all") would be added to Rule lab, or `3m`'s example
copy would be rewritten from a real ruleset.

---

## 11 · The auction bid timer has two values

**Implemented:** the auction screen's read-only "Bid timer · 30s" display, sourced from the board
rule.

**Concern:** Rule lab's Auction row reads "On · 20s" while `1s`'s AUCTION SETUP reads "Bid timer 30s".
Both claim to be the board's auction timer. Per A5/A6's principle — one rule, one owner — Rule lab is
the owner and the auction screen is a read-only display of it.

**If accepted:** `1s` would show whatever Rule lab holds, and the design file's 30 s would be
corrected to 20 s.

---

## Token census gaps between `02-design-tokens.md` and `03` / the screen specs

**Implemented:** as the screen specs state, with the values added to `packages/shared/src/tokens.ts`
under a "census gap" comment naming their source.

**Concern:** `02-design-tokens.md` claims to be a complete value census, but `03-design-system.md`
and several screen specs use values it does not list: the destructive button fill
`rgba(255,138,122,.08)`; the `Input` border `rgba(126,180,255,0.27)` and radius 17 (`1a`, `1b`); the
`ImageSlot` dashed border `rgba(126,180,255,.45)` (five screens — `02` only has `.4`), its hero wash
gradient and `rgba(255,255,255,.05)` highlight (`1w2`); the Sheet (22), Dialog (20) and Toast (15)
radii; and the Row pressed state "surface lightens 4%", which has no colour value at all and is
implemented as a `rgba(255,255,255,.04)` overlay.

**Action taken:** the values are used exactly as the specs give them. When `02` is next regenerated
from the design these should appear in its tables so the census is complete. Raised 20 September
2026 during B3.

## Platform limits on shadows

**Concern:** React Native 0.74 on Android renders no box shadows except the platform `elevation`
shadow, which is black, blurred by the OS and cannot be inset. The design's `shadow.card`
(`0 2 0 rgba(6,20,54,.4)` plus an inset 1 dp white highlight), `shadow.inset.sunken` and
`shadow.token` therefore cannot be reproduced on Android. `shadowStyle()` in
`apps/mobile/src/components/shadows.ts` emits the iOS shadow props (exact on iOS) and **no**
`elevation`, because a black OS shadow would look further from the design than no shadow. Inset
shadows are dropped on both platforms. Raised 20 September 2026 during B3.

## Status tag colours: `03` and `2a2` disagree

**Implemented:** `Pill` tones as `03-design-system.md` names them (`gold` = published, `green` =
completed, `amber` = pending), each drawn with the tinted pattern the screen specs use — role colour
at 18% fill, 45% border, flat colour text.

**Concern:** `2a2-boards-list.md` §3 row 7 colours the same three states differently: published is
green (`#7ADB25`), completed is blue (`#5FC0FF`) and pending is gold (`#FFC84A`), with radius 9 and
called `Tag`. Screens follow their own spec, so `2a2` will pass explicit colours; but the two derived
docs should agree after the next regeneration. Raised 20 September 2026 during B3.

---

## Design-check concerns raised at the Phase B gate (20 September 2026)

Reported by the design-guardian review of B1–B4, verbatim:

**A.** 02/03 give the header title as `type.h3` 700/17, but 16 screen specs give `ScreenHeader`
title as `700 19px` or `700 22px`. One of the derived docs is stale; needs regeneration, not a code
pick.

**B.** 03 `EmptyState` (62 dp dashed tile + 24 dp icon, `type.h2`, body max 240, one 200 dp-wide
primary) vs 3n §2/§3 (44 dp bare glyph `rgba(126,180,255,.45)`, title `700 17px`, body max 260,
action "min-height 44, radius 16, padding 13, label `700 15px`"). 3n is the primary user of
`EmptyState` and cannot be built from the 03 component.

**C.** 03 Button table (primary 800/16, no shadow) vs screen specs' `Button.primaryGold` /
`Button.primaryGreen` (1a #6: `800 17px` letter-spacing .1em with a `0 6px 0 #2C7A06` hard shadow;
3c #10 / 3n #6: `700 15px`, `0 4px 0 #B57F0C` shadow, min-height 44). The six-variant table and the
screen specs describe different buttons.

**D.** 04 route table sends Spectating back to `/profile/friends`, which is not a route — already
logged as OQ-13; code goes to `/modes`.

**E.** `Skeleton` and `ImageSlot` are required by TASKS B3 and by many screen specs but have no
entry in `docs/03-design-system.md`; their values live only in per-screen tables (and differ per
screen), so there is no single component spec to verify against.

**Also noted (MINOR 15):** 03 describes the selected Row as "1 dp `gold.flat` ring, inset glow";
no value is given for the glow and inset shadows are not representable on Android (see "Platform
limits on shadows"), so only the ring is drawn.

## Owner-guard failure target for the tile, deck and rule editors

**Implemented:** as `docs/04-navigation-map.md` "Guards" states — every `owner` guard failure
redirects to `/create/boards`, including `/create/tiles/[tileId]`, `…/art`, `/create/decks/[deckId]`
and `/create/rules/[ruleId]`.

**Concern:** for those four routes the natural return is the editor's own list (`/create/tiles`,
`/create/decks`, `/create/rules`), which the route table gives as their Back target; landing a user
on the boards list after opening someone else's tile is disorienting. The map should probably give
the owner guard a per-route failure target. Raised 20 September 2026 at the Phase B gate.

## `1j` shows a doubled base rent on a tile with two houses

**Implemented:** rent per rulebook §7 — building rent replaces base rent, and the set multiplier
applies to base rent only (`packages/game-engine/src/rent.ts`).

**Concern:** the `1j` layout map shows, on one card, `Rent now ₹350 · doubled` and `Houses 2 of 4`.
Under §7 a tile with two houses charges its 2-house rent, not a doubled base, so the two lines
cannot both be live values of one tile. The engine reproduces each figure separately (₹350 as a
doubled ₹175 base with no buildings; `With 1 house ₹700` from the ladder) but never the card as
drawn. The screen task for `1j` should render whatever `rentFor` returns. Raised 21 September 2026
during C4.

## A trademarked property name in `1j`

**Concern:** `1j-property-card.md` §8 gives the accessibility label example "Park Place, you own 3
of 5 in the purple set, set held". Shipped names are Chennai / Royal Navy only (CLAUDE.md,
rulebook §20); the example should use a board name such as Marina Drive so it is not copied into
code or tests. Raised 21 September 2026 during C4.

## Trademarked property names throughout `1n`

**Concern:** `1n-notification-cards.md` §3 fills its sample cards with "Park Place", "Baltic
Avenue", "Boardwalk" and "Baltic + Oriental", and §8's announcement pattern repeats "Park Place".
Shipped names are Chennai / Royal Navy only (CLAUDE.md, rulebook §20) and are blocked at publish
time, so the samples should be regenerated with board names (Marina Drive, Mount Road…) before the
`1n` screen task copies them into fixtures. C5's tests use board names only. Raised 21 September
2026 during C5.
