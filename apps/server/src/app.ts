import Fastify, { type FastifyInstance } from "fastify";

import type { ServerEnv } from "./config/env.js";
import authPlugin from "./plugins/auth.js";
import datastoresPlugin from "./plugins/datastores.js";
import healthPlugin from "./plugins/health.js";
import socketPlugin from "./plugins/socket.js";
import authRoutes from "./routes/auth.js";
import boardRoutes from "./routes/boards.js";
import catalogueRoutes from "./routes/catalogue.js";
import matchRoutes from "./routes/matches.js";

// Read once at import time; used by /healthz so the client can display which server build it hit.
const packageVersion: string = process.env["npm_package_version"] ?? "0.0.0";

/** docs/07-api-contract.md: "auth routes 10/min". */
const AUTH_RATE_PER_MINUTE = 10;

export interface BuildAppOptions {
  // Where log lines go. Tests pass a collector; production leaves it unset (stdout).
  logDestination?: { write: (line: string) => void };
  /**
   * Raises the auth rate limit for tests that need many requests from one IP. Production never
   * passes it, so the documented 10/min stands; the limit test omits it too, on purpose.
   */
  authRateLimitPerMinute?: number;
}

/**
 * Builds the Fastify instance with every plugin registered but NOT listening, so tests can drive it
 * through Supertest and `index.ts` can call `listen`.
 *
 * Registration follows the boot sequence in docs/09-server-config.md: Postgres and Redis (2–3),
 * then routes, Socket.IO and /healthz (5). Migrations on boot and the word lists (2, 4) come with D1.
 */
export async function buildApp(env: ServerEnv, options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: buildLoggerOptions(env, options),
  });

  await app.register(datastoresPlugin, { env });
  await app.register(authPlugin, { env });
  await app.register(socketPlugin, { env });
  await app.register(healthPlugin, { env, version: packageVersion });
  // Routes go in their own scope so the auth group's rate limit cannot leak onto /healthz.
  await app.register(authRoutes, {
    env,
    ratePerMinute: options.authRateLimitPerMinute ?? AUTH_RATE_PER_MINUTE,
  });
  await app.register(boardRoutes, { env, maxPublished: env.MAX_PUBLISHED_BOARDS });
  await app.register(catalogueRoutes);
  await app.register(matchRoutes, { env });

  return app;
}

function buildLoggerOptions(env: ServerEnv, options: BuildAppOptions) {
  if (env.LOG_LEVEL === "silent") {
    return false;
  }
  if (options.logDestination) {
    return { level: env.LOG_LEVEL, stream: options.logDestination };
  }
  // pino-pretty is a dev convenience only; production logs stay JSON for log shippers.
  const usePretty = env.LOG_PRETTY && env.NODE_ENV === "development";
  return {
    level: env.LOG_LEVEL,
    ...(usePretty ? { transport: { target: "pino-pretty" } } : {}),
  };
}
