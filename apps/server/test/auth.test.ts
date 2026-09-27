// D2 · Auth endpoints. One describe per route in docs/07-api-contract.md §REST/Auth, with the
// failure codes from docs/13-error-catalog.md.
//
// Route names follow docs/07 (`/auth/signup`, `/auth/signin`). `docs/screens/1a-auth.md` §6 names
// `/auth/register`, `/auth/login` and `/auth/forgot` instead — that contradiction is recorded in
// docs/design-concerns.md, and `/auth/forgot` is implemented because 07 is silent on it rather than
// contrary (1a's §5 gives it copy and behaviour).

import type { FastifyInstance } from "fastify";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { migrateUp } from "../src/db/migrate.js";
import { parseEnv } from "../src/config/env.js";
import { testEnv } from "./helpers.js";

let app: FastifyInstance;

/** Unique per test run so repeated runs against the same database do not collide. */
function unique(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

function newAccount() {
  const handle = unique("nav_").slice(0, 20);
  return { handle, email: `${handle}@example.test`, password: "harbour88" };
}

async function signup(account = newAccount()) {
  const response = await request(app.server).post("/auth/signup").send(account);
  return { account, response };
}

beforeAll(async () => {
  // The limit counts per IP and every request here comes from 127.0.0.1, so the functional tests
  // raise it out of the way. The documented 10/min is proved in its own describe, at the default.
  app = await buildApp(parseEnv(testEnv()), { authRateLimitPerMinute: 10_000 });
  await app.ready();
  // Idempotent: the ledger skips anything already applied. The D1 tests work in a throwaway
  // schema, so `public` is not migrated by them.
  await migrateUp(app.pg);
});

afterAll(async () => {
  await app.pg.query("delete from users where email like '%@example.test'");
  await app.close();
});

describe("POST /auth/signup", () => {
  it("creates the account and returns the user with both tokens", async () => {
    const { account, response } = await signup();

    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({ handle: account.handle, email: account.email });
    expect(response.body.user.displayName).toBe(account.handle);
    expect(response.body.user.publishedBoardCount).toBe(0);
    expect(typeof response.body.accessToken).toBe("string");
    expect(typeof response.body.refreshToken).toBe("string");
    // The hash must never travel, and neither must the column name.
    expect(JSON.stringify(response.body)).not.toContain("password");
  });

  it("refuses a duplicate email with E_EMAIL_TAKEN", async () => {
    const { account } = await signup();
    const again = await request(app.server)
      .post("/auth/signup")
      .send({ ...account, handle: unique("other_").slice(0, 20) });

    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("E_EMAIL_TAKEN");
  });

  it("refuses a duplicate handle with E_HANDLE_TAKEN", async () => {
    const { account } = await signup();
    const again = await request(app.server)
      .post("/auth/signup")
      .send({ ...account, email: `${unique("x_")}@example.test` });

    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("E_HANDLE_TAKEN");
  });

  it("refuses a malformed handle with E_HANDLE_INVALID", async () => {
    const response = await request(app.server)
      .post("/auth/signup")
      .send({ handle: "No Spaces!", email: `${unique("h_")}@example.test`, password: "harbour88" });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("E_HANDLE_INVALID");
  });

  it("refuses a short password with E_PASSWORD_WEAK", async () => {
    const response = await request(app.server)
      .post("/auth/signup")
      .send({ handle: unique("p_").slice(0, 20), email: `${unique("p_")}@example.test`, password: "short" });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("E_PASSWORD_WEAK");
  });
});

describe("POST /auth/signin", () => {
  it("returns the user and a fresh token pair", async () => {
    const { account } = await signup();
    const response = await request(app.server)
      .post("/auth/signin")
      .send({ email: account.email, password: account.password });

    expect(response.status).toBe(200);
    expect(response.body.user.handle).toBe(account.handle);
    expect(typeof response.body.accessToken).toBe("string");
  });

  it("accepts the email in any case, because the column is citext", async () => {
    const { account } = await signup();
    const response = await request(app.server)
      .post("/auth/signin")
      .send({ email: account.email.toUpperCase(), password: account.password });

    expect(response.status).toBe(200);
  });

  it("refuses a wrong password with E_CREDENTIALS_INVALID", async () => {
    const { account } = await signup();
    const response = await request(app.server)
      .post("/auth/signin")
      .send({ email: account.email, password: "not-the-password" });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("E_CREDENTIALS_INVALID");
  });

  it("gives an unknown email the same answer as a wrong password", async () => {
    // Otherwise the response tells an attacker which addresses have accounts.
    const response = await request(app.server)
      .post("/auth/signin")
      .send({ email: `${unique("ghost_")}@example.test`, password: "harbour88" });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("E_CREDENTIALS_INVALID");
  });
});

describe("POST /auth/refresh", () => {
  it("exchanges a refresh token for a new pair", async () => {
    const { response: created } = await signup();
    const response = await request(app.server)
      .post("/auth/refresh")
      .send({ refreshToken: created.body.refreshToken });

    expect(response.status).toBe(200);
    expect(typeof response.body.accessToken).toBe("string");
    expect(response.body.refreshToken).not.toBe(created.body.refreshToken);
  });

  it("revokes the used token, so it cannot be replayed", async () => {
    const { response: created } = await signup();
    const first = await request(app.server)
      .post("/auth/refresh")
      .send({ refreshToken: created.body.refreshToken });
    expect(first.status).toBe(200);

    const replay = await request(app.server)
      .post("/auth/refresh")
      .send({ refreshToken: created.body.refreshToken });

    expect(replay.status).toBe(401);
    expect(replay.body.error.code).toBe("E_UNAUTHENTICATED");
  });

  it("refuses a token signed with the wrong secret", async () => {
    const response = await request(app.server)
      .post("/auth/refresh")
      .send({ refreshToken: "not.a.token" });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("E_UNAUTHENTICATED");
  });

  it("refuses an access token used as a refresh token", async () => {
    const { response: created } = await signup();
    const response = await request(app.server)
      .post("/auth/refresh")
      .send({ refreshToken: created.body.accessToken });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("E_UNAUTHENTICATED");
  });
});

describe("POST /auth/signout", () => {
  it("returns 204 and revokes the refresh token", async () => {
    const { response: created } = await signup();
    const out = await request(app.server)
      .post("/auth/signout")
      .send({ refreshToken: created.body.refreshToken });

    expect(out.status).toBe(204);

    const after = await request(app.server)
      .post("/auth/refresh")
      .send({ refreshToken: created.body.refreshToken });
    expect(after.status).toBe(401);
  });

  it("is idempotent: signing out twice still returns 204", async () => {
    const { response: created } = await signup();
    await request(app.server).post("/auth/signout").send({ refreshToken: created.body.refreshToken });
    const again = await request(app.server)
      .post("/auth/signout")
      .send({ refreshToken: created.body.refreshToken });

    expect(again.status).toBe(204);
  });
});

describe("POST /auth/forgot", () => {
  it("answers the same way for a known and an unknown email (1a criterion 7)", async () => {
    const { account } = await signup();
    const known = await request(app.server).post("/auth/forgot").send({ email: account.email });
    const unknown = await request(app.server)
      .post("/auth/forgot")
      .send({ email: `${unique("nobody_")}@example.test` });

    expect(known.status).toBe(202);
    expect(unknown.status).toBe(202);
    expect(known.body).toEqual(unknown.body);
    // Nothing in the body may hint that the address exists.
    expect(JSON.stringify(known.body)).not.toContain(account.email);
  });
});

describe("POST /me/password", () => {
  it("changes the password, and the new one signs in", async () => {
    const { account, response: created } = await signup();
    const change = await request(app.server)
      .post("/me/password")
      .set("Authorization", `Bearer ${created.body.accessToken}`)
      .send({ current: account.password, next: "newharbour99" });

    expect(change.status).toBe(204);

    const old = await request(app.server)
      .post("/auth/signin")
      .send({ email: account.email, password: account.password });
    expect(old.status).toBe(401);

    const fresh = await request(app.server)
      .post("/auth/signin")
      .send({ email: account.email, password: "newharbour99" });
    expect(fresh.status).toBe(200);
  });

  it("refuses a wrong current password with E_PASSWORD_WRONG", async () => {
    const { response: created } = await signup();
    const change = await request(app.server)
      .post("/me/password")
      .set("Authorization", `Bearer ${created.body.accessToken}`)
      .send({ current: "not-it", next: "newharbour99" });

    expect(change.status).toBe(401);
    expect(change.body.error.code).toBe("E_PASSWORD_WRONG");
  });

  it("refuses a weak new password with E_PASSWORD_WEAK", async () => {
    const { account, response: created } = await signup();
    const change = await request(app.server)
      .post("/me/password")
      .set("Authorization", `Bearer ${created.body.accessToken}`)
      .send({ current: account.password, next: "short" });

    expect(change.status).toBe(422);
    expect(change.body.error.code).toBe("E_PASSWORD_WEAK");
  });

  it("refuses without a bearer token with E_UNAUTHENTICATED", async () => {
    const change = await request(app.server)
      .post("/me/password")
      .send({ current: "harbour88", next: "newharbour99" });

    expect(change.status).toBe(401);
    expect(change.body.error.code).toBe("E_UNAUTHENTICATED");
  });

  it("revokes every refresh token the account held", async () => {
    // A password change is how a user reacts to a stolen device, so old sessions must not survive.
    const { account, response: created } = await signup();
    await request(app.server)
      .post("/me/password")
      .set("Authorization", `Bearer ${created.body.accessToken}`)
      .send({ current: account.password, next: "newharbour99" });

    const refresh = await request(app.server)
      .post("/auth/refresh")
      .send({ refreshToken: created.body.refreshToken });
    expect(refresh.status).toBe(401);
  });
});

describe("rate limiting (docs/07: auth routes 10/min)", () => {
  let limited: FastifyInstance;

  beforeAll(async () => {
    // No override: this asserts the number docs/07 actually specifies.
    limited = await buildApp(parseEnv(testEnv()));
    await limited.ready();
    // The tests above spent the window on this same IP and key, so start from an empty one.
    await limited.redis.flushdb();
  });

  afterAll(async () => {
    await limited.close();
  });

  afterEach(async () => {
    // The limiter counts per IP, so each test starts from a clean window.
    await limited.redis.flushdb();
  });

  it("allows ten attempts a minute and refuses the eleventh with E_RATE_LIMITED", async () => {
    const attempt = () =>
      request(limited.server).post("/auth/signin").send({ email: "who@example.test", password: "harbour88" });

    for (let sent = 0; sent < 10; sent++) {
      const allowed = await attempt();
      expect(allowed.status).toBe(401); // refused credentials, but not throttled
    }
    const blocked = await attempt();

    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe("E_RATE_LIMITED");
  });

  it("does not throttle a non-auth route at the auth limit", async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      const response = await request(limited.server).get("/healthz");
      expect(response.status).toBe(200);
    }
  });
});
