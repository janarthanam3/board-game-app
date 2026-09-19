# 05 · Game rules — the rulebook

> Generated from `Royal Navy 1080 v2.dc.html` — 49 options / 93 screens (Session 9 export) · 19 September 2026.

**Contract:** two developers implementing from this file must produce byte-identical behaviour.
Every number here is taken from the design file or from `DECISIONS.md`. Where the design is silent,
the section says so and points at an `OPEN-QUESTIONS.md` entry — it does not guess.

All money is an **integer number of rupees**. Display uses `₹` and Indian digit grouping
(₹1,000 · ₹10,000 · ₹1,20,000). No paise anywhere.

---

## 1 · Board geometry

A board is a **ring** of tiles around a rectangular grid. Only perimeter positions are tiles; the
interior holds the board art.

```
ringSize(rows, cols) = 2 × rows + 2 × cols − 4
```

| Preset | Grid | Ring size |
| --- | --- | --- |
| 5×5 | 5 × 5 | 16 |
| 7×7 | 7 × 7 | 24 |
| 11×11 | 11 × 11 | 40 |
| Custom | rows × cols | `2r + 2c − 4` |

Custom steppers accept rows 3–15 and columns 3–15. A combination producing **fewer than 12 ring
positions is rejected at the stepper** with the inline message "At least 12 tiles needed." (D7).
Worked: 3×4 → 10 → rejected. 6×8 → 24 → accepted (the design shows exactly this: Rows 6,
Columns 8, "24 slots").

### Indexing and movement

- Slots are numbered **1…N** in the UI, **0…N−1** in the engine. Slot 01 is the start tile.
- Order is **clockwise** from the start corner, which sits bottom-left in the map and is drawn first
  in the slot list ("Board order · slot 01 → 16").
- Movement: `next = (current + steps) mod N`. Backward: `next = (current − steps + N) mod N`.
- **Passing the start tile** pays the pass bonus whenever the move crosses index 0 in the forward
  direction, including landing exactly on it. A backward move never pays it. A teleport
  ("Move anywhere", "To tile") pays it **only if** the rule's `collectPassBonus` flag is set
  (`1z` MOVE block, "Collect pass-Go bonus").

### Generation for each size

`generateBoard(rows, cols)` produces an all-empty ring of `ringSize` slots with the start tile
pre-placed at index 0 and nothing else. Growing a board keeps every placed tile at its index and
appends empty slots ("Growing the board keeps placed tiles and adds empty slots"). Shrinking removes
the highest indices and **unassigns** the tiles that were on them into the unplaced list — never
deletes them — behind the confirm dialog in `2a5`:

> Title "Shrink to 5×5?" · Body "This removes 24 slots. 19 placed tiles will be unassigned and moved
> to your unplaced list. Nothing is deleted." · Buttons Cancel / Shrink board.

Growing needs no dialog.

---

## 2 · Tile types

Four types (`1x` Tile type): **Property**, **Utility**, **Card space**, **Corner space**.
"Corner" is a *type*, not a grid position — a corner-space tile may sit anywhere on the ring (D7).

### 2.1 Property

| Field | Editor | Example (cost ₹1,400) |
| --- | --- | --- |
| Cost | flat only | ₹1,400 |
| Base rent | % of cost or flat | 2.5 % → ₹35 |
| Rent with houses 1/2/3/4 | % of cost or flat | 5 / 10 / 20 / 30 % → ₹70 / ₹140 / ₹280 / ₹420 |
| Hotel rent | % of cost or flat | 54 % → ₹750 |
| Mortgage | % of cost or flat | 50 % → ₹700 |
| House cost | % of cost or flat | 21 % → ₹300 |
| Hotel cost | % of cost or flat | 54 % → ₹750 |
| Sell house | % of house cost | 50 % → ₹150 |
| Sell hotel | % of hotel cost | 50 % → ₹375 |
| Sell property | % of cost | 70 % → ₹980 |
| Colour | swatch, unique per set | purple |

The editor's `Flat / %` segmented control chooses which side the author types; **the other side is
derived and shown read-only**. The header meta is "all values except cost", i.e. cost is always flat.

### 2.2 Utility

| Field | Example |
| --- | --- |
| Cost | ₹1,200 |
| Mortgage | 50 % → ₹600 |
| Rent basis | **Dice × multiplier** or **Fixed amount** |
| Multiplier by utilities owned 1/2/3/4 | × 4 / × 10 / × 16 / × 20 |
| Sell to bank | 70 % → ₹840 |

Dice-basis rent = `diceTotal × multiplier[utilitiesOwnedByOwner]`. The design's worked example:
"roll 7 → ₹28" at ×4, then ₹70 / ₹112 / ₹140 at ×10 / ×16 / ×20 (roll 7: 7×10 = 70, 7×16 = 112,
7×20 = 140).

