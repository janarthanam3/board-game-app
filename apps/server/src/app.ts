import Fastify, { type FastifyInstance } from "fastify";

import type { ServerEnv } from "./config/env.js";
import datastoresPlugin from "./plugins/datastores.js";
import healthPlugin from "./plugins/health.js";
import socketPlugin from "./plugins/socket.js";

// Read once at import time; used by /healthz so the client can display which server build it hit.
const packageVersion: string = process.env["npm_package_version"] ?? "0.0.0";

export interface BuildAppOptions {
  // Where log lines go. Tests pass a collector; production leaves it unset (stdout).
  logDestination?: { write: (line: string) => void };
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
  await app.register(socketPlugin, { env });
  await app.register(healthPlugin, { env, version: packageVersion });

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
