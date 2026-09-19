# 10 · Testing strategy

> Generated from `Royal Navy 1080 v2.dc.html` — 49 options / 93 screens (Session 9 export) · 19 September 2026.

All tooling free: Vitest (engine, shared, server unit), Jest + React Native Testing Library
(mobile components), Supertest (HTTP), socket.io-client (socket integration), Maestro (Android E2E),
GitHub Actions free tier for unit and integration only — never for the release build.

## Layers and gates

| Layer | Tool | Scope | Gate |
| --- | --- | --- | --- |
| Unit — engine | Vitest | `packages/game-engine` | **≥ 90 % lines, ≥ 85 % branches**, 0 skipped |
| Unit — shared | Vitest | formatters, schemas, pricing | ≥ 90 % lines |
| Property / fuzz | Vitest + fast-check | invariants over generated matches | 0 counterexamples in 500 runs |
| Component | Jest + RNTL | every component in `03-design-system.md` | each has render + states + a11y test |
| Screen | Jest + RNTL | every screen doc's acceptance criteria | each criterion has a test or a documented manual step |
| Integration | Vitest + Supertest + socket client | API + Postgres + Redis | every route and socket event has a happy path + one failure |
| E2E | Maestro | the 11 flows in `docs/flows/` | all pass on Pixel_6_API_34 |
| Responsive | Maestro + screenshots | the matrix below | no clipping, no overlap, no target < 44 dp |
| Performance | manual + Perfetto | budgets below | all within budget |

## Unit tests the engine must have

One file per rules module. Minimum required cases:

**pricing.ts** — 2.5 % of ₹1,400 = ₹35 · 5/10/20/30 % ladder · 50 % mortgage · 70 % sell ·
percent-from-amount 300/1400 → 21 % · rounding to ₹5 · floor ₹5 · clamp at 500 % · cost ₹10 minimum.

**sets.ts** — All-tiles threshold · Majority on 5 (=3) and on 4 (=3, plus the warning) · Custom
rejecting 2 of 5 · per-group override wins · mortgaged tile excluded when "Mortgage breaks the set" ·
set rent ×2 applies to base rent only · below-threshold group is a save-blocking error.

**rent.ts** — unowned = 0 · mortgaged = 0 · base · base ×2 with set · 1–4 houses · hotel ·
utility ×4/×10/×16/×20 with roll 7 · owner in jail with the toggle both ways · rentWaiver ·
rentMultiplier ×2 · rent during auction = 0.

**build.ts** — requires set · even-build on/off · 4 houses before a hotel · hotel returns 4 houses ·
supply 32/12 exhaustion is atomic · cannot build on a mortgaged tile · cost deducted exactly.

**mortgage.ts** — 50 % payout · 10 % interest on redeem · cannot mortgage with buildings ·
redeem blocked without cash · mortgage travels with a traded deed.

**auction.ts** — min bid = cost from a decline · increment validation · clock reset per bid ·
escrow and release · all-pass no-sale keeps the tile with the bank · auctions-off path · bankruptcy
auction queued for the next round · turn clock paused during an auction.

**trade.ts** — bundle validation both sides · buildings not tradeable · mortgaged tile tradeable ·
60 s expiry · revalidation at accept · unequal deals legal · set broken is legal.

**jail.ts** — entry charge ₹100 to bank · bail ₹5,000 · release on double · release after 3 rounds ·
jail pass card · build/sell/mortgage/trade blocked while held · rent collected when the toggle is on ·
`sendToJail` no-op on a board with no jail.

**decks.ts** — shuffle draws with replacement · My Order cursor advances and wraps, per match not per
player · Dice Number matching · each of the three fallbacks · empty deck logs and does nothing.

**turn.ts** — doubles grant a re-roll · three doubles → jail · three doubles with no jail ends the
turn · chosen dice never count as doubles · pass bonus on crossing index 0 · no bonus going backward ·
teleport bonus only with the flag.

