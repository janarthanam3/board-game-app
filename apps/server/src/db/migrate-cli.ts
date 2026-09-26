// `pnpm --filter server migrate:up` / `migrate:down` (task D1).
//
// Reads DATABASE_URL through the same env schema the server boots with, so a missing or malformed
// URL fails here the way it would at boot rather than halfway through a migration.

import pg from "pg";

import { parseEnv } from "../config/env.js";
import { migrateDown, migrateUp } from "./migrate.js";

async function main(): Promise<void> {
  const direction = process.argv[2] === "down" ? "down" : "up";
  // `down 3` reverses three; `down all` unwinds the schema.
  const stepArg = process.argv[3];
  const steps = stepArg === "all" ? Infinity : stepArg === undefined ? 1 : Number(stepArg);
  if (direction === "down" && !Number.isFinite(steps) && steps !== Infinity) {
    throw new Error(`migrate down: "${stepArg}" is not a number of steps`);
  }

  const env = parseEnv(process.env as Record<string, string | undefined>);
  const pool = new pg.Pool({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 5000 });
  try {
    const ran = direction === "up" ? await migrateUp(pool) : await migrateDown(pool, steps);
    if (ran.length === 0) {
      console.log(direction === "up" ? "migrate: nothing pending" : "migrate: nothing to reverse");
    } else {
      for (const filename of ran) {
        console.log(`migrate ${direction}: ${filename}`);
      }
    }
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error((error as Error).message);
  process.exitCode = 1;
});
