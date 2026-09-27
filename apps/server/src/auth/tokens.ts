// Access and refresh tokens.
//
// docs/07-api-contract.md: `Authorization: Bearer <accessToken>`, a 15-minute access token and a
// 30-day refresh token, and `/auth/refresh` returns a *new* pair. docs/09-server-config.md gives
// JWT_SECRET for access tokens and JWT_REFRESH_SECRET for refresh tokens, with the two TTLs.
//
// Both are JWTs, but only the refresh token has a row in `refresh_tokens` (0001_init.sql). That row
// is what makes it revocable: the token itself is never stored, only a SHA-256 of it, so a stolen
// database cannot be replayed as a stolen session. An access token is not revocable and does not need
// to be — fifteen minutes is the whole point of the short TTL.

import { createHash } from "node:crypto";

import { newId } from "@royal-navy/shared/id";
import jwt from "jsonwebtoken";

// docs/09 types the two TTLs as strings ("15m", "30d"); jsonwebtoken types the option as its own
// StringValue union, which no env value can satisfy without a cast.
type Ttl = NonNullable<jwt.SignOptions["expiresIn"]>;

import type { ServerEnv } from "../config/env.js";
import type { PostgresPool } from "../db/postgres.js";

/** What the client sends back on `/auth/refresh`; `jti` is the `refresh_tokens.id` it belongs to. */
interface RefreshClaims {
  sub: string;
  jti: string;
  typ: "refresh";
}

interface AccessClaims {
  sub: string;
  handle: string;
  typ: "access";
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export function signAccessToken(env: ServerEnv, user: { id: string; handle: string }): string {
  const claims: AccessClaims = { sub: user.id, handle: user.handle, typ: "access" };
  // `typ` is belt and braces: the two secrets already keep the token kinds apart, but an explicit
  // claim means a mix-up fails loudly rather than depending on key hygiene alone.
  return jwt.sign(claims, env.JWT_SECRET, { expiresIn: env.ACCESS_TOKEN_TTL as Ttl });
}

export function verifyAccessToken(env: ServerEnv, token: string): AccessClaims | null {
  try {
    const claims = jwt.verify(token, env.JWT_SECRET) as AccessClaims;
    return claims.typ === "access" && typeof claims.sub === "string" ? claims : null;
  } catch {
    // Expired, tampered with, or signed with the refresh secret: all the same answer here.
    return null;
  }
}

/** Issues a refresh token and records its hash, so it can be revoked later. */
export async function issueRefreshToken(pg: PostgresPool, env: ServerEnv, userId: string): Promise<string> {
  const id = newId();
  const claims: RefreshClaims = { sub: userId, jti: id, typ: "refresh" };
  const token = jwt.sign(claims, env.JWT_REFRESH_SECRET, { expiresIn: env.REFRESH_TOKEN_TTL as Ttl });

  // The row's expiry comes from the token's own `exp`, so the two can never disagree.
  const decoded = jwt.decode(token) as { exp?: number } | null;
  const expiresAt = new Date((decoded?.exp ?? 0) * 1000);

  await pg.query(
    "insert into refresh_tokens (id, user_id, token_hash, expires_at) values ($1, $2, $3, $4)",
    [id, userId, hashToken(token), expiresAt],
  );
  return token;
}

export async function issueTokenPair(
  pg: PostgresPool,
  env: ServerEnv,
  user: { id: string; handle: string },
): Promise<TokenPair> {
  return {
    accessToken: signAccessToken(env, user),
    refreshToken: await issueRefreshToken(pg, env, user.id),
  };
}

export interface RefreshRow {
  id: string;
  userId: string;
}

/**
 * Checks a refresh token against its row. Returns null for anything that is not a live, unrevoked,
 * unexpired token belonging to a live account — the caller answers every such case identically.
 */
export async function verifyRefreshToken(
  pg: PostgresPool,
  env: ServerEnv,
  token: string,
): Promise<RefreshRow | null> {
  let claims: RefreshClaims;
  try {
    claims = jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshClaims;
  } catch {
    return null;
  }
  if (claims.typ !== "refresh" || typeof claims.jti !== "string" || typeof claims.sub !== "string") {
    return null;
  }

  const result = await pg.query<{ id: string; user_id: string; token_hash: string }>(
    `select r.id, r.user_id, r.token_hash
       from refresh_tokens r
       join users u on u.id = r.user_id
      where r.id = $1
        and r.user_id = $2
        and r.revoked_at is null
        and r.expires_at > now()
        and u.deleted_at is null`,
    [claims.jti, claims.sub],
  );
  const row = result.rows[0];
  if (!row) {
    return null;
  }
  // The row holds a hash, so a token that verifies cryptographically but does not match the stored
  // hash (a reused jti, a doctored payload) is still refused.
  if (row.token_hash !== hashToken(token)) {
    return null;
  }
  return { id: row.id, userId: row.user_id };
}

export async function revokeRefreshToken(pg: PostgresPool, id: string): Promise<void> {
  await pg.query("update refresh_tokens set revoked_at = now() where id = $1 and revoked_at is null", [id]);
}

/** Used by a password change: every other session the account had must stop working. */
export async function revokeAllRefreshTokens(pg: PostgresPool, userId: string): Promise<void> {
  await pg.query("update refresh_tokens set revoked_at = now() where user_id = $1 and revoked_at is null", [userId]);
}

/**
 * Rotation: the presented token is revoked and a new pair issued, so a refresh token is
 * single-use. A replay of the old one then fails, which is how a stolen token gets noticed.
 */
export async function rotateRefreshToken(
  pg: PostgresPool,
  env: ServerEnv,
  row: RefreshRow,
  user: { id: string; handle: string },
): Promise<TokenPair> {
  await revokeRefreshToken(pg, row.id);
  return issueTokenPair(pg, env, user);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
