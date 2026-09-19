# 06 · State machines

> Generated from `Royal Navy 1080 v2.dc.html` — 49 options / 93 screens (Session 9 export) · 19 September 2026.

All machines live in `packages/game-engine`. They are **data**, not classes: a discriminated union
for the state plus a transition function. The server and client run identical copies.

## Match lifecycle

```mermaid
stateDiagram-v2
  [*] --> draft: createMatch(setup)
  draft --> lobby: host publishes the room code
  lobby --> lobby: player joins / leaves / seat colour changes
  lobby --> starting: host presses Start (≥2 players)
  lobby --> closed: host leaves (3r "room closed")
  starting --> live: seeds dealt, seat order fixed, round = 1
  live --> live: turn cycles
  live --> ending: round cap reached OR <2 solvent players
  live --> abandoned: every player past reconnect grace
  ending --> ended: standings computed, persisted
  ended --> [*]
  closed --> [*]
  abandoned --> [*]
```

| State | Who may act | Persisted |
| --- | --- | --- |
| `draft` | host only | Redis |
| `lobby` | host (start, kick), players (leave, colour) | Redis + room code |
| `starting` | nobody (server transition) | Redis |
| `live` | the actor, plus any bidder during an auction | Redis, log appended |
| `ending` | nobody | Redis |
| `ended` | nobody | Postgres |
| `abandoned` | nobody | Postgres, `end_reason = 'abandoned'` |
| `closed` | nobody | not persisted |

## Turn

```mermaid
stateDiagram-v2
  [*] --> turnStart
  turnStart --> jailChoice: player in jail
  turnStart --> preRoll: not in jail
  jailChoice --> preRoll: released (bail / double / pass card / 3 rounds served)
  jailChoice --> turnEnd: stays in jail
  preRoll --> rolling: ROLL
  preRoll --> preRoll: BUILD / SELL / MORTGAGE / REDEEM / TRADE
  rolling --> moving: dice resolved (server RNG)
  moving --> landing: token arrives
  landing --> decision: unowned tile (buy / pass / auction)
  landing --> payment: owned tile, rent due
  landing --> cardDraw: card space
  landing --> cornerEffect: corner space
  landing --> postRoll: nothing to resolve
  decision --> auction: PASS with auctions on
  decision --> postRoll: BUY or PASS with auctions off
  payment --> postRoll: paid in full
  payment --> raiseCash: cash < amount
  cardDraw --> postRoll: effect applied
  cornerEffect --> jail: sent to jail
  cornerEffect --> postRoll: other corner effects
  auction --> postRoll: auction resolved
  raiseCash --> postRoll: debt cleared
  raiseCash --> bankrupt: DECLARE_BANKRUPTCY
  postRoll --> preRoll: doubles rolled (<3) 
  postRoll --> jail: third double, board has jail
  postRoll --> turnEnd: no extra roll
  jail --> turnEnd
  bankrupt --> turnEnd
  turnEnd --> [*]
```

Guards:

| Transition | Guard |
| --- | --- |
| `preRoll → rolling` | actor's turn, no unresolved debt |
| `preRoll → preRoll` (side actions) | no unresolved debt; action's own validation passes |
| `postRoll → preRoll` | `dice[0] === dice[1]` and `doublesThisTurn < 3` and the roll was not `chooseDice` |
| `payment → raiseCash` | `amount > cash` |
| `raiseCash → postRoll` | `cash ≥ debt` after the payment |
| any → `turnEnd` on timer | server turn clock expiry (see `05-game-rules` §14) |

## Auction

```mermaid
stateDiagram-v2
  [*] --> opening
  opening --> bidding: minBid set, clock = board bid timer, bidders = solvent players
  bidding --> bidding: BID accepted (clock resets, escrow moves)
  bidding --> bidding: PASS (bidder removed)
  bidding --> resolving: clock expires OR one bidder left with a leading bid
  bidding --> noSale: every bidder passed with no bid
  resolving --> [*]: winner pays bank, deed transfers
  noSale --> [*]: bank keeps the tile
```

- `BID` validation: `amount ≥ max(minBid, leading + 1)`, `amount ≤ bidder.cash`, bidder not passed,
  bidder has no unresolved debt.
- Escrow: the leading bid is held out of the bidder's spendable cash and released on being outbid.
- Bankruptcy auctions queue one tile at a time and start the round after the estate resolves
  ("Auctions begin next round").