**Club is a utility** (A11): the board map label is "Club · ₹900 · utility" and `1x` carries the
second utility example "City Club · ₹900 · dice × multiplier". "Club privilege" is a *deck* name and
is unrelated.

### 2.3 Card space

| Field | Options |
| --- | --- |
| Type | Chance · Chest · Tax · None |
| Card deck | exactly one deck from the library |

Not ownable ("ownable · no"). On landing: **draw 1** from the deck per the deck's draw mode.

**Tax office** (A9) adds a TAX MODE block: `Flat / Percent / Player's choice`, a flat amount, a
percent, and `Percent of: Cash / Net worth`. Default **Flat**. When the mode is not "Player's
choice" the notification card shows a single Pay button; under "Player's choice" it shows both
options ("Pay flat / Pay 10%").

### 2.4 Corner space

| Field | Options / example |
| --- | --- |
| Type | **Jail** · **Rest house** · None |
| Draw mode | Shuffle / Fixed — "On landing, any one of the active rules applies at random. Only one section active locks it to Fixed." |
| GET OUT (active) | Get out amount ₹5,000 · Max rounds held 3 · Double to get out ✓ · Use Jail Pass Card ✓ |
| STAY HERE (active) | Per skip turn amount ₹1,000 each turn skipped · Use Free Rest house Card ✓ |
| GET IN (active) | Amount ₹100 · Pay to: To bank |
| COMMON | "Block build, sell, mortgage and trade" ✓ · "Owner still collects rent while held" ✓ |

The preview reads the toggles (A7), so "rent while held · collected" appears only when that toggle
is on.

Each of the three sections can be independently active. With Shuffle and 3 active sections, landing
applies one at random; with one active section the behaviour is Fixed.

---

## 3 · Percentage-based pricing

### The formula

```
amountFromPercent(cost, pct)  = roundToStep(cost × pct / 100, 5)      // min 5
percentFromAmount(cost, amt)  = round(amt / cost × 1000) / 10          // one decimal, trailing .0 dropped
roundToStep(x, step)          = Math.round(x / step) × step            // half away from zero
```

- The author types **either** side; the other is derived and read-only.
- Derived **money** rounds to the nearest ₹5, floor ₹5.
- Derived **percent** shows at most one decimal (2.5 %, 21 %, 54 %).
- Clamps: percent 0.1 – 500 %. Cost ₹10 – ₹9,99,999. Any derived amount is clamped to ≥ ₹5.
- Sell-back percentages are relative to their **own** base: sell house is a % of *house cost*, sell
  hotel of *hotel cost*, sell property and utility sell-to-bank of *cost*.

### Worked examples (all from the design file)

| Cost | Field | % | Derived |
| --- | --- | --- | --- |
| ₹1,400 | Base rent | 2.5 | ₹35 |
| ₹1,400 | 1 house | 5 | ₹70 |
| ₹1,400 | 2 houses | 10 | ₹140 |
| ₹1,400 | 3 houses | 20 | ₹280 |
| ₹1,400 | 4 houses | 30 | ₹420 |
| ₹1,400 | Hotel rent | 54 | ₹756 → **₹755** derived; the design shows ₹750 because the author typed the flat ₹750 and 750/1400 displays as 54 % |
| ₹1,400 | Mortgage | 50 | ₹700 |
| ₹1,400 | House cost | 21 | ₹294 → **₹295** derived; design shows ₹300 typed flat (300/1400 = 21 %) |
| ₹1,400 | Sell property | 70 | ₹980 |
| ₹1,200 | Utility mortgage | 50 | ₹600 |
| ₹1,200 | Utility sell to bank | 70 | ₹840 |
| ₹600 | Base rent | 2.5 | ₹15 |
| ₹550 | Base rent | 2.5 | ₹15 (13.75 → 15) |

**Read this carefully.** Where the design shows a round number whose percentage is itself rounded
(₹300 at 21 %, ₹750 at 54 %), the *flat* value is what the author typed and the percentage is the
derived display. Storing the flat amount and deriving the percentage reproduces the design exactly;
storing the percentage and deriving the amount does not. Therefore:

> **Storage rule:** a tile stores, for every priced field, `{ mode: 'flat' | 'percent', flat?: number,
> percent?: number }`. The engine resolves `flat` directly, or computes it with
> `amountFromPercent` when `mode === 'percent'`. Never store both as truth.

### Board-size scaling

Nothing in the design scales prices by board size. A 16-tile board uses the same absolute prices as
a 40-tile board; the pace difference comes from the round cap and pass bonus, not from pricing.

---

## 4 · Colour sets and thresholds

Rule lab → COLOUR SETS.

