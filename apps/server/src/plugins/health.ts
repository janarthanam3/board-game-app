import type { FastifyPluginAsync } from "fastify";
import fastifyPlugin from "fastify-plugin";

import type { ServerEnv } from "../config/env.js";

export interface HealthPluginOptions {
  env: ServerEnv;
  version: string;
}

// docs/09-server-config.md "Health and readiness". The /readyz probe budget.
const READINESS_TIMEOUT_MS = 500;

type ProbeResult = "ok" | "failed";

const healthPlugin: FastifyPluginAsync<HealthPluginOptions> = async (app, options) => {
  const startedAtMs = Date.now();

  // Registered after the datastores plugin, so reaching this route means boot steps 1–4 succeeded.
  app.get("/healthz", async () => ({
    ok: true,
    version: options.version,
    uptimeSeconds: Math.floor((Date.now() - startedAtMs) / 1000),
  }));

  // 200 when Postgres and Redis both answer within 500 ms, else 503 saying which failed.
  app.get("/readyz", async (_request, reply) => {
    const [postgres, redis] = await Promise.all([
      probe(() => app.pg.query("select 1")),
      probe(() => app.redis.ping()),
    ]);
    const ok = postgres === "ok" && redis === "ok";
    return reply.code(ok ? 200 : 503).send({ ok, postgres, redis });
  });
};

async function probe(check: () => Promise<unknown>): Promise<ProbeResult> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error("timed out")), READINESS_TIMEOUT_MS);
  });
  try {
    await Promise.race([check(), timeout]);
    return "ok";
  } catch {
    return "failed";
  } finally {
    clearTimeout(timer);
  }
}

export default fastifyPlugin(healthPlugin, { name: "health", dependencies: ["datastores"] });
