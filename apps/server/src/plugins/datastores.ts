import type { FastifyPluginAsync } from "fastify";
import fastifyPlugin from "fastify-plugin";

import type { ServerEnv } from "../config/env.js";
import { createPostgresPool, type PostgresPool } from "../db/postgres.js";
import { createRedisClient, type RedisClient } from "../db/redis.js";

export interface DatastoresPluginOptions {
  env: ServerEnv;
}

declare module "fastify" {
  interface FastifyInstance {
    pg: PostgresPool;
    redis: RedisClient;
  }
}

// Boot sequence steps 2 and 3 (docs/09-server-config.md): connect Postgres, then Redis and PING.
// Either failure rejects app.ready(), so the server never listens half-connected.
const datastoresPlugin: FastifyPluginAsync<DatastoresPluginOptions> = async (app, options) => {
  const pool = createPostgresPool(options.env);
  // An idle client can drop (network blip, server restart); without a listener pg would throw.
  pool.on("error", (error) => app.log.warn({ err: error }, "postgres idle client error"));

  try {
    await pool.query("select 1");
  } catch (error) {
    await pool.end();
    throw new Error(`postgres connection failed: ${(error as Error).message}`);
  }
  app.log.info("postgres connected");

  const redis = createRedisClient(options.env);
  // ioredis raises 'error' on every failed reconnect; unhandled, that would crash the process.
  redis.on("error", (error) => app.log.warn({ err: error }, "redis error"));

  try {
    await redis.connect();
    await redis.ping();
  } catch (error) {
    redis.disconnect();
    await pool.end();
    throw new Error(`redis connection failed: ${(error as Error).message}`);
  }
  app.log.info("redis connected");

  app.decorate("pg", pool);
  app.decorate("redis", redis);

  app.addHook("onClose", async () => {
    redis.disconnect();
    await pool.end();
  });
};

export default fastifyPlugin(datastoresPlugin, { name: "datastores" });