| Control | Options | Design copy |
| --- | --- | --- |
| "You hold a set when you own" | **All tiles** · **Majority** · **Custom** | — |
| Explainer | — | "Purple has 5 tiles. Own 3 to double rent and build. Own 2 or fewer and you collect base rent only." |
| Mortgage breaks the set | toggle | on in the design |
| Build evenly | toggle | on in the design |
| Per-group overrides | "2 set" | two groups carry their own threshold |

Threshold resolution per group:

```
threshold(group) =
  override(group)                     if a per-group override exists
  group.size                          if mode = All tiles
  floor(group.size / 2) + 1           if mode = Majority
  customValue                         if mode = Custom   // must satisfy the stepper rule below
```

The Custom stepper enforces **more than half the group size**: a group of 5 allows 3, 4 or 5 (B5).

### Effects of holding a set

| Effect | Rule |
| --- | --- |
| Rent | `Set rent ×2` (Rule lab → Buying and rent). Applies to base rent on every tile of the group the holder owns. Does not multiply house or hotel rent. |
| Building | Permitted only while the holder holds the set ("Building needs the colour set threshold — set in Rule lab"). |
| Trade validation | A trade that would leave either side below a threshold is legal; it simply removes the set bonus. Nothing blocks it. |
| Mortgage | With **Mortgage breaks the set** on, a mortgaged tile does not count toward the threshold. |
| Build evenly | With the toggle on, no tile in a group may hold more houses than another +1. Selling is the mirror: no tile may fall more than 1 below another. |

### Hard error (D3)

A group whose tile count is **below its threshold** can never be held, so it is a **Save- and
Publish-blocking error**: "Purple set has 2 tiles, threshold 3 / This set can never be held" with a
Fix offering (a) lower the threshold to the tile count, or (b) add tiles.

Warning, not error: "Majority needs an odd group size / Sky has 4 tiles — a 2 and 2 split holds no
set."

### One colour, one set (D2)

Two groups on the same board may not share a colour. The tile-builder colour picker disables any
colour already used by another group, shows a padlock and the tooltip "Used by the Harbour set", with
the meta "One colour, one set. Pick an unused colour to start a new group." Sets have **no names** —
the swatch is the identifier. Practical ceiling ≈ 10 groups.

---

## 5 · Card decks and rules

### 5.1 Rules — the atom

A rule is **one effect** with up to four active blocks (`1z`):

| Block | Fields | Values in the design |
| --- | --- | --- |
| MONEY | Direction, Amount, Basis | Direction: Bank pays you · You pay bank · Share to all players · Collect from all players. Basis: Flat · Per player · Per house · Per tile owned |
| MOVE | Forward / Backward / To tile, Tile count, Target tile, Collect pass-Go bonus | count 0–40, target = a tile id |
| HOLD CARD | Affects (Me / Another player), effect picker, Uses, Expires, Tradeable | Uses 1–3, Expires Never / End of round / End of match, Tradeable Yes/No |
| CONDITIONS | Holds the colour set · Owns every tile in the set · Cash > 10k · Has house or hotel | "Uses the board's set threshold — 3 of 5 on this board." |

A rule with several active blocks applies them **in block order: CONDITIONS gate → MONEY → MOVE →
HOLD CARD**. The design's in-game preview shows exactly this composition: "Pay 500 to every player.
Move back 3 tiles. get jail pass card" tagged **MIXED**.

Rule names must be unique across the library ("Must be unique across the rule library.").

#### The card-effect grammar (A14)

Affects **Me** — 8 effects:

| Effect | Description (exact copy) | Typed effect |
| --- | --- | --- |
| Jail pass | "Walk out of jail without paying." | `{kind:'jailPass'}` |
| Rent waiver | "Skip one rent payment you owe." | `{kind:'rentWaiver'}` |
| Double rent collected | "Charge twice on your next rent." | `{kind:'rentMultiplier', factor:2, side:'collect'}` |
| Move anywhere | "Go to any tile on the board." | `{kind:'moveAnywhere'}` |
| Skip a turn | "Stay put and pass the dice on." | `{kind:'skipTurn'}` |
| Choose your dice number | "Name the number on your next roll." | `{kind:'chooseDice'}` |
| Clear a debt | "Wipe one outstanding amount you owe." | `{kind:'clearDebt'}` |
| Free house or hotel | "Place one build at no cost." | `{kind:'freeBuild'}` |

Affects **Another player** — 5 effects (A14): Double rent paid, Send to jail, Zero their cash,
Remove a house or hotel, Force trade acceptance. The design states "1 selected · 5 more effects under
Another player" and does not print their description lines; use the review's wording verbatim as the
label and leave the description to the same one-line pattern.

