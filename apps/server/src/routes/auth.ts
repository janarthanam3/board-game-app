// Auth routes. docs/07-api-contract.md §REST/Auth is the contract; docs/13-error-catalog.md gives
// every refusal code.
//
// Route names are docs/07's: /auth/signup, /auth/signin, /auth/refresh, /auth/signout.
// `docs/screens/1a-auth.md` §6 names /auth/register, /auth/login and /auth/forgot instead. That
// contradiction between two derived docs is recorded in docs/design-concerns.md and not resolved
// here — 07 wins for the three routes it names, because it is the API contract, and /auth/forgot is
// implemented as 1a describes it because 07 is silent on it rather than contrary.
//
// /me/password lives here rather than in a routes/me.ts because D2's own file list names only this
// file, and the password change is one of D2's five endpoints. The rest of /me belongs to a later
// task.

import {
  changePasswordBodySchema,
  forgotBodySchema,
  refreshBodySchema,
  signinBodySchema,
  signoutBodySchema,
  signupBodySchema,
  type User,
} from "@royal-navy/shared/schemas/auth";
import { newId } from "@royal-navy/shared/id";
import type { FastifyPluginAsync } from "fastify";

import { hashPassword, verifyAgainstDecoy, verifyPassword } from "../auth/password.js";
import {
  issueTokenPair,
  revokeAllRefreshTokens,
  revokeRefreshToken,
  rotateRefreshToken,
  verifyRefreshToken,
} from "../auth/tokens.js";
import type { ServerEnv } from "../config/env.js";
import { HttpError, sendError } from "../http/errors.js";

export interface AuthRoutesOptions {
  env: ServerEnv;
  /** Requests per minute per IP on this route group. docs/07 sets it to 10. */
  ratePerMinute: number;
}

interface UserRow {
  id: string;
  handle: string;
  display_name: string;
  email: string;
  password_hash: string;
  created_at: Date;
}

/** Postgres's code for a unique-constraint violation; the constraint name says which one. */
const UNIQUE_VIOLATION = "23505";

