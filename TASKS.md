# TASKS.md — Royal Navy build plan

> Generated from `Royal Navy 1080 v2.dc.html` — 49 options / 93 screens (Session 9 export) · 19 September 2026.

8 phases, 39 tasks. Work top to bottom; take the first unchecked task whose dependencies are all
checked. Every phase ends with a verification gate that must pass before the next phase starts.

**Blocked tasks.** A task marked `BLOCKED-BY-OQ:<id>` cannot start until that question in
`docs/OPEN-QUESTIONS.md` is answered by the owner. No phase gate passes with a blocked task inside
it unchecked.

Effort is in ideal solo days for a developer new to React Native.

---

## Phase A · Skeleton (5 tasks)

- [x] **A1 | Monorepo and tooling** | depends-on: — | files: `pnpm-workspace.yaml`, `package.json`, `tsconfig.base.json`, `.editorconfig`, `.gitignore` | acceptance: `pnpm install` succeeds; `pnpm -r typecheck` passes on empty packages; Node 20 pinned via `.nvmrc` | tests: CI job runs install + typecheck | effort: 0.5
- [x] **A2 | Expo app shell** | depends-on: A1 | files: `apps/mobile/*`, `app.json`, `apps/mobile/app/_layout.tsx` | acceptance: Expo SDK 51 app boots on Pixel_6_API_34 and renders a placeholder route; TypeScript strict on | tests: RNTL smoke test renders the root | effort: 1
- [x] **A3 | Fastify + Socket.IO server shell** | depends-on: A1 | files: `apps/server/src/index.ts`, `apps/server/src/plugins/*` | acceptance: `GET /health` returns 200; a socket client connects and receives `hello` | tests: Supertest on `/health`; socket connect test | effort: 1
- [x] **A4 | Docker Compose: Postgres 16 + Redis 7** | depends-on: A3 | files: `docker-compose.yml`, `.env.example`, `docs/09-server-config.md` cross-check | acceptance: `docker compose up` gives a reachable DB and Redis; the server connects on boot and logs both | tests: integration test opens a DB session and a Redis ping | effort: 0.5
- [x] **A5 | GATE: skeleton verified** | depends-on: A2, A3, A4 | files: `docs/bug-log.md` (created) | acceptance: app boots on the emulator, server is up, both data stores connected, CI green, `README.md` steps followed from a clean clone by the author | tests: the full CI pipeline | effort: 0.5

## Phase B · Design system and navigation (5 tasks)

- [x] **B1 | Tokens** | depends-on: A5 | files: `packages/shared/src/tokens.ts` | acceptance: every colour, type, spacing, radius, shadow, motion and z-index value in `docs/02-design-tokens.md` is exported and typed; no hard-coded hex anywhere else in the repo (lint rule) | tests: snapshot test of the token object; ESLint rule `no-raw-color` | effort: 1
- [x] **B2 | Baloo 2 font bundling** | depends-on: A2 | files: `apps/mobile/assets/fonts/*`, font loading in `_layout.tsx` | acceptance: weights 600/700/800 render offline; no FOUT after splash | tests: rendered text style assertion | effort: 0.5
- [x] **B3 | Core components** | depends-on: B1, B2 | files: `apps/mobile/src/ui/*` | acceptance: every component in `docs/03-design-system.md` exists with its documented props, states and dp sizes: `ScreenFrame`, `Button` variants, `Card`, `SettingRow`, `ToggleRow`, `StepperRow`, `Segmented`, `ChipRow`, `Input`, `Toast`, `Dialog`, `BottomSheet`, `SectionLabel`, `EmptyState`, `Skeleton`, `ImageSlot` | tests: RNTL render test per component per state; 44dp minimum assertion | effort: 3
- [x] **B4 | expo-router route tree** | depends-on: B3 | files: `apps/mobile/app/**` | acceptance: every route in `docs/04-navigation-map.md` exists with its params and guard; Android back matches the documented behaviour per route, including the blocking screens | tests: navigation tests for guards, back behaviour and the four deep links | effort: 2
- [x] **B5 | GATE: design system verified** | depends-on: B3, B4 | files: — | acceptance: a storybook-style gallery route renders every component; `/design-check` finds no deviation; all four deep links resolve | tests: gallery snapshot; deep-link tests | effort: 0.5