```ts
type CardEffect =
  | { kind: 'jailPass' } | { kind: 'rentWaiver' }
  | { kind: 'rentMultiplier'; factor: number; side: 'collect' | 'pay' }
  | { kind: 'moveAnywhere' } | { kind: 'skipTurn' } | { kind: 'chooseDice' }
  | { kind: 'clearDebt' } | { kind: 'freeBuild' }
  | { kind: 'sendToJail'; target: 'choose' }
  | { kind: 'zeroCash'; target: 'choose' }
  | { kind: 'removeBuilding'; target: 'choose' }
  | { kind: 'forceTradeAccept'; target: 'choose' };

type HoldCard = { effect: CardEffect; uses: number; expires: 'never'|'round'|'match'; tradeable: boolean };
```

### 5.2 Decks

| Field | Options | Design copy |
| --- | --- | --- |
| Deck name | unique | "Must be unique across card decks." |
| DRAW MODE | **Shuffle** · **My Order** · **Dice Number** | — |
| IF NO RULE MATCHES THE ROLL | **Whole deck** · **Nothing** · **Next in order** | default **Nothing**, meta "Player lands, no effect." (C7) |
| Rules in this deck | ordered list with roll assignment | "3 of 3 rolls set" |

The design's four decks: Chance (Shuffle each landing · 14 rules), Community fund (Odd dice number ·
3 rules), Tax office (Fixed order · 6 rules), Club privilege (Even dice number · 4 rules).

Draw semantics:

| Mode | Draw |
| --- | --- |
| Shuffle | Draw uniformly from the deck's active rules using the seeded RNG. Reshuffle rule: draws are **with replacement** — "Shuffle each landing" means each landing is an independent draw. No discard pile. |
| My Order | Maintain a per-deck cursor in match state; draw the rule at the cursor and advance it, wrapping at the end. The cursor is per match, not per player. |
| Dice Number | Match the **dice total** against each rule's assigned roll number(s). Odd/even/"+2"-style assignments are stored as an explicit set of totals per rule. |

Fallback when Dice Number finds no match: apply the deck's fallback (Whole deck = a Shuffle draw ·
Nothing = no effect · Next in order = the My Order cursor draw).

---

## 6 · Money

| Rule | Value | Source |
| --- | --- | --- |
| Starting cash (Classic) | ₹10,000 | D8, lobby rules card, `3c2` |
| Starting cash (board setting) | author-set, e.g. ₹15,000 | `2a` Board settings → MONEY |
| Pass GO | ₹2,000 | `2a`, `1n` start bonus |
| Currency | ₹ integer | A1 |
| Where fines go | board-dependent; Chennai Edition sends fines and taxes to the free-parking pot | `3m` |

The **bank is unlimited** for payouts and always able to buy back buildings. Player cash can never
go negative: any payment exceeding cash creates a **debt** and opens Raise cash (`1d`).

---

## 7 · Rent

```
rent(tile, owner, state, diceTotal) =
  0                                          if tile is mortgaged
  0                                          if owner is in jail AND board's "collects rent while held" is off
  utilityRent(tile, owner, diceTotal)        if tile.type = 'utility'
  buildingRent(tile)                         if tile.houses > 0 or tile.hotel
  baseRent × (holdsSet(owner, tile.group) ? 2 : 1)   otherwise
```

- `buildingRent` reads the tile's own 1/2/3/4-house and hotel figures. The set multiplier does
  **not** apply on top of building rent.
- `utilityRent = diceTotal × multiplier[utilitiesOwned]`, clamped to the 4-entry table; a fifth
  utility reuses the ×4 entry index 4.
- Card effects modify the result last: `rentMultiplier` (×2 collect or ×2 paid), `rentWaiver`
  (payment skipped, owner collects nothing).
- Rent is **not** collected while the tile is under auction or mid-trade.

---

## 8 · Building

| Rule | Value |
| --- | --- |
| Houses in the bank | 32 (Rule lab stepper) |
| Hotels in the bank | 12 |
| Houses before a hotel | 4 per tile |
| Hotel returns houses to the bank | on |
| Build eligibility | holder holds the colour set, no tile in the group mortgaged if "Mortgage breaks the set" is on |
| Even build | toggle "Build evenly"; when on, max difference of 1 house within a group |
| Build timing | on the holder's own turn, via `1v` → `1u`; one property per build action ("one property per build") |
| Cost | the tile's house cost / hotel cost |

Supply exhaustion: with 0 houses in the bank no house may be built, even with cash. Hotels are
built by **returning 4 houses plus paying the hotel cost**; those 4 houses go back to the bank
supply. Selling a hotel returns it to the hotel supply and pays the tile's sell-hotel price; it does
**not** automatically re-place 4 houses (the design's Sell screen lists House / Hotel / Property as
three independent sell actions).

