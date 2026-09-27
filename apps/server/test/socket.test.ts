// A3's connect test, brought up to D4's handshake.
//
// docs/07-api-contract.md §Socket.IO: "Handshake: `auth: { token }`", and "Valid access token in the
// handshake → disconnect with E_UNAUTHENTICATED". So a connection without a token is refused, and A3's
// acceptance — "a socket client connects" — is tested with one.
//
// **A3's `hello` is gone** (OQ-12, answered 27 September 2026). It was never in the contract's event
// table; it proved the namespace was reachable before there was anything to reach. Socket.IO's own
// `connect` is what tells a client it is connected, so this asserts on that and on the first real
// exchange the contract describes instead. The last assertion is what stops it coming back.

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

  it("an authenticated client connects", async () => {
    const client = connect({ token });

    await new Promise<void>((resolve, reject) => {
      client.once("connect", () => resolve());
      client.once("connect_error", reject);
    });

    expect(client.connected).toBe(true);
  });

  it("a connected client's first exchange is the one docs/07 describes", async () => {
    const client = connect({ token });
    await new Promise<void>((resolve, reject) => {
      client.once("connect", () => resolve());
      client.once("connect_error", reject);
    });

    // "On connect the client emits `match:subscribe`" — with no match of its own it is refused, but the
    // exchange proves the namespace is wired, which is all A3's `hello` ever proved.
    const ack = (await client.emitWithAck("match:subscribe", { matchId: "01JNOSUCHMATCH0000000000000" })) as {
      ok: boolean;
      code: string;
    };

    expect(ack).toEqual({ ok: false, code: "E_NOT_IN_MATCH" });
  });

  it("emits nothing of its own on connect — no undocumented event", async () => {
    const client = connect({ token });
    const uninvited: string[] = [];
    // onAny catches every event name, so this fails if any event outside docs/07's table reappears.
    client.onAny((event: string) => uninvited.push(event));

    await new Promise<void>((resolve, reject) => {
      client.once("connect", () => resolve());
      client.once("connect_error", reject);
    });
    // Long enough for a server-side emit on connection to have arrived, which `hello` did.
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(uninvited).toEqual([]);
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