## Phase C · Game engine (7 tasks)

- [x] **C1 | State shape and invariants** | depends-on: A1 | files: `packages/game-engine/src/state.ts`, `invariants.ts` | acceptance: the state shape in `packages/game-engine/SPEC.md` is implemented; every invariant is a runnable assertion | tests: unit tests per invariant | effort: 1
- [x] **C2 | Seeded RNG** | depends-on: C1 | files: `packages/game-engine/src/rng.ts` | acceptance: same seed gives the same sequence across platforms; `Math.random` appears nowhere in the package | tests: determinism test over 10,000 draws; lint rule | effort: 0.5
- [x] **C3 | Board generation and movement** | depends-on: C1 | files: `src/board.ts` | acceptance: ring maths `2r + 2c − 4`; sizes 16/24/40/custom; wrapping; pass-GO detection — all worked examples in `docs/05-game-rules.md` reproduce | tests: table tests for every documented size and every worked example | effort: 1
- [x] **C4 | Pricing, rent and colour sets** | depends-on: C3 | files: `src/pricing.ts`, `src/sets.ts` | acceptance: percentage pricing with the documented rounding and clamps; variable thresholds; set rent multipliers; `rent now` matches the `1j` examples | tests: table tests from the rulebook; property test that rent is monotonic in buildings | effort: 1.5
- [x] **C5 | Actions reducer** | depends-on: C2, C4 | files: `src/reducer.ts`, `src/actions.ts` | acceptance: buy, pay rent, build, sell, mortgage, redeem, trade, auction, jail, bankruptcy, end turn — every action type validated and applied atomically | tests: ≥ 90% line coverage on the package; one test per edge-case row in the rulebook's table | effort: 3
- [x] **C5a | The five state machines** | depends-on: C5 | files: `src/machines/{turn,auction,trade,bankruptcy,lifecycle}.ts` | acceptance: `docs/06-state-machines.md` implemented as discriminated unions with total transition functions; blocking states declared by the machine; use the `state-machine` skill | tests: one test per legal transition, one per illegal pair, exhaustiveness check, timer-expiry and resync tests per state | effort: 2
- [x] **C6 | Card decks and rule effects** | depends-on: C5 | files: `src/decks.ts`, `src/effects.ts` | acceptance: shuffle / my-order / dice-number draw modes; the fallback rules; the typed effect grammar from `1z` §4 applies correctly, including gated conditions | tests: one test per effect field combination; reshuffle determinism | effort: 1.5
- [x] **C7 | GATE: engine verified** | depends-on: C5, C5a, C6 | files: — | acceptance: ≥ 90% coverage; every edge-case row in `docs/05-game-rules.md` has a passing test; fuzz run of 1,000 seeded matches holds cash conservation and no negative state; two replays of one seed are byte-identical | tests: the property/fuzz suite | effort: 1
- [ ] **C8 | Hold-card play** | depends-on: C7 | files: `packages/game-engine/src/reducer/turn.ts`, `src/rent.ts`, `src/reducer/cards.ts` | acceptance: every "Affects: Me" effect is playable through `USE_CARD` — `rentWaiver`, `rentMultiplier`, `moveAnywhere`, `skipTurn`, `chooseDice`, `clearDebt`, `freeBuild`, `freeRestHouse`; `applyRentEffects` is wired into landing resolution so card effects modify rent last (rulebook §7); a use is consumed per play and the card is discarded at zero | tests: one per effect, including a rent-waived landing and a doubled rent collected; the fuzz suite plays cards | effort: 2 | OQ-20 item 6
- [ ] **C9 | Target-choice action** | depends-on: C8 | files: `packages/game-engine/src/actions.ts`, `src/reducer/*`, `packages/game-engine/SPEC.md` cross-check | acceptance: a `CHOOSE_TARGET` action and its turn stage carry the player a card or a MONEY block is aimed at, so `1z`'s two "one player" money directions and the five "Affects: Another player" effects (`sendToJail`, `zeroCash`, `removeBuilding`, `forceTradeAccept`, double rent paid) become playable; the decision is addressed to one player, never broadcast | tests: one per effect; an illegal-target refusal; edge cases #41 and #42 move into the engine block | effort: 2 | OQ-19 item 2