Worked example from `1u`: Bay Road, house cost ₹300, houses 1 → 2, rent ₹35 → ₹175, pay ₹300.
Summary: Houses 2 × ₹600, Hotels 1 × ₹750, Total pay ₹1,350.

---

## 9 · Mortgage and redeem

| Rule | Value | Source |
| --- | --- | --- |
| Mortgage pays | the tile's mortgage value (default 50 % of cost) | `1x`, Rule lab "Mortgage 50% · 10% interest" |
| Interest | 10 % of the mortgage amount | Rule lab, `1q` |
| Redeem cost | mortgage amount + 10 % | Rule lab "Redeem · Cost + 10%" |
| Rent while mortgaged | none ("Rent lost ₹28") | `1q` |
| Buildings | a tile with houses or a hotel cannot be mortgaged — sell the buildings first | `1q` shows "Houses —" |
| Set effect | with "Mortgage breaks the set" on, a mortgaged tile stops counting toward the threshold | Rule lab |
| Trade | a mortgaged tile is tradeable; the debt travels with the deed | §11 |

Worked from `1q`/`1r`: two properties mortgage for ₹1,250 total, interest ₹125, redeem total
₹1,375. Marina Drive alone: mortgage pays ₹700, redeem ₹770, interest ₹70.

---

## 10 · Auctions

| Rule | Value | Source |
| --- | --- | --- |
| Trigger | a player declines to buy an unowned tile they landed on ("Decline a purchase and the tile goes to open auction") | `3m`, `1n` property-cost card |
| Second trigger | bankruptcy to the bank — the estate's tiles go to auction, "Auctions begin next round." | `1o` |
| Starting price | board rule, read-only "from board rules" (₹100 in the design) | `1s` (A10) |
| Minimum bid | the tile's cost when the auction starts from a decline ("Min bid ₹1,150" on a ₹1,150 tile) | `1s` |
| Bid increments | +10 / +50 / +100 quick buttons plus a free stepper | `1t` |
| Bid timer | board rule — Rule lab shows "Auction · On · 20s"; the auction screen shows "Bid timer 30s" as a read-only value | see concern 11 in `design-concerns.md` |
| Timer behaviour | each accepted bid resets the clock to the full bid timer | `1t` "0:14 left" counting down |
| Bidders | every solvent player including the decliner | `1s` "Bidders · 5 players" |
| Pass | a passed player is out of **this** auction ("Player 4 · passed") | `1t` |
| Resolution | highest bid at expiry wins and pays the bank; with no bids the bank keeps the tile ("The bank keeps the tile if nobody bids") | `3m` |
| Auction off | Rule lab can turn auctions off; a declined tile then stays with the bank |

A bid is invalid if it is below `max(minBid, leadingBid + 1)` or exceeds the bidder's cash. A player
cannot bid while they hold an unresolved debt.

---

## 11 · Trades

| Rule | Value |
| --- | --- |
| Tradeable | tiles (including mortgaged), cash, and hold cards whose `tradeable` is Yes |
| Not tradeable | houses and hotels (sell them first), turn order, jail state |
| Expiry | 60 s (Rule lab "Trading · 60s expiry") |
| Sides | exactly two players |
| Validation | both sides must be solvent after the transfer; a side may not give cash it does not hold; a tile with buildings may not be traded until the buildings are sold |
| Set consequences | a trade may break either side's set — permitted, and the design shows it: "Set held · broken" |
| Mortgaged tiles | the deed transfers with its mortgage; the receiver may redeem later at the same terms |
| During a turn | the actor may open a deal on their own turn (`1v` → `1p`); an incoming offer to a non-actor is the queued case → **OQ-2** |

`1p` summary shape: YOU GIVE · 2 (Land ₹2,300 + Cash ₹500 = ₹2,800), YOU GET · 2 (Land ₹2,050 +
Cash ₹0 = ₹2,050). The panel is informational — an unequal deal is legal.

---

## 12 · Jail

Jail is **optional** on a board (D7 — no jail tile is a warning, not an error). Parameters come from
the jail corner tile (§2.4).

| Rule | Value (design) |
| --- | --- |
| Entry | landing on a "GET IN"-active corner, or a card effect `sendToJail` |
| Entry charge | ₹100, paid to bank ("GET IN · Amount 100 · Pay to: To bank") |
| Bail | ₹5,000 ("Get out amount") |
| Max rounds held | 3 — release is automatic after that, paid or not |
| Double to get out | on — rolling a double releases without paying |
| Jail Pass card | allowed |
| While held | build, sell, mortgage and trade are blocked; the owner still collects rent |

