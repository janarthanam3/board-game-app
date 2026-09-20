import type { FastifyPluginAsync } from "fastify";
import fastifyPlugin from "fastify-plugin";

import type { ServerEnv } from "../config/env.js";

export interface HealthPluginOptions {
  env: ServerEnv;
  version: string;
}

// docs/09-server-config.md "Health and readiness": GET /healthz → { ok, version, uptimeSeconds }.
// /readyz (Postgres + Redis within 500 ms) arrives with A4, once those connections exist.
const healthPlugin: FastifyPluginAsync<HealthPluginOptions> = async (app, options) => {
  const startedAtMs = Date.now();

  app.get("/healthz", async () => ({
    ok: true,
    version: options.version,
    uptimeSeconds: Math.floor((Date.now() - startedAtMs) / 1000),
  }));
};

export default fastifyPlugin(healthPlugin, { name: "health" });
