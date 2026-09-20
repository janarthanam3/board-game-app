import type { FastifyInstance } from "fastify";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { buildApp } from "../src/app.js";
import { parseEnv } from "../src/config/env.js";
import { testEnv } from "./helpers.js";

describe("GET /readyz when a store stops answering", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp(parseEnv(testEnv()));
    await app.ready();
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await app.close();
  });

  it("returns 503 naming redis when its ping fails", async () => {
    vi.spyOn(app.redis, "ping").mockRejectedValueOnce(new Error("connection lost"));

    const response = await request(app.server).get("/readyz");

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ ok: false, postgres: "ok", redis: "failed" });
  });

  it("returns 503 naming postgres when its query exceeds 500 ms", async () => {
    vi.spyOn(app.pg, "query").mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve({ rows: [] }), 700)),
    );

    const response = await request(app.server).get("/readyz");

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ ok: false, postgres: "failed", redis: "ok" });
  });
});
