import pg from "pg";

import type { ServerEnv } from "../config/env.js";

// node-postgres ("pg") is the plain driver: parameterised SQL in, rows out, no ORM
// (docs/01-architecture.md "Server structure"). One Pool per process, shared by every route.
export type PostgresPool = pg.Pool;

export function createPostgresPool(env: ServerEnv): PostgresPool {
  return new pg.Pool({
    connectionString: env.DATABASE_URL,
    // Fail a boot-time connect quickly instead of hanging while Postgres is still starting.
    connectionTimeoutMillis: 5000,
  });
}
