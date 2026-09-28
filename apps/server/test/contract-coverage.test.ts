// D5 · the gate's first criterion: "contract tests pass for every documented endpoint and event".
//
// This file is the inventory. It does not exercise behaviour — the per-route tests do that — it asserts
// that the **set** of routes the server registers and the **set** of events it can emit are exactly what
// `docs/07-api-contract.md` describes, no more and no less, with every difference named and explained
// here rather than discovered later.
//
// Why an inventory test and not a checklist in a document: a route added without a test, or a documented
// route quietly dropped, is invisible to every other test in the repository. This one fails.
//
// Each entry below is one row of `docs/07`, in the order the contract lists them.

import type { FastifyInstance } from "fastify";
import { CLIENT_EVENTS, SERVER_EVENTS } from "@royal-navy/shared/events/match";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { parseEnv } from "../src/config/env.js";
import { testEnv } from "./helpers.js";

/** A documented endpoint, and whether this phase is expected to have implemented it. */
interface Endpoint {
  method: "GET" | "POST" | "PATCH";
  url: string;
  /** The task that owns it. */
  owner: string;
  /** When absent, the route must be registered. When present, it must NOT be, and this says why. */
  deferred?: string;
}

const ENDPOINTS: Endpoint[] = [
  // ─── Auth (D2) ───────────────────────────────────────────────────────────────────────────────────
  { method: "POST", url: "/auth/signup", owner: "D2" },
  { method: "POST", url: "/auth/signin", owner: "D2" },
  { method: "POST", url: "/auth/refresh", owner: "D2" },
  { method: "POST", url: "/auth/signout", owner: "D2" },
  { method: "GET", url: "/me", owner: "D2" },
  { method: "PATCH", url: "/me", owner: "D2" },
  { method: "POST", url: "/me/password", owner: "D2" },
  {
    method: "POST",
    url: "/me/delete",
    owner: "G1",
    deferred: "OQ-7: deletion semantics contradict D5's board-version retention; G1 is BLOCKED-BY-OQ:OQ-7",
  },
  { method: "GET", url: "/me/export", owner: "G1", deferred: "`3p` Download my data; G1 is BLOCKED-BY-OQ:OQ-7" },

  // ─── Catalogue (D3) ──────────────────────────────────────────────────────────────────────────────
  { method: "GET", url: "/catalogue", owner: "D3" },
  { method: "GET", url: "/catalogue/:boardVersionId", owner: "D3" },
  { method: "GET", url: "/catalogue/:boardVersionId/rules", owner: "D3" },
  { method: "POST", url: "/catalogue/:boardVersionId/report", owner: "D3" },

  // ─── Boards (D3) ─────────────────────────────────────────────────────────────────────────────────
  { method: "GET", url: "/boards/published", owner: "D3" },
  { method: "POST", url: "/boards/publish", owner: "D3" },
  { method: "POST", url: "/boards/:boardId/unpublish", owner: "D3" },
  { method: "GET", url: "/boards/:boardId/impact", owner: "D3" },
  {
    method: "GET",
    url: "/boards/:boardId/analytics",
    owner: "G4",
    deferred: "`3u` Board analytics; D3's acceptance excludes it explicitly and G4 owns it",
  },
  // Not in `docs/07`'s route table at all — it comes from `2a`, and that gap is in design-concerns.md.
  { method: "GET", url: "/boards/name-available", owner: "D3" },

  // ─── Matches (D4) ────────────────────────────────────────────────────────────────────────────────
  { method: "POST", url: "/matches", owner: "D4" },
  { method: "POST", url: "/matches/join", owner: "D4" },
  { method: "GET", url: "/matches/:matchId", owner: "D4" },
  { method: "POST", url: "/matches/:matchId/leave", owner: "D4" },
  { method: "GET", url: "/matches/:matchId/log", owner: "D4" },
  { method: "GET", url: "/matches/:matchId/result", owner: "D4" },
  {
    method: "GET",
    url: "/history",
    owner: "G2",
    deferred: "`3h` Match history; OQ-9 decides whether local matches appear, and G2 is BLOCKED-BY-OQ:OQ-9",
  },
  {
    method: "GET",
    url: "/leaderboard",
    owner: "G2",
    deferred: "`3d` Leaderboard; OQ-9 decides whether solo and pass-and-play count, and G2 is BLOCKED-BY-OQ:OQ-9",
  },

  // ─── Social and moderation (G3) ──────────────────────────────────────────────────────────────────
  { method: "GET", url: "/friends", owner: "G3", deferred: "`3g` Friends; no phase-D task covers it" },
  { method: "POST", url: "/friends/invite", owner: "G3", deferred: "`3g` Friends; no phase-D task covers it" },
  { method: "POST", url: "/friends/:userId/remove", owner: "G3", deferred: "`3g` Friends; no phase-D task covers it" },
  {
    method: "POST",
    url: "/players/:userId/block",
    owner: "G3",
    deferred: "`3q` Report and block; G3 is BLOCKED-BY-OQ:OQ-10",
  },
  {
    method: "POST",
    url: "/players/:userId/report",
    owner: "G3",
    deferred: "`3q` Report and block; G3 is BLOCKED-BY-OQ:OQ-10",
  },
];

