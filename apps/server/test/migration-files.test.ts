// The migration runner's file handling — no database needed, so this half of D1 runs anywhere.
// The up/down/up integration test lives in migrations.test.ts and needs `docker compose up`.

import { describe, expect, it } from "vitest";

import { loadMigrations, splitMigration } from "../src/db/migrate.js";

describe("the migration files", () => {
  it("every file carries a forward and a reverse section", async () => {
    const migrations = await loadMigrations();
    expect(migrations.length).toBeGreaterThanOrEqual(3);
    for (const migration of migrations) {
      expect(migration.up.length).toBeGreaterThan(0);
      expect(migration.down.length).toBeGreaterThan(0);
    }
  });

  it("are numbered, so filename order is run order", async () => {
    const names = (await loadMigrations()).map((migration) => migration.filename);
    expect(names).toEqual([...names].sort());
    for (const name of names) {
      expect(name).toMatch(/^\d{4}_[a-z0-9_]+\.sql$/);
    }
  });

  it("refuses a file with no down section", () => {
    expect(() => splitMigration("0009_bad.sql", "create table t (id text);")).toThrow(/no "-- down" section/);
  });

  it("refuses a file whose down section is empty", () => {
    expect(() => splitMigration("0009_bad.sql", "create table t (id text);\n-- down\n")).toThrow(/empty/);
  });
});