`3m` describes the same mechanic with Chennai Edition's own numbers ("Bail is ₹500, payable on any
of your turns. You leave after three turns whether you pay or not. Rent still comes to you while you
are in there."). The **board's** numbers always win; `3m` is generated prose, not a second rulebook.

---

## 13 · Rest house

Corner type **Rest house**. STAY HERE active: the lander skips turns and pays
"Per skip turn amount ₹1,000 each turn skipped". A "Free Rest house Card" hold card exempts them.
The design's notification card: "REST HOUSE · You · 1 turn skipped · − ₹1,000".

On Chennai Edition the free-parking variant pays out the accumulated fine pot to whoever lands on it
(`3m`) — that is a board-level money-destination setting, not a separate tile type.

---

## 14 · Rounds, pace and the endgame

| Rule | Classic | Custom |
| --- | --- | --- |
| Round cap | 20 | 10–200, default 40 |
| Turn timer | 30 s | 15 / 30 / 45 / Off |
| Starting cash | ₹10,000 | author-set |
| Win condition | Highest net worth at the cap | same, author-visible as "Endgame" |
| Estimated length | "About 30 minutes with 4 players." | Rule lab's estimate panel |

A **round** is every active player taking one turn (A13). The match ends when either the round cap is
reached (highest net worth wins) or one player is left standing.

```
netWorth(player) = cash
  + Σ unmortgaged tiles: tile.cost
  + Σ mortgaged tiles:   tile.cost / 2        // "Mortgaged tiles count at half value" (3m)
  + Σ houses × tile.houseCost
  + Σ hotels × tile.hotelCost
```

Ties at the cap are broken by: (1) most tiles, (2) most buildings, (3) lowest seat index. Nothing in
the design shows a tie state; this is the one place the rulebook fills a gap, and it is recorded here
rather than left to the implementer.

### Turn timer expiry

The server owns the clock. On expiry it applies the **minimum legal action**: if the player has not
rolled, it rolls for them (the removed C3 card read "Auto-rolled · moved to Bay Road"); if they have
rolled and owe nothing, it ends their turn; if they owe money, the debt stands and the turn passes,
leaving raise-cash open on their next turn. The client-side *feedback* for this is **OQ-1**.

---

## 15 · Turn structure

1. **Start of turn** — expire round-scoped hold cards; if the player is in jail, offer Roll / Jail
   Pass / Pay bail (`1n` "IN JAIL" card).
2. **Roll** — two dice, 1–6 each, from the seeded RNG. `chooseDice` replaces the roll with the named
   total.
3. **Doubles** — a double grants another roll after resolving the landing. **Three doubles in one
   turn sends the player to jail** if the board has a jail tile; with no jail tile the third double
   simply ends the turn.
4. **Move** — advance clockwise, pay the pass bonus if index 0 is crossed.
5. **Resolve the landing** — by tile type (buy / pay rent / draw / corner effect / tax).
6. **Optional actions** — build, sell, mortgage, redeem, trade, via the Actions sheet. Available
   before and after the roll, but never while a debt is unresolved.
7. **End of turn** — pass to the next solvent player; increment the round when the dice return to
   seat 1.

---

## 16 · Raise cash and bankruptcy

When a payment exceeds cash, the player holds a **debt** and `1d` opens. It cannot be dismissed.

