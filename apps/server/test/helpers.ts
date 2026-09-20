import type { ServerEnv } from "../src/config/env.js";

// Every required variable from docs/09-server-config.md with its documented local value.
// Tests start from this and override what they need.
export function testEnv(overrides: Partial<Record<string, string>> = {}): Record<string, string> {
  return {
    NODE_ENV: "test",
    PORT: "0",
    HOST: "127.0.0.1",
    DATABASE_URL: "postgres://royalnavy:royalnavy@localhost:5432/royalnavy",
    REDIS_URL: "redis://localhost:6379",
    JWT_SECRET: "test-only-access-secret",
    JWT_REFRESH_SECRET: "test-only-refresh-secret",
    LOG_LEVEL: "silent",
    ...overrides,
  };
}

export type { ServerEnv };