const authRoutes: FastifyPluginAsync<AuthRoutesOptions> = async (app, options) => {
  const { env } = options;

  // Rate limiting is registered inside this plugin's scope, so it applies to these routes and not to
  // /healthz or the socket handshake (docs/07: "60 req/min per IP per route group; auth routes
  // 10/min"). Redis is the store so the count survives a restart and is shared across instances.
  await app.register(import("@fastify/rate-limit"), {
    max: options.ratePerMinute,
    timeWindow: "1 minute",
    redis: app.redis,
    // Distinguishes this group's keys from any other group's, so the two limits count separately.
    keyGenerator: (request) => `rl:auth:${request.ip}`,
  });

  // The limiter signals a refusal by throwing, and Fastify would then serialise it as a 500 with
  // whatever shape the plugin chose. This scope owns its envelope instead: every error leaving these
  // routes is a catalog code in docs/07's `{ error: { code, message } }` wrapper.
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof HttpError) {
      return sendError(reply, error.code, error.details);
    }
    if (error.statusCode === 429) {
      return sendError(reply, "E_RATE_LIMITED");
    }
    // Anything else is a bug, not a refusal: log it and say nothing about its internals.
    request.log.error({ err: error }, "unhandled error in an auth route");
    return reply.status(500).send({ error: { code: "E_INTERNAL", message: "Something went wrong." } });
  });

  app.post("/auth/signup", async (request, reply) => {
    const parsed = signupBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, codeForSignupIssue(parsed.error.issues[0]?.path[0]));
    }
    const { handle, email, password } = parsed.data;

    const id = newId();
    const passwordHash = await hashPassword(password);
    try {
      // display_name is NOT NULL and docs/07's signup body has no field for it, so it starts as the
      // handle and PATCH /me can change it later. See OQ-38: 1a collects a display name and no
      // handle, which is the opposite of this shape.
      await app.pg.query(
        `insert into users (id, handle, display_name, email, password_hash)
         values ($1, $2, $3, $4, $5)`,
        [id, handle, handle, email, passwordHash],
      );
    } catch (error) {
      const code = (error as { code?: string }).code;
      const constraint = (error as { constraint?: string }).constraint ?? "";
      if (code === UNIQUE_VIOLATION) {
        return sendError(reply, constraint.includes("handle") ? "E_HANDLE_TAKEN" : "E_EMAIL_TAKEN");
      }
      throw error;
    }

    const row = await loadUserById(app, id);
    if (!row) {
      throw new Error("signup: the row just inserted could not be read back");
    }
    const tokens = await issueTokenPair(app.pg, env, row);
    return reply.status(201).send({ user: await toUser(app, row), ...tokens });
  });

  app.post("/auth/signin", async (request, reply) => {
    const parsed = signinBodySchema.safeParse(request.body);
    if (!parsed.success) {
      // A malformed body gets the same answer as a wrong password: the route must not say which
      // addresses look plausible.
      return sendError(reply, "E_CREDENTIALS_INVALID");
    }
    const { email, password } = parsed.data;

    const result = await app.pg.query<UserRow>(
      "select id, handle, display_name, email, password_hash, created_at from users where email = $1 and deleted_at is null",
      [email],
    );
    const row = result.rows[0];
    if (!row) {
      // Spend comparable time, so the response does not reveal that the address is unknown.
      await verifyAgainstDecoy(password);
      return sendError(reply, "E_CREDENTIALS_INVALID");
    }
    if (!(await verifyPassword(password, row.password_hash))) {
      return sendError(reply, "E_CREDENTIALS_INVALID");
    }

    const tokens = await issueTokenPair(app.pg, env, row);
    return reply.status(200).send({ user: await toUser(app, row), ...tokens });
  });

  app.post("/auth/refresh", async (request, reply) => {
    const parsed = refreshBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, "E_UNAUTHENTICATED");
    }

    const row = await verifyRefreshToken(app.pg, env, parsed.data.refreshToken);
    if (!row) {
      return sendError(reply, "E_UNAUTHENTICATED");
    }
    const user = await loadUserById(app, row.userId);
    if (!user) {
      return sendError(reply, "E_UNAUTHENTICATED");
    }

    const tokens = await rotateRefreshToken(app.pg, env, row, user);
    return reply.status(200).send(tokens);
  });

  app.post("/auth/signout", async (request, reply) => {
    const parsed = signoutBodySchema.safeParse(request.body);
    // Signing out is idempotent and never reports failure: a client that has lost its token still
    // needs the call to succeed so it can clear its own storage.
    if (parsed.success) {
      const row = await verifyRefreshToken(app.pg, env, parsed.data.refreshToken);
      if (row) {
        await revokeRefreshToken(app.pg, row.id);
      }
    }
    return reply.status(204).send();
  });

  app.post("/auth/forgot", async (request, reply) => {
    const parsed = forgotBodySchema.safeParse(request.body);
    // `1a` criterion 7: the same answer whether or not the email exists. A malformed address is
    // answered the same way too, for the same reason.
    if (parsed.success) {
      request.log.info({ route: "/auth/forgot" }, "password reset requested");
    }
    // No email is sent and no reset token is minted: how a reset link would be delivered on a free
    // tier is unanswered (OQ-39), and inventing a provider would breach Rule 3. The endpoint exists
    // so the screen's documented behaviour holds, and the log records the request.
    return reply.status(202).send({ ok: true });
  });

  app.post("/me/password", { preHandler: app.requireUser }, async (request, reply) => {
    const user = request.user;
    if (!user) {
      return sendError(reply, "E_UNAUTHENTICATED");
    }

    const parsed = changePasswordBodySchema.safeParse(request.body);
    if (!parsed.success) {
      const field = parsed.error.issues[0]?.path[0];
      return sendError(reply, field === "next" ? "E_PASSWORD_WEAK" : "E_VALIDATION");
    }

    const result = await app.pg.query<{ password_hash: string }>(
      "select password_hash from users where id = $1 and deleted_at is null",
      [user.id],
    );
    const row = result.rows[0];
    if (!row) {
      return sendError(reply, "E_UNAUTHENTICATED");
    }
    if (!(await verifyPassword(parsed.data.current, row.password_hash))) {
      return sendError(reply, "E_PASSWORD_WRONG");
    }

    await app.pg.query("update users set password_hash = $1 where id = $2", [
      await hashPassword(parsed.data.next),
      user.id,
    ]);
    // A password change is how someone reacts to a lost device, so every existing session ends.
    await revokeAllRefreshTokens(app.pg, user.id);
    return reply.status(204).send();
  });
};

/** zod reports the first failing field; the catalog has a specific code for two of the three. */
function codeForSignupIssue(field: unknown): "E_HANDLE_INVALID" | "E_PASSWORD_WEAK" | "E_VALIDATION" {
  if (field === "handle") {
    return "E_HANDLE_INVALID";
  }
  if (field === "password") {
    return "E_PASSWORD_WEAK";
  }
  return "E_VALIDATION";
}

async function loadUserById(
  app: Parameters<FastifyPluginAsync<AuthRoutesOptions>>[0],
  id: string,
): Promise<UserRow | undefined> {
  const result = await app.pg.query<UserRow>(
    "select id, handle, display_name, email, password_hash, created_at from users where id = $1 and deleted_at is null",
    [id],
  );
  return result.rows[0];
}

/** The `User` shape docs/07 declares. The password hash never leaves this module. */
async function toUser(
  app: Parameters<FastifyPluginAsync<AuthRoutesOptions>>[0],
  row: UserRow,
): Promise<User> {
  const counted = await app.pg.query<{ count: string }>(
    "select count(*)::text as count from boards where author_id = $1 and status = 'published'",
    [row.id],
  );
  return {
    id: row.id,
    handle: row.handle,
    displayName: row.display_name,
    email: row.email,
    createdAt: row.created_at.toISOString(),
    publishedBoardCount: Number(counted.rows[0]?.count ?? "0"),
  };
}

export default authRoutes;
