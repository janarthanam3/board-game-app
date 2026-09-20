import type { FastifyInstance } from "fastify";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { parseEnv } from "../src/config/env.js";
import { testEnv } from "./helpers.js";

// Integration: needs `docker compose up` (README section 3). Postgres and Redis are the ones
// docker-compose.yml starts, reached through the documented local URLs in testEnv().
describe("data stores on boot", () => {
  let app: FastifyInstance;
  const logLines: string[] = [];

  beforeAll(async () => {
    app = await buildApp(parseEnv(testEnv({ LOG_LEVEL: "info" })), {
      logDestination: { write: (line: string) => logLines.push(line) },
    });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("opens a Postgres session and can run a query", async () => {
    const result = await app.pg.query<{ answer: number }>("select 1 + 1 as answer");
    expect(result.rows[0]?.answer).toBe(2);
  });

  it("answers a Redis PING", async () => {
    await expect(app.redis.ping()).resolves.toBe("PONG");
  });

  it("logs both connections once on boot", () => {
    expect(logLines.some((line) => line.includes("postgres connected"))).toBe(true);
    expect(logLines.some((line) => line.includes("redis connected"))).toBe(true);
  });

  it("GET /readyz returns 200 when both stores answer", async () => {
    const response = await request(app.server).get("/readyz");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, postgres: "ok", redis: "ok" });
  });
});

describe("boot with an unreachable store", () => {
  it("refuses to become ready and names the store", async () => {
    // Port 1 is never a Redis server; connection must fail fast rather than retry forever.
    // buildApp awaits each plugin, so the failure surfaces there, before anything listens.
    await expect(
      buildApp(parseEnv(testEnv({ REDIS_URL: "redis://127.0.0.1:1" }))),
    ).rejects.toThrow(/redis/i);
  });
});
