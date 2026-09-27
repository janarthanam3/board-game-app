// Password hashing with scrypt from Node's own crypto module.
//
// scrypt rather than bcrypt or argon2 because it is built into Node 20: no dependency, no native
// build step, and the APK/Windows-local constraint in CLAUDE.md Rule 3 stays satisfied. The
// parameters below are Node's documented defaults for interactive logins; they are stored *in* the
// hash string so a future change to them can still verify every old password.

import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number },
) => Promise<Buffer>;

const PARAMS = { N: 16_384, r: 8, p: 1 } as const;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

/** `scrypt$N$r$p$salt$key`, both halves base64. Self-describing, so old hashes stay verifiable. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await scrypt(password, salt, KEY_LENGTH, PARAMS);
  return `scrypt$${PARAMS.N}$${PARAMS.r}$${PARAMS.p}$${salt.toString("base64")}$${key.toString("base64")}`;
}

/**
 * Verifies a password against a stored hash. Returns false rather than throwing on a malformed or
 * unknown hash, so one corrupt row cannot turn a sign-in into a 500.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") {
    return false;
  }
  const [, rawN, rawR, rawP, rawSalt, rawKey] = parts;
  const N = Number(rawN);
  const r = Number(rawR);
  const p = Number(rawP);
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) {
    return false;
  }

  const salt = Buffer.from(rawSalt ?? "", "base64");
  const expected = Buffer.from(rawKey ?? "", "base64");
  if (salt.length === 0 || expected.length === 0) {
    return false;
  }

  let actual: Buffer;
  try {
    actual = await scrypt(password, salt, expected.length, { N, r, p });
  } catch {
    // Absurd stored parameters (a huge N) would otherwise throw out of a sign-in.
    return false;
  }
  // Constant-time: a length check first, because timingSafeEqual throws on a length mismatch.
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/**
 * A hash of a value nobody knows, verified against when the email is unrecognised. Without it,
 * sign-in returns much faster for an unknown address than for a wrong password, which tells an
 * attacker which addresses have accounts — the thing the identical error copy exists to hide.
 */
let decoyHash: string | null = null;

export async function verifyAgainstDecoy(password: string): Promise<void> {
  decoyHash ??= await hashPassword(randomBytes(32).toString("base64"));
  await verifyPassword(password, decoyHash);
}
