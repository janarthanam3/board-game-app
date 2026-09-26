// The migration runner (task D1; db-migrations skill).
//
// Plain SQL files in apps/server/migrations, numbered `NNNN_snake_name.sql`. Each file holds its
// forward statements, then a line that is exactly `-- down`, then the statements that reverse them.
// docs/08-database.md calls migrations forward-only; D1's acceptance and the db-migrations skill
// both require a reversible `-- down` and a CI that runs up, down, up. The task wins, and the
// disagreement is recorded in docs/design-concerns.md.
//
// Applied files are recorded in `schema_migrations (filename, applied_at)`. The runner refuses to
// run out of order: if a file earlier than the last applied one is still pending, something has
// been inserted into history and a human has to look.

import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type pg from "pg";

/** Where the .sql files live, resolved from this module so the cwd does not matter. */
export const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "migrations");

const LEDGER = `
  create table if not exists schema_migrations (
    filename   text primary key,
    applied_at timestamptz not null default now()
  )
`;

export interface Migration {
  filename: string;
  up: string;
  down: string;
}

/** The marker splitting a file's forward half from its reverse half. */
const DOWN_MARKER = /^--\s*down\s*$/im;

export function splitMigration(filename: string, sql: string): Migration {
  const marker = sql.match(DOWN_MARKER);
  if (!marker || marker.index === undefined) {
    throw new Error(`${filename}: no "-- down" section; every migration must reverse itself`);
  }
  const up = sql.slice(0, marker.index).trim();
  const down = sql.slice(marker.index + marker[0].length).trim();
  if (up === "") {
    throw new Error(`${filename}: the forward section is empty`);
  }
  if (down === "") {
    throw new Error(`${filename}: the "-- down" section is empty`);
  }
  return { filename, up, down };
}

/** Every migration on disk, in filename order — which is numeric order, given the NNNN_ prefix. */
export async function loadMigrations(dir: string = MIGRATIONS_DIR): Promise<Migration[]> {
  const files = (await readdir(dir)).filter((name) => name.endsWith(".sql")).sort();
  return Promise.all(
    files.map(async (filename) => splitMigration(filename, await readFile(join(dir, filename), "utf8"))),
  );
}

async function applied(pool: pg.Pool): Promise<string[]> {
  await pool.query(LEDGER);
  const result = await pool.query<{ filename: string }>("select filename from schema_migrations order by filename");
  return result.rows.map((row) => row.filename);
}

/**
 * Runs every pending migration in order, each in its own transaction, recording it in the ledger.
 * Returns the filenames applied.
 */
export async function migrateUp(pool: pg.Pool, dir: string = MIGRATIONS_DIR): Promise<string[]> {
  const migrations = await loadMigrations(dir);
  const done = new Set(await applied(pool));
  const pending = migrations.filter((migration) => !done.has(migration.filename));

  // Out-of-order guard: a pending file must not sort before an applied one.
  const lastApplied = [...done].sort().pop();
  const outOfOrder = lastApplied === undefined ? [] : pending.filter((m) => m.filename < lastApplied);
  if (outOfOrder.length > 0) {
    throw new Error(
      `migrate: ${outOfOrder.map((m) => m.filename).join(", ")} sorts before the applied ${lastApplied}; ` +
        "a migration has been inserted into history — resolve it by hand",
    );
  }

  const ran: string[] = [];
  for (const migration of pending) {
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query(migration.up);
      await client.query("insert into schema_migrations (filename) values ($1)", [migration.filename]);
      await client.query("commit");
      ran.push(migration.filename);
    } catch (error) {
      await client.query("rollback");
      throw new Error(`migrate up ${migration.filename}: ${(error as Error).message}`);
    } finally {
      client.release();
    }
  }
  return ran;
}

/**
 * Reverses applied migrations, newest first. `steps` defaults to one; pass Infinity to unwind the
 * whole schema. Returns the filenames reversed.
 */
export async function migrateDown(pool: pg.Pool, steps = 1, dir: string = MIGRATIONS_DIR): Promise<string[]> {
  const migrations = new Map((await loadMigrations(dir)).map((migration) => [migration.filename, migration]));
  const done = (await applied(pool)).reverse();
  const target = done.slice(0, steps === Infinity ? done.length : steps);

  const ran: string[] = [];
  for (const filename of target) {
    const migration = migrations.get(filename);
    if (!migration) {
      throw new Error(`migrate down ${filename}: applied, but the file is gone — it cannot be reversed`);
    }
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query(migration.down);
      await client.query("delete from schema_migrations where filename = $1", [filename]);
      await client.query("commit");
      ran.push(filename);
    } catch (error) {
      await client.query("rollback");
      throw new Error(`migrate down ${filename}: ${(error as Error).message}`);
    } finally {
      client.release();
    }
  }
  return ran;
}