- The turn clock is **paused** while an auction is live.

## Trade

```mermaid
stateDiagram-v2
  [*] --> composing: opener builds the offer (1p)
  composing --> offered: SEND (valid both sides)
  composing --> [*]: CANCEL
  offered --> reviewing: target opens it
  offered --> expired: 60s elapsed
  offered --> queued: target is in another modal (OQ-2)
  queued --> reviewing: target opens Pending offers
  queued --> expired: 60s elapsed
  reviewing --> accepted: ACCEPT (revalidated)
  reviewing --> rejected: REJECT
  reviewing --> expired: 60s elapsed
  accepted --> [*]: assets swap, events emitted
  rejected --> [*]
  expired --> [*]
```

Revalidation at accept time is mandatory — the board may have changed since the offer was made
(`E_TRADE_INVALID`).

## Raise cash

```mermaid
stateDiagram-v2
  [*] --> open: debt created (amount, creditor)
  open --> open: route switch (mortgage / sell / trade)
  open --> open: asset selected → raised recomputed
  open --> paying: PAY enabled (cash + raised ≥ debt)
  paying --> [*]: debt cleared
  open --> exhausted: no eligible assets on any route
  exhausted --> bankrupt: DECLARE_BANKRUPTCY
  open --> bankrupt: DECLARE_BANKRUPTCY
  bankrupt --> [*]
```

The screen cannot be dismissed while `open`; Android back is a no-op.

## Bankruptcy

```mermaid
stateDiagram-v2
  [*] --> selling: sell all houses and hotels to the bank
  selling --> toCreditor: creditor is a player
  selling --> toBank: creditor is the bank
  toCreditor --> eliminating: cash + deeds (with mortgages) transfer
  toBank --> queueing: deeds queued for auction next round
  queueing --> eliminating
  eliminating --> checkPlayers: token removed, 1g replaces the HUD
  checkPlayers --> [*]: ≥2 solvent players remain
  checkPlayers --> matchEnding: <2 solvent players
  matchEnding --> [*]: 3r countdown then ended
```

## Reconnect

```mermaid
stateDiagram-v2
  [*] --> connected
  connected --> disconnected: socket close
  disconnected --> reconnecting: backoff 1,2,4,8,16s
  reconnecting --> connected: match:sync accepted
  reconnecting --> manual: 5 attempts failed
  manual --> reconnecting: RETRY pressed
  disconnected --> graceExpired: 90s without a socket
  graceExpired --> connected: late rejoin into the live match
  graceExpired --> endedWhileAway: match ended in the meantime (3r)
  endedWhileAway --> [*]: See result / Back to modes
```

While `disconnected` or `reconnecting` the client shows `3k` and blocks every action. The server
auto-plays the seat once grace expires.

## Board builder (client-only)

```mermaid
stateDiagram-v2
  [*] --> editing
  editing --> editing: place / move / unassign a tile, edit settings
  editing --> sizeConfirm: shrink requested (2a5)
  sizeConfirm --> editing: Cancel
  sizeConfirm --> editing: Shrink board (tiles unassigned)
  editing --> validating: Save board
  validating --> editing: errors present (Save blocked)
  validating --> saved: no errors (warnings allowed)
  saved --> publishGate: Publish pressed
  publishGate --> publishGate: step 1 slots → step 2 board errors → step 3 rule errors
  publishGate --> publishing: all steps clear
  publishGate --> editing: Fix pressed on any step
  publishing --> published: version frozen on the server
  published --> unpublishConfirm: Unpublish pressed
  unpublishConfirm --> published: Keep published
  unpublishConfirm --> saved: Unpublish (slot freed, running matches continue)
```

The gate order is exactly **slots filled → board errors → rule errors → publish**, with
"Each step unlocks the next" and steps after the first failing step dimmed.

## Rule lab (client-only)

```mermaid
stateDiagram-v2
  [*] --> reading
  reading --> editing: any control changed (preset becomes "Custom")
  editing --> editing: further changes
  editing --> validating: Save rules
  validating --> editing: rule errors (Save blocked)
  validating --> reading: saved (warnings allowed)
  reading --> readOnly: opened from a lobby or board detail (3l)
  readOnly --> [*]: Close
```

Rule-lab validation checks **rules only**; tiles, slots and colour-set counts are checked in Board
settings ("This panel only checks the rules.").