**bankruptcy.ts** — buildings sold first · to creditor with mortgages transferring · to bank with
auction queue · elimination · <2 players ends the match · creditor themselves bankrupt in the same
chain.

**endgame.ts** — net worth formula including mortgaged at half · cap resolution completes the round ·
tie-break order tiles → buildings → seat · last-player-standing.

**ai/** — each tier's buy, bid ceiling, trade accept margin and build threshold, all from the
`AI_TUNING` table, with a test asserting the table is the *only* source of those numbers.

## Property and fuzz tests

```ts
// 500 seeded matches, random legal actions, invariants after every step
fc.assert(fc.property(fc.integer(), seed => {
  let s = createMatch({ ...setup, seed });
  for (let i = 0; i < 400 && s.phase === 'live'; i++) {
    const a = pickLegalAction(s);           // never an illegal action
    s = apply(s, a).state;
    expect(checkInvariants(s)).toEqual([]);
  }
}), { numRuns: 500 });
```

Required invariant properties: cash never negative · cash conservation against the ledger · house and
hotel supply conservation · no tile owned by a bankrupt player · `rng.cursor` monotonic · log
append-only · **deterministic replay**: `replay(setup, actions)` hash equals the live hash for 200
seeded matches.

## Integration tests

| Group | Cases |
| --- | --- |
| Auth | signup, signin, refresh rotation, reuse of a revoked refresh token is rejected, delete flow |
| Catalogue | list, search with no results, sort by played/new, detail, rules, report |
| Publish | valid publish, errors block with panel-shaped details, name filters, 4th slot rejected, republish creates v2, unpublish frees the slot and keeps the row |
| Match REST | create + room code, join by code, join a closed room, full sync, log filters, result shape |
| Socket ordering | 4 clients, 200 interleaved actions, every client converges on the same hash |
| Stale seq | client sends an old seq → `E_STALE_SEQ` → full state → converges |
| Reconnect | drop mid-turn, reconnect within grace, reconnect after grace, auto-play applied in between, ended-while-away |
| Turn clock | expiry auto-rolls, expiry with an open debt passes the turn, clock paused during an auction |
| Auction | two clients bidding, simultaneous equal bids, escrow release, no-sale |
| Rate limits | 11th auth request in a minute is 429 |
| Authorisation | acting for another player, acting out of turn, acting in a match you left |

Every integration test runs against the Docker Compose Postgres and Redis, in a transaction rolled
back per test where possible, and with a Redis key prefix per worker.

## Flow / E2E (Maestro)

One flow file per `docs/flows/*.md`:
`create-join.yaml`, `turn.yaml`, `auction.yaml`, `trade.yaml`, `raise-cash.yaml`,
`bankruptcy.yaml`, `board-builder.yaml`, `rule-lab.yaml`, `reconnect.yaml`,
`account-privacy.yaml`, `pass-and-play.yaml`.

Plus three scripted full matches, run with `EXPO_PUBLIC_ENV=development` and Fast mode:
1. **Solo, 3 AI, Classic 40 tiles, 20 rounds** — must reach the result screen.
2. **Pass and play, 4 players, Chennai 16 tiles** — handover cover asserted at every change of actor.
3. **Online 4-player** — two emulators + two headless socket clients, one disconnect and reconnect,
   one bankruptcy, one auction, one trade.

## Responsive matrix

Pass criteria for every cell: no clipped text, no overlapping elements, no tap target under 44 dp,
every scroll region reachable, no horizontal scroll.

| Device / width | Portrait | Landscape | Font 100 % | Font 130 % |
| --- | --- | --- | --- | --- |
| 360 × 640 (small, API 26) | required | required | required | required |
| 360 × 800 (Pixel 6, API 34) | required | required | required | required |
| 412 × 915 (large phone) | required | required | required | required |
| 600 × 960 (7" tablet) | required | required | required | — |
| 800 × 1280 (10" tablet) | required | required | required | — |

Screens that must be in every cell: `1c` HUD, `1d` raise cash, `2a` builder (both sizes), `1x` tile
editor, `2b` result, `1n` a decision card, `1e` catalogue. *(A 130 % HUD reference frame is
**OQ-4**.)*

## Platform tests

| Case | Expectation |
| --- | --- |
| Android API 26, 28, 30, 33, 34 | App launches, fonts render, no crash on gradients |
| Low-RAM device (1 GB, `adb shell am set-inactive`) | No OOM on the 40-tile board; map recycles tiles |
| Background / foreground mid-turn | Socket reconnects, state syncs, no duplicate action sent |
| Airplane mode mid-turn | `3k` overlay; on restore, sync and continue |
| Process death during a match | Cold start restores into the live match via `match:sync` |
| Permission denial | None requested — assert the app requests nothing at runtime |
| Battery saver / reduced animations | `motion.*` collapses to 0 ms, no broken layout |
| Locale with a different digit separator | Money always renders Indian grouping with ₹ |

## Performance budgets

| Metric | Budget | How measured |
| --- | --- | --- |
| Cold start to splash | ≤ 1.5 s | `adb shell am start -W` |
| Splash to modes (warm session) | ≤ 800 ms | in-app trace |
| Frame time, board pan/zoom at 40 tiles | ≥ 55 fps average, no frame > 32 ms | Perfetto |
| Token hop animation | 260 ms per tile, no dropped frames | Perfetto |
| Memory ceiling in a 6-player match | ≤ 250 MB PSS | `adb shell dumpsys meminfo` |
| Socket action round trip (local) | ≤ 120 ms p95 | server metrics + client timestamp |
| `apply()` per action | ≤ 2 ms p95 on a 40-tile 6-player state | Vitest bench |
| APK size | ≤ 40 MB | `ls -l` on the release APK |

## Bug workflow

Severity:

| Level | Definition | Response |
| --- | --- | --- |
| Sev-1 | Data loss, match cannot continue, crash on launch, money wrong | Stop feature work; fix first |
| Sev-2 | A documented rule behaves wrongly, a screen unusable on a supported device | Fix within the phase |
| Sev-3 | Visual deviation from the design, wrong copy, minor state glitch | Fix before the phase gate |
| Sev-4 | Cosmetic or an improvement idea | Log only |

Reproduction template (`docs/bug-log.md` row):

```
| ID | Sev | Screen/Rule | Steps | Expected (doc ref) | Actual | Seed | Build | Status | Fix commit |
```

A rules bug **must** include the match seed and action list — with the seeded RNG that is a complete
reproduction. Loop: reproduce with a failing test → minimal fix → the test passes → run the full
engine suite → add the case to the edge-case table if it was missing → close with the fix commit.

## Release gates

A phase is not done until its gate passes. Gates are tasks in `TASKS.md` (A8, B12, …).

| Phase | Gate |
| --- | --- |
| A — skeleton | App launches on the emulator, splash → modes, server `/healthz` green, CI runs unit tests |
| B — design system | Every component in `03-design-system.md` exists with tests; a token-lint rule fails on any literal hex or px in screen code |
| C — engine | Engine coverage ≥ 90 %, every rules module's required cases present, property tests 500 runs clean, deterministic replay proven |
| D — content builders | A board can be built, validated, saved and published locally; validator parity between client and server proven by a shared test vector file |
| E — online play | Four clients converge over 200 interleaved actions; reconnect, turn clock and auction integration tests pass |
| F — offline modes | Scripted solo and pass-and-play matches complete; handover asserted; AI tiers behave per the `AI_TUNING` table |
| G — account, social, moderation | Account deletion path works end to end; report and block enforced server-side |
| H — polish and release | Responsive matrix clean, performance budgets met, no open Sev-1/2, signed APK verified on emulator + device |
