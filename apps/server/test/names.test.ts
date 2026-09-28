// The publish-time name filters. docs/07 §Boards ("plus the name filters"), docs/13's
// `E_BOARD_NAME_FILTERED` with `details.kind = 'profanity' | 'trademark'`, docs/09's two list paths.
//
// Both shipped lists are **empty** — their contents are OQ-47 — so these tests supply their own terms.
// That is the point of the exercise: the path exists and is proved, and answering OQ-47 is then a matter
// of filling two files rather than writing code.

import type { FastifyInstance } from "fastify";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { createNameFilter, readList } from "../src/boards/names.js";
import { parseEnv } from "../src/config/env.js";
import { migrateUp } from "../src/db/migrate.js";
import { publishBody, unique } from "./fixtures.js";
import { testEnv } from "./helpers.js";

describe("reading a list file", () => {
  const directory = mkdtempSync(join(tmpdir(), "royal-navy-lists-"));

  it("ignores comments, blank lines and case", () => {
    const path = join(directory, "list.txt");
    writeFileSync(path, "# a comment\n\n  Monopoly \n\nFREE PARKING\n# another\n");

    expect(readList(path)).toEqual(["monopoly", "free parking"]);
  });

  it("treats a missing file as an empty list, so a deployment without lists still boots", () => {
    expect(readList(join(directory, "there-is-no-such-file.txt"))).toEqual([]);
  });

  it("reads the shipped lists, which are empty on purpose until OQ-47 is answered", () => {
    // Relative to the server package, which is where the env's default paths point.
    expect(readList("./config/blocklist.txt")).toEqual([]);
    expect(readList("./config/trademarks.txt")).toEqual([]);
  });
});

describe("matching a name", () => {
  const filter = createNameFilter(["damn"], ["monopoly", "free parking"]);

  it("reports which list a name fell foul of", () => {
    expect(filter.check("Damn Harbour")).toBe("profanity");
    expect(filter.check("Monopoly")).toBe("trademark");
  });

  it("matches a listed phrase inside a longer name", () => {
    expect(filter.check("The Free Parking Special")).toBe("trademark");
  });

  it("ignores case, trailing punctuation and spacing", () => {
    expect(filter.check("  MONOPOLY  ")).toBe("trademark");
    expect(filter.check("Monopoly!")).toBe("trademark");
    expect(filter.check("monopoly.")).toBe("trademark");
  });

  it("does not join across punctuation, so a hyphen defeats it — a known limit (OQ-47)", () => {
    // `mono-poly` normalises to two words, "mono" and "poly", and matches neither. Joining across
    // punctuation would be the alternative and is worse: it would turn "pass-age" into "passage" and
    // refuse innocent names. Deliberate evasion is not something a word list can solve; it is noted in
    // OQ-47 so the owner knows what the list does and does not buy.
    expect(filter.check("Mono-poly")).toBeNull();
  });

  it("passes a clean Chennai name", () => {
    expect(filter.check("Marina Drive")).toBeNull();
    expect(filter.check("Chennai Edition")).toBeNull();
  });

  it("matches whole words only, so an innocent name containing a listed word's letters is fine", () => {
    // The classic false positive: a substring match would refuse this for "damn" never appearing, and
    // would refuse half the catalogue for shorter terms.
    expect(createNameFilter(["ass"], []).check("Passage to Adyar")).toBeNull();
  });

  it("blocks nothing when both lists are empty, which is what ships today", () => {
    const empty = createNameFilter([], []);

    expect(empty.check("Monopoly")).toBeNull();
    expect(empty.sizes).toEqual({ profanity: 0, trademark: 0 });
  });
});

describe("POST /boards/publish applies the filters", () => {
  let app: FastifyInstance;
  let token: string;

  beforeAll(async () => {
    app = await buildApp(parseEnv(testEnv()), {
      authRateLimitPerMinute: 10_000,
      // The shipped lists are empty, so the route's behaviour is proved against supplied terms.
      nameFilter: createNameFilter(["damn"], ["monopoly"]),
    });
    await app.ready();
    await migrateUp(app.pg);

    const handle = unique("nf_").slice(0, 20);
    const account = await request(app.server)
      .post("/auth/signup")
      .send({ handle, email: `${handle}@example.test`, password: "harbour88" });
    token = account.body.accessToken;
  });

  afterAll(async () => {
    await app.pg.query("delete from users where email like '%@example.test'");
    await app.close();
  });

  function publish(name: string) {
    return request(app.server)
      .post("/boards/publish")
      .set("Authorization", `Bearer ${token}`)
      .send(publishBody({ name }));
  }

  it("refuses a trademarked name with E_BOARD_NAME_FILTERED and names the list", async () => {
    const response = await publish("Monopoly");

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("E_BOARD_NAME_FILTERED");
    // docs/13: `details.kind = 'profanity' | 'trademark'`.
    expect(response.body.error.details).toEqual({ kind: "trademark" });
    expect(response.body.error.message).toBe("Pick a different name.");
  });

  it("refuses a profane name and names that list instead", async () => {
    const response = await publish("Damn Harbour");

    expect(response.status).toBe(422);
    expect(response.body.error.details).toEqual({ kind: "profanity" });
  });

  it("publishes a clean name", async () => {
    const response = await publish(unique("Marina "));

    expect(response.status).toBe(201);
  });

  it("refuses before it validates the document, so a bad name is one error not two", async () => {
    // A filtered name on a document that would also fail the validator — three tiles is far below the
    // twelve the rulebook needs. The name is the answer, so the client shows one inline error on the name
    // field rather than a validation panel. (The body *schema* still runs first: a document that is not
    // structurally a FrozenBoard is E_VALIDATION, which is a different failure from a bad board.)
    const base = publishBody();
    const response = await request(app.server)
      .post("/boards/publish")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...base, name: "Monopoly", document: { ...base.document, tiles: base.document.tiles.slice(0, 3) } });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("E_BOARD_NAME_FILTERED");
  });
});
