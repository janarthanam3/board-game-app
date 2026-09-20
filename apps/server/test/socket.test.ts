import type { FastifyInstance } from "fastify";
import { io as connectClient, type Socket } from "socket.io-client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { parseEnv } from "../src/config/env.js";
import { testEnv } from "./helpers.js";

describe("Socket.IO /match namespace", () => {
  let app: FastifyInstance;
  let baseUrl: string;
  let client: Socket | undefined;

  beforeAll(async () => {
    app = await buildApp(parseEnv(testEnv()));
    // Port 0 asks the OS for a free port; read back the one it chose.
    baseUrl = await app.listen({ host: "127.0.0.1", port: 0 });
  });

  afterAll(async () => {
    client?.disconnect();
    await app.close();
  });

  it("a connecting client receives hello", async () => {
    client = connectClient(`${baseUrl}/match`, { transports: ["websocket"] });

    const hello = await new Promise<unknown>((resolve, reject) => {
      client!.once("hello", resolve);
      client!.once("connect_error", reject);
    });

    expect(hello).toEqual({ namespace: "/match" });
    expect(client.connected).toBe(true);
  });
});
