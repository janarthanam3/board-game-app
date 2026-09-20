import Fastify, { type FastifyInstance } from "fastify";

import type { ServerEnv } from "./config/env.js";
import healthPlugin from "./plugins/health.js";
import socketPlugin from "./plugins/socket.js";

// Read once at import time; used by /healthz so the client can display which server build it hit.
const packageVersion: string = process.env["npm_package_version"] ?? "0.0.0";

/**
 * Builds the Fastify instance with every plugin registered but NOT listening, so tests can drive it
 * through `app.inject` / Supertest and `index.ts` can call `listen`.
 *
 * Registration follows the boot sequence in docs/09-server-config.md: routes, then Socket.IO,
 * then /healthz. Postgres and Redis (steps 2–3) are added in A4.
 */
export async function buildApp(env: ServerEnv): Promise<FastifyInstance> {
  const app = Fastify({
    logger: buildLoggerOptions(env),
  });

  await app.register(socketPlugin, { env });
  await app.register(healthPlugin, { env, version: packageVersion });

  return app;
}

function buildLoggerOptions(env: ServerEnv) {
  if (env.LOG_LEVEL === "silent") {
    return false;
  }
  // pino-pretty is a dev convenience only; production logs stay JSON for log shippers.
  const usePretty = env.LOG_PRETTY && env.NODE_ENV === "development";
  return {
    level: env.LOG_LEVEL,
    ...(usePretty ? { transport: { target: "pino-pretty" } } : {}),
  };
}
