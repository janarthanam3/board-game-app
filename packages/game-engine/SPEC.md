# packages/game-engine — specification

> Generated from `Royal Navy 1080 v2.dc.html` — 49 options / 93 screens (Session 9 export) · 19 September 2026.

Pure, platform-free TypeScript. No React, no Node stdlib, no I/O, no `Date.now()`, no
`Math.random()`. Everything the engine needs arrives as an argument or lives in state.

## Public surface

```ts
export function createMatch(setup: MatchSetup): MatchState;
export function legalActions(s: MatchState, p: PlayerId): ActionKind[];
export function validate(s: MatchState, a: Action): ValidationResult;
export function apply(s: MatchState, a: Action): ApplyResult;
export function checkInvariants(s: MatchState): InvariantViolation[];
export function netWorth(s: MatchState, p: PlayerId): number;
export function rentFor(s: MatchState, tileIndex: number, diceTotal?: number): number;
export function holdsSet(s: MatchState, p: PlayerId, groupId: GroupId): boolean;
export function thresholdFor(s: MatchState, groupId: GroupId): number;
export function replay(setup: MatchSetup, actions: Action[]): MatchState;
```

`validate` never throws. `apply` throws only if given an action `validate` rejects — callers
validate first.

## State shape

```ts
type MatchState = {
  readonly version: 1;
  id: MatchId;
  mode: 'online' | 'passAndPlay' | 'solo';
  phase: 'draft'|'lobby'|'starting'|'live'|'ending'|'ended'|'abandoned'|'closed';
  board: FrozenBoard;              // a published version, or a local snapshot
  rules: Ruleset;                  // resolved from the board — never editable in-match (D1)
  rng: { seed: number; cursor: number };
  round: number;                   // 1-based
  seatOrder: PlayerId[];
  turn: {
    playerId: PlayerId;
    stage: 'jailChoice'|'preRoll'|'rolling'|'moving'|'landing'|'decision'|'payment'
         | 'cardDraw'|'cornerEffect'|'auction'|'raiseCash'|'postRoll'|'turnEnd';
    doublesThisTurn: number;
    dice: [number, number] | null;
    deadlineMs: number | null;     // set by the server; informational in the engine
  };
  players: Record<PlayerId, PlayerState>;
  tiles: TileState[];              // index-aligned with board.tiles
  bank: { houses: number; hotels: number; finePot: number };
  auction: AuctionState | null;
  offers: TradeOffer[];
  debts: Debt[];
  deckCursors: Record<DeckId, number>;
  log: MatchEvent[];               // append-only, drives 2c and 1n
};

type PlayerState = {
  id: PlayerId; seat: number; name: string; colour: PlayerColour;
  cash: number;
  jail: { in: boolean; roundsHeld: number } ;
  holdCards: HoldCard[];
  skipTurns: number;
  connected: boolean;
  bankrupt: { out: true; round: number; owedTo: PlayerId | 'bank'; amount: number } | null;
  ai: { tier: 'easy'|'normal'|'hard' } | null;
};

type TileState = {
  ownerId: PlayerId | null;
  houses: number;        // 0..4
  hotel: boolean;
  mortgaged: boolean;
  underAuction: boolean;
};
```

`FrozenBoard` and `Ruleset` are the published document: tiles with resolved prices, colour groups
with thresholds, decks with their rules copied in, and the money/rounds/pace settings.

## Action types

```ts
type Action =
  | { kind: 'ROLL'; by: PlayerId; atMs: number }
  | { kind: 'CHOOSE_DICE'; by: PlayerId; total: number; atMs: number }
  | { kind: 'BUY'; by: PlayerId; tileIndex: number; atMs: number }
  | { kind: 'PASS_BUY'; by: PlayerId; tileIndex: number; atMs: number }
  | { kind: 'BID'; by: PlayerId; amount: number; atMs: number }
  | { kind: 'PASS_BID'; by: PlayerId; atMs: number }
  | { kind: 'BUILD'; by: PlayerId; tileIndex: number; what: 'house'|'hotel'; atMs: number }
  | { kind: 'SELL'; by: PlayerId; tileIndex: number; what: 'house'|'hotel'|'property'; atMs: number }
  | { kind: 'MORTGAGE'; by: PlayerId; tileIndexes: number[]; atMs: number }
  | { kind: 'REDEEM'; by: PlayerId; tileIndexes: number[]; atMs: number }
  | { kind: 'OFFER_TRADE'; by: PlayerId; to: PlayerId; give: Bundle; get: Bundle; atMs: number }
  | { kind: 'RESPOND_TRADE'; by: PlayerId; offerId: string; accept: boolean; atMs: number }
  | { kind: 'PAY_DEBT'; by: PlayerId; debtId: string; atMs: number }
  | { kind: 'DECLARE_BANKRUPTCY'; by: PlayerId; atMs: number }
  | { kind: 'USE_CARD'; by: PlayerId; cardId: string; target?: PlayerId; tileIndex?: number; atMs: number }
  | { kind: 'PAY_BAIL'; by: PlayerId; atMs: number }
  | { kind: 'END_TURN'; by: PlayerId; atMs: number }
  | { kind: 'TIMER_EXPIRED'; scope: 'turn'|'auction'|'offer'; atMs: number }
  | { kind: 'PLAYER_DISCONNECTED' | 'PLAYER_RECONNECTED'; playerId: PlayerId; atMs: number };
```