/**
 * Server events with no emitter, and why. Every other event in `SERVER_EVENTS` must be emitted by name
 * somewhere under `src/`, or it is a payload shape nothing can ever send.
 */
const UNEMITTED_EVENTS: Record<string, string> = {
  "board:versionChanged":
    "a publish-time notice to a host sitting in `1b` setup, so F4's publish path owns it; OQ-3 also records that its toast has no designed frame",
};

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? sourceFiles(path) : path.endsWith(".ts") ? [path] : [];
  });
}

describe("every endpoint docs/07 documents", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp(parseEnv(testEnv()));
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  for (const endpoint of ENDPOINTS.filter((candidate) => candidate.deferred === undefined)) {
    it(`is registered: ${endpoint.method} ${endpoint.url} (${endpoint.owner})`, () => {
      expect(app.hasRoute({ method: endpoint.method, url: endpoint.url })).toBe(true);
    });
  }

  for (const endpoint of ENDPOINTS.filter((candidate) => candidate.deferred !== undefined)) {
    it(`is deferred, and stays deferred: ${endpoint.method} ${endpoint.url} (${endpoint.owner})`, () => {
      // Asserting the *absence* on purpose. When the owning task implements it, this fails and whoever
      // does the work moves the row up — so the inventory cannot drift out of date silently.
      expect(app.hasRoute({ method: endpoint.method, url: endpoint.url })).toBe(false);
      expect(endpoint.deferred!.length).toBeGreaterThan(0);
    });
  }

  // Routes the server serves that `docs/07`'s tables do not list. Each is accounted for; the assertions
  // below are what stop a fourth appearing unnoticed.
  const OFF_CONTRACT: { method: "GET" | "POST"; url: string; why: string }[] = [
    { method: "GET", url: "/healthz", why: "infrastructure, docs/09's boot sequence — not contract surface" },
    { method: "GET", url: "/readyz", why: "infrastructure, docs/09's boot sequence — not contract surface" },
    {
      method: "POST",
      url: "/auth/forgot",
      why: "`1a` has it and docs/07's Auth table does not; D2 ships it as a logged no-op pending OQ-39 (how a reset link is delivered on a free tier)",
    },
  ];

  for (const route of OFF_CONTRACT) {
    it(`is off-contract and accounted for: ${route.method} ${route.url}`, () => {
      expect(app.hasRoute({ method: route.method, url: route.url })).toBe(true);
      expect(route.why.length).toBeGreaterThan(0);
    });
  }

  it("serves nothing beyond the documented and the accounted-for", () => {
    // Fastify gives no public list of registered routes, so this counts the leaves of `printRoutes`'s
    // tree and pins the number. Adding or removing any route changes it and fails here, which sends
    // whoever did it to one of the two lists above — the whole point of an inventory.
    //
    // It is pinned rather than derived because the tree is not one line per route: `GET /me` and
    // `PATCH /me` share a leaf, so 25 accounted-for routes render as 24 markers. **To update it: add
    // your route to ENDPOINTS or OFF_CONTRACT first, then set this to the new count.**
    const REGISTERED_LEAVES = 24;
    const leaves = app.printRoutes({ commonPrefix: false }).match(/\((?:GET|POST|PATCH|PUT|DELETE)/g) ?? [];

    expect(leaves.length).toBe(REGISTERED_LEAVES);
    // And the lists really are what that number accounts for, so the two cannot drift apart unnoticed.
    expect(ENDPOINTS.filter((endpoint) => endpoint.deferred === undefined).length + OFF_CONTRACT.length).toBe(25);
  });
});

describe("every socket event docs/07 documents", () => {
  // Relative to this file, not to the working directory: vitest can be run from the repo root or from
  // apps/server, and the scan must find the same sources either way.
  const files = sourceFiles(join(dirname(fileURLToPath(import.meta.url)), "..", "src"));
  const source = files.map((file) => readFileSync(file, "utf8")).join("\n");

  it("has a schema for each of the seven client events and seventeen server events", () => {
    // The names themselves are pinned in packages/shared/test/events.test.ts against docs/07's tables;
    // this asserts the server is built against the same two sets and has not grown a private one.
    expect(Object.keys(CLIENT_EVENTS)).toHaveLength(7);
    expect(Object.keys(SERVER_EVENTS)).toHaveLength(17);
  });

  for (const event of Object.keys(SERVER_EVENTS)) {
    const reason = UNEMITTED_EVENTS[event];
    it(reason ? `is deliberately not emitted: ${event}` : `is emitted somewhere: ${event}`, () => {
      // A quoted event name in the server source. Crude on purpose: anything cleverer would need the
      // emit sites registered in a list, which is the thing that goes stale.
      const emitted = source.includes(`"${event}"`);
      expect(emitted).toBe(reason === undefined);
    });
  }

  for (const event of Object.keys(CLIENT_EVENTS)) {
    it(`is handled: ${event}`, () => {
      expect(source.includes(`"${event}"`)).toBe(true);
    });
  }
});