## Phase D · Data and API (5 tasks)

- [ ] **D1 | Schema and migrations** | depends-on: A4 | files: `apps/server/migrations/*`, `docs/08-database.md` cross-check | acceptance: every table, index and constraint in `docs/08-database.md`; migrations run forward and back cleanly | tests: migration up/down integration test | effort: 1.5 | OQ-6 answered 24 September 2026 (option 2): store `draft` / `published`, derive pending / completed from slot fill and errors, and keep the derived label queryable and indexable (generated column or maintained counter), documented in `docs/08-database.md`
- [ ] **D2 | Auth endpoints** | depends-on: D1 | files: `apps/server/src/routes/auth.ts` | acceptance: register, login, refresh, forgot, password change; tokens as documented; rate limits | tests: Supertest per endpoint including failure codes from `docs/13-error-catalog.md` | effort: 1.5
- [ ] **D3 | Board and catalogue endpoints** | depends-on: D1 | files: `src/routes/boards.ts`, `src/routes/catalogue.ts` | acceptance: publish, unpublish, name availability, catalogue list with sorts and paging, board detail, impact numbers; published versions immutable; publish refuses a board that fails `checkMoveTargets()` (OQ-19 item 6) | tests: Supertest; an immutability test that a publish never mutates an earlier version | effort: 2
- [ ] **D4 | Match REST + socket contract** | depends-on: D1, C5a | files: `src/routes/matches.ts`, `src/sockets/*`, `packages/shared/src/events/*` | acceptance: every event and payload in `docs/07-api-contract.md` behind one shared zod schema used by both sides; rooms per match; spectator redaction enforced server-side; `eventId` and `actionId` idempotency; use the `socket-contract` skill | tests: the eight socket tests in that skill — schema round-trip, both-side malformed-payload refusal, snapshot-before-cards ordering, idempotency, redaction, resync equivalence, stale `lastEventId` | effort: 2.5
- [ ] **D5 | GATE: API verified** | depends-on: D2, D3, D4 | files: — | acceptance: contract tests pass for every documented endpoint and event; seed data loads; a scripted two-client match runs end to end over the real socket | tests: integration suite | effort: 1

## Phase E · Play (7 tasks)

- [ ] **E1 | Match HUD** | depends-on: B5, D5 | files: `apps/mobile/src/screens/match/*` | acceptance: `docs/screens/1c-play-hud.md` reproduced — board first, player strip, cash row, holdings in card and list views; the primary action label table | tests: RNTL per state; layout assertion against the documented order | effort: 3
- [x] **E2 | Board renderer** | depends-on: B3 | files: `src/ui/board/*` | acceptance: ring layout for 16/24/40/custom; zoom 100–400%; tokens, owner pips, houses and hotels; the Fit warning at 40 slots | tests: render tests per size; a tap-target test that selectable tiles are ≥ 44dp or the board is display-only | effort: 2.5
- [ ] **E3 | Turn loop and optimistic actions** | depends-on: E1, D4 | files: `src/match/turn.ts` | acceptance: `docs/flows/turn.md` implemented; optimistic apply with rollback on rejection; doubles; end turn | tests: flow tests including a forced rejection and rollback | effort: 2
- [ ] **E4 | Notification cards** | depends-on: E1 | files: `src/screens/match/cards/*` | acceptance: all seventeen events from `docs/screens/1n-notification-cards.md` through one component; decision versus informational behaviour; the Event cards setting filter | tests: one render test per event; a queue test; a settings-filter test | effort: 2
- [ ] **E5 | Action screens** | depends-on: E3 | files: `src/screens/match/{actions,build,sell,mortgage,redeem,trade,auction}` | acceptance: `1v`, `1u`, `1w`, `1q`, `1r`, `1p`, `1s`, `1t` reproduced, each committing one atomic action | tests: per-screen acceptance criteria as test cases | effort: 4
- [ ] **E6 | Turn timer and expiry** | depends-on: E3 | files: `src/match/timer.ts`, HUD integration | acceptance: server-driven countdown; the expiry default order in `docs/flows/turn.md`; the pause-sheet distinction between online and local | tests: timer expiry tests per open-decision type | effort: 1 | **BLOCKED-BY-OQ:OQ-1** (no designed expiry feedback)
- [ ] **E7 | GATE: play verified** | depends-on: E1, E2, E3, E4, E5 | files: — | acceptance: a scripted four-player match completes over the real server; a pass-and-play match completes; a solo match completes; no console errors; 60fps held during token movement on a Pixel 6 | tests: Maestro E2E scripts for all three modes | effort: 1.5

