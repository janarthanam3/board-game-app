// The error envelope from docs/07-api-contract.md and the codes from docs/13-error-catalog.md.
//
// docs/07: errors are `{ error: { code, message, details? } }` with codes from the catalog. The copy
// below is quoted from the catalog, so the client can show it as-is when it has no copy of its own.
// Nothing here invents a code: a code that is not in the catalog has no business leaving the server.

import type { FastifyReply } from "fastify";

/** Every catalog code the auth routes can emit, with its documented status and copy. */
const CATALOG = {
  E_RATE_LIMITED: { status: 429, message: "Too many tries. Wait a moment." },
  E_UNAUTHENTICATED: { status: 401, message: "Please sign in again." },
  E_FORBIDDEN: { status: 403, message: "You can't do that." },
  E_EMAIL_TAKEN: { status: 409, message: "That email is already registered." },
  E_HANDLE_TAKEN: { status: 409, message: "That handle is taken." },
  E_HANDLE_INVALID: { status: 422, message: "Handles use letters, numbers and underscores, 3–20 characters." },
  E_CREDENTIALS_INVALID: { status: 401, message: "Email or password is wrong." },
  E_PASSWORD_WEAK: { status: 422, message: "Use at least 8 characters." },
  E_PASSWORD_WRONG: { status: 401, message: "Current password is wrong." },
  E_ACCOUNT_DELETED: { status: 410, message: "This account was deleted." },
  E_VALIDATION: { status: 422, message: "That doesn't look right." },
} as const;

export type ErrorCode = keyof typeof CATALOG;

export function statusFor(code: ErrorCode): number {
  return CATALOG[code].status;
}

export function messageFor(code: ErrorCode): string {
  return CATALOG[code].message;
}

/**
 * Sends the documented envelope. `details` carries machine-readable extras (a zod issue path, for
 * instance) and is omitted entirely when there are none, because docs/07 marks it optional.
 */
export function sendError(reply: FastifyReply, code: ErrorCode, details?: unknown): FastifyReply {
  const body = {
    error: {
      code,
      message: messageFor(code),
      ...(details === undefined ? {} : { details }),
    },
  };
  return reply.status(statusFor(code)).send(body);
}

/**
 * An error a route handler can throw to unwind to the envelope, for the cases where returning a
 * reply would mean threading a result back through several helpers.
 */
export class HttpError extends Error {
  readonly code: ErrorCode;
  readonly details: unknown;

  constructor(code: ErrorCode, details?: unknown) {
    super(messageFor(code));
    this.name = "HttpError";
    this.code = code;
    this.details = details;
  }
}
