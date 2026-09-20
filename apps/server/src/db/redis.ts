import { Redis } from "ioredis";

import type { ServerEnv } from "../config/env.js";

export type RedisClient = Redis;

export function createRedisClient(env: ServerEnv): RedisClient {
  return new Redis(env.REDIS_URL, {
    // Connect explicitly in the boot sequence so a failure surfaces there, not on the first command.
    lazyConnect: true,
    // After boot, reconnect with a short backoff; an unreachable Redis is reported by /readyz.
    retryStrategy: (attempt) => Math.min(attempt * 200, 2000),
    maxRetriesPerRequest: 1,
  });
}
