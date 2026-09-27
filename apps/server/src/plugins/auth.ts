// Bearer authentication, as a preHandler other routes can ask for.
//
// docs/07-api-contract.md: `Authorization: Bearer <accessToken>`. A missing, malformed or expired
// token is E_UNAUTHENTICATED (401), which docs/13 pairs with "Please sign in again." and tells the
// client to try a silent refresh first.

import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import fastifyPlugin from "fastify-plugin";

import type { ServerEnv } from "../config/env.js";
import { sendError } from "../http/errors.js";
import { verifyAccessToken } from "../auth/tokens.js";

export interface AuthPluginOptions {
  env: ServerEnv;
}

export interface RequestUser {
  id: string;
  handle: string;
}

declare module "fastify" {
  interface FastifyInstance {
    /** Use as a route's `preHandler`. On success `request.user` is set; on failure it replies 401. */
    requireUser: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /**
     * Verifies an access token without requiring one. For a route that is open to everyone but shows
     * more to a signed-in viewer; it does not check the account, so it is never a substitute for
     * `requireUser` on anything that changes state.
     */
    verifyAccess: (token: string) => { sub: string; handle: string } | null;
  }
  interface FastifyRequest {
    user?: RequestUser;
  }
}

const authPlugin: FastifyPluginAsync<AuthPluginOptions> = async (app, options) => {
  app.decorateRequest("user", undefined);

  app.decorate("verifyAccess", (token: string) => verifyAccessToken(options.env, token));

  app.decorate("requireUser", async (request: FastifyRequest, reply: FastifyReply) => {
    const header = request.headers.authorization;
    // Case-insensitive scheme, exactly one space: what every HTTP client sends.
    const match = /^Bearer (.+)$/i.exec(header ?? "");
    if (!match?.[1]) {
      await sendError(reply, "E_UNAUTHENTICATED");
      return;
    }

    const claims = verifyAccessToken(options.env, match[1]);
    if (!claims) {
      await sendError(reply, "E_UNAUTHENTICATED");
      return;
    }

    // A token outlives a deletion by up to its TTL, so the account is checked, not just the token.
    const result = await app.pg.query<{ id: string; handle: string; deleted_at: Date | null }>(
      "select id, handle, deleted_at from users where id = $1",
      [claims.sub],
    );
    const row = result.rows[0];
    if (!row) {
      await sendError(reply, "E_UNAUTHENTICATED");
      return;
    }
    if (row.deleted_at !== null) {
      await sendError(reply, "E_ACCOUNT_DELETED");
      return;
    }

    request.user = { id: row.id, handle: row.handle };
  });
};

// fastify-plugin so the decorators land on the root instance rather than an encapsulated child.
export default fastifyPlugin(authPlugin, { name: "auth", dependencies: ["datastores"] });
