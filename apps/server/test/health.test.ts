import type { FastifyInstance } from "fastify";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { parseEnv } from "../src/config/env.js";
import { testEnv } from "./helpers.js";

describe("GET /healthz", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp(parseEnv(testEnv()));
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 200 with ok, version and uptimeSeconds", async () => {
    const response = await request(app.server).get("/healthz");

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(typeof response.body.version).toBe("string");
    expect(typeof response.body.uptimeSeconds).toBe("number");
  });
});