## Reducer contract

1. **Pure.** `apply` returns a new state; it never mutates its argument (structural sharing is fine).
2. **Total.** Every `Action` × every reachable state is defined — either a transition or a
   `ValidationResult` rejection with a code from `13-error-catalog.md`.
3. **Event-emitting.** `ApplyResult = { state, events }`. Events are the only thing the UI and the
   match log read; the UI never diffs state to find out what happened.
4. **Deterministic.** Randomness only via `state.rng`.
5. **No time reads.** `atMs` is data. Expiry is the `TIMER_EXPIRED` action.
6. **Invariant-clean.** `checkInvariants(apply(s,a).state)` must return `[]` for every legal action.

## Invariants (must always hold)

| Name | Assertion |
| --- | --- |
| `cashNonNegative` | every `player.cash ≥ 0` |
| `cashConservation` | Σ player cash + bank.finePot + escrowed bids = Σ all money in − out, tracked by a running ledger total |
| `houseSupply` | `bank.houses + Σ tile.houses = board.houseSupply` (32 on the design board) |
| `hotelSupply` | `bank.hotels + Σ tile.hotel = board.hotelSupply` (12) |
| `buildLimits` | `0 ≤ tile.houses ≤ 4`; `tile.hotel ⇒ tile.houses === 0` |
| `evenBuild` | when the rule is on, within a group `max(houses) − min(houses) ≤ 1` |
| `ownershipUnique` | a tile has at most one owner; a bankrupt player owns nothing |
| `mortgageConsistency` | `tile.mortgaged ⇒ tile.houses === 0 && !tile.hotel` |
| `seatIntegrity` | `seatOrder` is a permutation of `Object.keys(players)` |
| `turnActor` | `turn.playerId` is solvent and connected-or-auto-played |
| `roundMonotonic` | `round` never decreases |
| `auctionExclusive` | at most one live auction; its tile has `underAuction === true` |
| `debtBlocking` | a player with an unresolved debt has no legal action except raise-cash routes and bankruptcy |
| `logAppendOnly` | `log` only grows; existing entries never change |
| `rngMonotonic` | `rng.cursor` never decreases |

## File layout

```
packages/game-engine/src/
  index.ts          public surface only
  state.ts          MatchState and friends
  actions.ts        Action union + type guards
  reducer/          one file per action kind
  rules/            rent.ts, build.ts, mortgage.ts, auction.ts, trade.ts, jail.ts, sets.ts, tax.ts
  decks.ts          draw modes and the fallback rule
  bankruptcy.ts     resolution order
  endgame.ts        net worth, cap, tie-break
  ai/               tier tables + decide(state, playerId)
  rng.ts            mulberry32
  invariants.ts
  pricing.ts        amountFromPercent / percentFromAmount / roundToStep
  events.ts         MatchEvent union — one per notification card in 1n
```

## Testing hooks

- `replay(setup, actions)` for deterministic replay tests.
- `__debug.hash(state)` — stable JSON hash used by the client/server reconciliation check and by
  property tests.
- Fixtures in `packages/game-engine/test/fixtures`: `classic-40.json`, `chennai-16.json`,
  `midgame-4p.json`, `debt-pending.json`, `auction-live.json`. No trademarked names in any fixture.
  They are generated from `test/fixtures/make-fixtures.ts` with `pnpm --filter game-engine fixtures`;
  `test/fixtures.test.ts` asserts each committed file still matches its generator, satisfies every
  invariant and carries no trademarked name.
