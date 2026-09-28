// `pnpm --filter server seed` (docs/08-database.md §"Seed data").
//
// Runs the migrations first, so a clean database can be seeded in one command, then the seed. Exits 1
// with the reason on any failure — a half-seeded database is worse than none, and every insert is
// idempotent, so re-running after a fix is safe.

import { config as loadDotenv } from "dotenv";

import { parseEnv } from "../config/env.js";
import { migrateUp } from "./migrate.js";
import { createPostgresPool } from "./postgres.js";
import { seed } from "./seed.js";

// .env lives at the repo root (README section 4), and this runs with apps/server as the working
// directory. Same path list as index.ts, so the seed sees exactly the environment the server boots with.
loadDotenv({ path: [".env", "../../.env"] });

async function main(): Promise<void> {
  const env = parseEnv(process.env);
  const pg = createPostgresPool(env);
  try {
    await migrateUp(pg);
    const result = await seed(pg, (message) => console.log(`seed: ${message}`));
    console.log(
      `seed: done — ${result.users} users, ${result.boards} boards, ${result.matches} completed match, ${result.events} events`,
    );
  } finally {
    await pg.end();
  }
}

main().catch((error: unknown) => {
  console.error(`seed failed: ${(error as Error).message}`);
  process.exit(1);
});