Three routes, each with its own screen and a shared route-total band ("Mortgage ₹750 · Sell ₹350 ·
Trade ₹600 · All routes ₹1,700"):

| Route | Raises |
| --- | --- |
| Mortgage | the mortgage value of selected unmortgaged tiles |
| Sell | sell-back price of houses, hotels, then whole properties |
| Trade | cash from an accepted offer |

Header: "Pay to <creditor> · Cash I have ₹640 · Raised now ₹750 · TOTAL TO GIVE ₹1,200". The
"Pay ₹1,200" button is disabled until `cash + raised ≥ debt`. "Declare bankruptcy" sits at the
bottom of all three routes with the meta "<creditor> receives your cash and title deeds".

### Bankruptcy resolution order

1. All of the player's houses and hotels are **sold to the bank** at their sell-back prices; the
   proceeds join their cash ("Houses are sold to the bank first").
2. If the creditor is a **player**: cash and all title deeds transfer to them; mortgages transfer
   with the deeds ("Mortgages transfer with the deeds"). Card `1o`: "12 tiles → Naveen".
3. If the creditor is the **bank**: cash goes to the bank and every tile goes to auction, starting
   the next round ("12 tiles → bank auction · Auctions begin next round.").
4. The player is eliminated; their token leaves the board; `1g` replaces their HUD.
5. If fewer than two solvent players remain, the match ends (last player standing) via `3r`
   "Not enough players" with its 10-second countdown and "End now".

---

## 17 · Solo AI

The design gives three tiers and their one-line descriptions:

| Tier | Design copy |
| --- | --- |
| Easy | "buys carefully, never trades" |
| Normal | "buys to build sets, trades when it gains" |
| Hard | "blocks your sets, bids up every auction" |

Fast mode: "Finishes a match in about two minutes — good for testing rules." It skips animations
only; it changes no rule.

### Proposed decision table — **must be confirmed (OQ-8)**

These numbers are **not** in the design. They are proposed so the engine can be written, and are
marked as such in code (`AI_TUNING`, with a comment pointing at OQ-8).

| Parameter | Easy | Normal | Hard |
| --- | --- | --- | --- |
| Cash floor (won't spend below) | 40 % of starting cash | 20 % | 10 % |
| Buys an unowned tile when | cost ≤ cash − floor | same, or it completes/extends a group | always if affordable |
| Bid ceiling | 1.0 × cost | 1.25 × cost | 1.6 × cost, 2.0 × if it blocks the human's set |
| Opens trades | never | when its own net gain ≥ 15 % | when net gain ≥ 5 % or it breaks a rival set |
| Accepts a trade when | value received ≥ 1.2 × given | ≥ 1.0 × | ≥ 0.9 × and no rival set completed |
| Builds when | cash − floor ≥ 2 × house cost | ≥ 1 × house cost | ≥ 1 × house cost, prioritises the group with the highest rent delta |
| Mortgages | only to clear a debt | to clear a debt or to complete a set | aggressively for any positive-EV build |
| Jail | always pays bail if cash allows | pays bail after round cap/2, else rolls | rolls for doubles while rent income is low |

All AI randomness comes from the match RNG stream, so a solo match replays exactly.

---

## 18 · Pass and play

- Setup: player count 2–6, one row per player with an editable name and a colour token; board picker
  allows local boards.
- Handover: a full-screen cover between turns — "Pass the phone to Priya", the player's token at
  120 dp, "I'm Priya, continue", meta "Round 12 · ₹4,200 cash". **Nothing of the board is visible
  behind it.**
- The cover appears at every change of active player, including after an auto-skip, and before the
  first turn.
- Private information (hold cards, the property list) is only rendered after the continue button.
- Auctions in pass-and-play run sequentially on the same device, each bidder behind their own
  handover cover.

---

## 19 · Determinism

```ts
// packages/game-engine/src/rng.ts
export type Rng = { seed: number; cursor: number };            // both integers, both in state
export function nextUint32(r: Rng): { value: number; rng: Rng } // mulberry32, cursor += 1
export function rollDice(r: Rng): { dice: [number, number]; rng: Rng }
export function pick<T>(r: Rng, xs: T[]): { item: T; rng: Rng }
```

Contract:

1. Every random outcome comes from `Rng` held **inside** `MatchState`. `Math.random` is banned in
   the engine and in server match code (enforced by an eslint rule).
2. `apply(state, action)` advances the cursor deterministically. Same `{seed, cursor}` and same
   action sequence ⇒ same state, on any machine, in any order of replay.
3. A match stores `seed` at creation and appends every applied action. Replay =
   `actions.reduce(apply, createMatch(setup))`.
4. Dice: `d1 = 1 + (u32 % 6)`, then a second draw for `d2`. Never one draw split into two.
5. Deck shuffle draws use `pick` over the deck's **active** rules in stored order.
6. Time never enters a random decision. Actions carry `atMs` for timers only, and timer expiry is an
   explicit action, not a time comparison inside the reducer.

---

## 20 · Naming and moderation

- Shipped tile names use Royal Navy / Chennai names only (A2 and its residue table in
  `design-review-resolutions.md`).
- Publish-time filters reject board, tile, deck and rule names that hit the profanity blocklist or
  the trademark list (D5).
- Board names must be unique per author ("Must be unique across your boards."); deck and rule names
  unique per library.

---

## 21 · Edge cases

| # | Situation | Exact resolution |
| --- | --- | --- |
| 1 | Player lands on an unowned tile with cash < cost | Buy is disabled; Pass and Auction remain. No debt is created. |
| 2 | Player declines and auctions are off | Tile stays with the bank; turn continues. |
| 3 | Auction receives no bids | Bank keeps the tile. No further auction this match unless it is landed on again. |
| 4 | Winning bidder's cash is spent by a concurrent action | Bid was validated at accept time and cash is escrowed on each accepted bid; the escrow releases when outbid. |
| 5 | Two players bid the same amount simultaneously | Server order decides; the second is rejected with `E_BID_TOO_LOW`. |
| 6 | Rent owed exceeds cash and net worth | Raise cash opens; when `mortgage + sell + trade` totals still fall short, only Declare bankruptcy remains (the "nothing left to sell" state). |
| 7 | Rent owed to a player who is themselves bankrupt in the same resolution | Debts resolve in the order they were created; a bankrupt creditor's incoming payment joins their estate before it transfers. |
| 8 | Player in jail owns a tile someone lands on | Rent is collected if "Owner still collects rent while held" is on; otherwise nothing. |
| 9 | Third double with no jail tile on the board | Turn ends immediately; no penalty. |
| 10 | Card effect sends a player to jail on a board with no jail tile | Effect is a no-op and the match log records "no jail on this board". |
| 11 | `chooseDice` used then a double is named | Named totals of 2/4/6/8/10/12 are **not** doubles — a chosen total never grants another roll. |
| 12 | Move backward across index 0 | No pass bonus. |
| 13 | `moveAnywhere` onto an owned tile | Full rent is due, as with a normal landing. |
| 14 | `moveAnywhere` onto the start tile | Pass bonus paid only if the rule's `collectPassBonus` is set. |
| 15 | House supply exhausted mid-build of 2 houses | The build action is atomic: if the full selection cannot be satisfied, nothing is built and `E_SUPPLY_EXHAUSTED` is returned. |
| 16 | Hotel built while only 3 houses stand on the tile | Rejected — "Houses before a hotel · 4 per tile". |
| 17 | Even-build on, player tries to put a 2nd house on one tile of a 3-tile group with 1 each | Rejected with the reason "Build evenly is on". |
| 18 | Mortgaging a tile that holds houses | Rejected; the Mortgage list shows such tiles disabled with "sell buildings first". |
| 19 | Mortgage breaks the set while the player is mid-build | Remaining build steps in the same action are rejected; already-placed houses stay. |
| 20 | Redeeming with insufficient cash | Redeem button disabled; no debt is created. |
| 21 | Trade that would leave a player with negative cash | Rejected at validation, both sides. |
| 22 | Trade including a tile with buildings | Rejected; the tile is not selectable. |
| 23 | Trade offer expires while the target is choosing | Offer closes at 60 s; the target's accept is rejected with `E_OFFER_EXPIRED`. |
| 24 | Offer arrives while the target is in a modal | **OQ-2**. Until answered, the server still records the offer and it expires normally. |
| 25 | Turn timer expires during an auction | Auctions have their own clock; the turn clock is paused while an auction is live. |
| 26 | Turn timer expires while raise-cash is open | Turn passes, debt persists, raise-cash reopens at the start of their next turn. Their tiles cannot be taken in the meantime. |
| 27 | Player disconnects mid-turn | Grace 90 s. Then the server auto-plays the minimum legal action each turn until they return. |
| 28 | Host disconnects | Host role transfers to the next seat; `3r` toast "Naveen left the match. Priya is now host." Match continues. |
| 29 | Host leaves the **lobby** before start | Room closes: "The host closed this room" with "Back to modes". |
| 30 | Only one solvent player remains | Match ends as last-player-standing after the 10 s countdown in `3r`; "End now" skips the wait. |
| 31 | All remaining players disconnect | Match is marked `abandoned` after the last grace expires; no winner; it appears in history as abandoned. |
| 32 | Round cap reached mid-round | The round completes so every player has had equal turns, then the cap resolves. |
| 33 | Two players tie on net worth at the cap | Most tiles → most buildings → lowest seat. |
| 34 | The board's author publishes v4 while a v3 match runs | The running match stays on v3; new matches get v4 (D5). |
| 35 | A published board is unpublished mid-match | Running matches finish; "46 open matches keep running to the end on v3." No new matches. |
| 36 | A tile's deck is deleted from the library after publish | Impossible — a published version carries **copies** of its decks and rules. |
| 37 | Dice-number deck lands on an unassigned total | The deck's fallback applies (default Nothing: "Player lands, no effect."). |
| 38 | A deck has zero active rules | Board-settings error "Every card space has a deck" is satisfied, but the deck contributes nothing; the match log records "empty deck". Flag as a board warning at publish. |
| 39 | Colour group threshold lowered while a match runs | Not possible — rules come from the frozen published version (D1/D5). |
| 40 | Player holds a hold card whose `expires` is "End of round" at round end | Card is discarded at the start of the next round and the match log records it. |
| 41 | `forceTradeAccept` used on a player who cannot pay | The trade is rejected as invalid; the card is **not** consumed. |
| 42 | `zeroCash` used on a player who owes a debt | Cash goes to 0; the debt stands and raise-cash opens on their turn. |
| 43 | Bankruptcy to the bank with auctions off | Tiles return to the bank unowned; no auction. |
| 44 | Pass-and-play: a player is bankrupt | Their handover cover is skipped entirely; the device goes to the next solvent player. |
| 45 | Fast mode in solo | Animations skipped; every rule, timer and RNG draw is unchanged. |