## Phase F · Builders and solo (6 tasks)

- [ ] **F1 | Tile, deck and rule editors** | depends-on: B5 | files: `src/screens/create/{tiles,decks,rules}/*` | acceptance: `1x`, `1y`, `1z` reproduced including the flat/% switch, the four rule sections and the effect grammar | tests: per-screen acceptance criteria; a round-trip test that a saved rule reloads identically | effort: 4 | **BLOCKED-BY-OQ:OQ-11** (rule and deck locking is undesigned)
- [ ] **F2 | Board builder** | depends-on: F1, E2 | files: `src/screens/create/board/*` | acceptance: `2a` reproduced — map, slot list, assign, settings, rule lab, validation blocks, publish checks | tests: validation table tests; a publish-gate test per check | effort: 4
- [ ] **F3 | Board size** | depends-on: F2 | files: `src/screens/create/board/size.tsx` | acceptance: `2a5` — ring maths, grow without confirm, shrink with confirm, unplaced handling | tests: table tests for 2–11 rows and columns | effort: 1
- [ ] **F4 | Publish and unpublish** | depends-on: F2, D3 | files: `src/screens/create/board/publish.tsx` | acceptance: the four checks; version freeze; the unpublish dialog with live impact numbers; running matches unaffected ; the publish gate runs `checkMoveTargets()` from the engine and blocks on its issues (OQ-19 item 6) | tests: an end-to-end publish → host → unpublish → match-still-running test | effort: 1.5
- [ ] **F4a | Offline and local-mode pass** | depends-on: F4, E7 | files: across `apps/mobile` | acceptance: every area in the `offline-local-mode` skill's must-work table functions with the device offline; every connection-dependent control is visibly disabled with its documented reason; local matches persist after every committed action | tests: the eight local-mode tests in that skill, including kill-and-relaunch resume behind the handover cover | effort: 1.5
- [ ] **F5 | Solo AI** | depends-on: C7, E7 | files: `packages/game-engine/src/ai/*` | acceptance: three tiers with the documented heuristics for buy, bid, trade, build and mortgage; fast mode | tests: 200 seeded solo matches per tier finish without an invariant break; win-rate sanity band per tier | effort: 2.5 | **BLOCKED-BY-OQ:OQ-8** (difficulty numbers are proposed, not confirmed)
- [ ] **F6 | GATE: builders verified** | depends-on: F2, F3, F4, F4a | files: — | acceptance: a board authored from scratch on the device publishes, appears in the catalogue, and hosts a completed match; `/design-check` clean on all builder screens | tests: Maestro author-to-play script | effort: 1

## Phase G · Account, social and analytics (5 tasks)

