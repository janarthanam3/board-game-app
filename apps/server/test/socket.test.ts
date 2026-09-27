// A3's connect test, brought up to D4's handshake.
//
// docs/07-api-contract.md §Socket.IO: "Handshake: `auth: { token }`", and "Valid access token in the
// handshake → disconnect with E_UNAUTHENTICATED". So a connection without a token is refused, and A3's
// acceptance — "a socket client connects and receives `hello`" — is tested with one.
//
// `hello` itself is still not in the contract's event table. **OQ-12** asks whether it should go; it is
// unanswered, so the event stays where A3 put it rather than being removed here.

import type { FastifyInstance } from "fastify";
import request from "supertest";
import { io as connectClient, type Socket } from "socket.io-client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { parseEnv } from "../src/config/env.js";
import { migrateUp } from "../src/db/migrate.js";
import { unique } from "./fixtures.js";
import { testEnv } from "./helpers.js";

describe("Socket.IO /match namespace", () => {
  let app: FastifyInstance;
  let baseUrl: string;
  let token: string;
  const open: Socket[] = [];

  beforeAll(async () => {
    app = await buildApp(parseEnv(testEnv()), { authRateLimitPerMinute: 10_000 });
    await app.ready();
    await migrateUp(app.pg);
    // Port 0 asks the OS for a free port; read back the one it chose.
    baseUrl = await app.listen({ host: "127.0.0.1", port: 0 });

    const handle = unique("sock_").slice(0, 20);
    const account = await request(app.server)
      .post("/auth/signup")
      .send({ handle, email: `${handle}@example.test`, password: "harbour88" });
    token = account.body.accessToken;
  });

  afterAll(async () => {
    for (const client of open) {
      client.disconnect();
    }
    await app.pg.query("delete from users where email like '%@example.test'");
    await app.close();
  });

  function connect(auth: Record<string, unknown>): Socket {
    const client = connectClient(`${baseUrl}/match`, { transports: ["websocket"], auth });
    open.push(client);
    return client;
  }

  it("an authenticated client connects and receives hello", async () => {
    const client = connect({ token });

    const hello = await new Promise<unknown>((resolve, reject) => {
      client.once("hello", resolve);
      client.once("connect_error", reject);
    });

    expect(hello).toEqual({ namespace: "/match" });
    expect(client.connected).toBe(true);
  });

  it("refuses a handshake with no token, carrying E_UNAUTHENTICATED", async () => {
    const client = connect({});

    const failure = await new Promise<Error & { data?: { code?: string } }>((resolve) => {
      client.once("connect_error", resolve);
    });

    expect(failure.data?.code).toBe("E_UNAUTHENTICATED");
    expect(client.connected).toBe(false);
  });

  it("refuses a handshake with a token that is not ours", async () => {
    const client = connect({ token: "not.a.jwt" });

    const failure = await new Promise<Error & { data?: { code?: string } }>((resolve) => {
      client.once("connect_error", resolve);
    });

    expect(failure.data?.code).toBe("E_UNAUTHENTICATED");
  });
});