- [ ] **G1 | Auth, account and privacy screens** | depends-on: B5, D2 | files: `src/screens/{auth,settings}/*` | acceptance: `1a`, `3f`, `3o`, `3p` reproduced including data export and the type-to-confirm deletion | tests: per-screen criteria; an export-file content test | effort: 2.5 | **BLOCKED-BY-OQ:OQ-7** (deletion semantics contradict D5)
- [ ] **G2 | Profile, history and leaderboard** | depends-on: B5, D3 | files: `src/screens/profile/*` | acceptance: `3e`, `3h`, `3d` reproduced with their empty, loading and offline states | tests: per-screen criteria | effort: 2 | **BLOCKED-BY-OQ:OQ-9** (do local matches count?)
- [ ] **G3 | Friends, report and block** | depends-on: G1 | files: `src/screens/social/*` | acceptance: `3g`, `3q` reproduced including presence over the socket and the 6s undo | tests: per-screen criteria; a block-then-undo integration test | effort: 2 | **BLOCKED-BY-OQ:OQ-10** (board reporting has no sheet)
- [ ] **G4 | Board analytics** | depends-on: F4, D3 | files: `src/screens/create/board/analytics.tsx` | acceptance: `3u` reproduced — KPIs, chart, most-landed tiles, balance tab, CSV export | tests: per-screen criteria; a CSV content test | effort: 2
- [ ] **G5 | GATE: account verified** | depends-on: G1, G2, G3 | files: — | acceptance: register → play → history → export → delete runs end to end; the privacy deep link resolves; no personal data in logs | tests: E2E account lifecycle script | effort: 1

## Phase H · Hardening and release (4 tasks)

- [ ] **H1 | Resilience: reconnect and interruptions** | depends-on: E7, D4 | files: `src/match/reconnect.ts`, `src/screens/match/interruptions/*` | acceptance: `3k` and `3r` implemented with the documented backoff, 45s hold, resync-by-snapshot and the four interruption states | tests: network-loss integration tests; a resync-idempotency test | effort: 2
- [ ] **H2 | Accessibility and responsive pass** | depends-on: E7, F6, G5 | files: across the app | acceptance: the device × orientation × font-scale matrix in `docs/10-testing-strategy.md` passes; every documented contrast ratio verified; every tap target ≥ 44dp | tests: the responsive matrix suite; an automated contrast check | effort: 2.5 | **BLOCKED-BY-OQ:OQ-4** (no 130% HUD reference frame)
- [ ] **H3 | APK build and signing** | depends-on: H1 | files: `apps/mobile/android/*`, `docs/11-build-and-release.md` cross-check | acceptance: a signed release APK built locally on Windows with free tooling only; keystore documented; version and build number wired to the `3f` build line | tests: install the APK on a clean device and complete a match | effort: 1.5
- [ ] **H4 | GATE: release candidate** | depends-on: H1, H2, H3 | files: `docs/bug-log.md` | acceptance: every phase gate green; performance budgets met (cold start, frame time, memory, socket latency); zero severity-1 or severity-2 bugs open; Android API 26–34 smoke-tested | tests: the full suite plus the platform matrix | effort: 2

---

## Blocked-task summary

| Task | Question | Effect if unanswered |
| --- | --- | --- |
| D1 | OQ-6 | The boards table cannot be finalised; Phase D cannot gate |
| E6 | OQ-1 | Turn expiry ships with no player feedback |
| F1 | OQ-11 | Editing a shared rule silently changes boards that use it |
| F5 | OQ-8 | AI behaviour is unspecified; two developers would differ |
| G1 | OQ-7 | Account deletion contradicts board-version retention |
| G2 | OQ-9 | Leaderboard is farmable, or analytics are incomplete |
| G3 | OQ-10 | Board reporting leads nowhere — a store-compliance risk |
| H2 | OQ-4 | No accessibility reference for the densest screen |

OQ-2, OQ-3 and OQ-5 do not block a task: OQ-2 and OQ-3 add behaviour to E5 and F4 respectively if
answered in the affirmative, and OQ-5's recommendation is what the design already shows.

## Totals

42 tasks · 8 gates · 88 ideal solo days before contingency.

> 39 tasks at generation (19 September 2026); C5a, D4's contract split and F4a added 20 September
> 2026 alongside the `state-machine`, `socket-contract` and `offline-local-mode` skills.
