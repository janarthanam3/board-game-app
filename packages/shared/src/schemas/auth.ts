// Request and response schemas for the auth routes in docs/07-api-contract.md §REST/Auth.
//
// The contract says the schema *is* the contract and both sides import it, so these live here in
// packages/shared rather than in the server. Field names, and the shapes of User and the token pair,
// come straight from that table — nothing here is the server's own idea.

import { z } from "zod";

/**
 * The handle rule is the one the database enforces (`users.handle` check constraint in
 * 0001_init.sql) and the one E_HANDLE_INVALID's copy describes: letters, numbers and underscores,
 * 3–20 characters. Lower case only, because the column's regex is.
 */
export const handleSchema = z
  .string()
  .regex(/^[a-z0-9_]{3,20}$/, "handles use letters, numbers and underscores, 3-20 characters");

/**
 * "Use at least 8 characters" is E_PASSWORD_WEAK's copy, and 1a §5 validates an 8-character minimum
 * before it sends anything. 1a also asks sign-up for "one letter and one digit"; that is client-side
 * validation the screen states, so it is not duplicated here — see the note in docs/design-concerns.
 */
export const passwordSchema = z.string().min(8, "use at least 8 characters");

export const emailSchema = z.string().email().max(320);

export const signupBodySchema = z.object({
  handle: handleSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const signinBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

export const refreshBodySchema = z.object({
  refreshToken: z.string().min(1),
});

export const signoutBodySchema = refreshBodySchema;

/** `1a` §5: "Forgot password?" posts the email and always gets the same answer back. */
export const forgotBodySchema = z.object({
  email: emailSchema,
});

export const changePasswordBodySchema = z.object({
  current: z.string().min(1),
  next: passwordSchema,
});

/** `User` exactly as docs/07 declares it. */
export const userSchema = z.object({
  id: z.string(),
  handle: z.string(),
  displayName: z.string(),
  email: z.string(),
  createdAt: z.string(),
  publishedBoardCount: z.number().int().nonnegative(),
});

/**
 * `PATCH /me` — docs/07's body is `{ displayName? }` and nothing else. `.strict()`, so an attempt to
 * change a handle or an email through this route is a refusal rather than a silently dropped field.
 */
export const updateMeBodySchema = z.object({ displayName: z.string().min(1).max(40).optional() }).strict();

/**
 * `Stats` exactly as docs/07 declares it.
 *
 * `winRate` is a **whole-number percentage**, which is `3e`'s acceptance criterion 2 ("win rate is a
 * whole-number percentage") and its drawn value `37%`. docs/07 only names the field.
 *
 * What these count is what the server has, which is online matches: solo and pass-and-play never leave
 * the device (D5), so nothing else could be counted today. **OQ-9** decides whether that stays true.
 */
export const statsSchema = z.object({
  matchesPlayed: z.number().int().nonnegative(),
  wins: z.number().int().nonnegative(),
  winRate: z.number().int().min(0).max(100),
  netWorthBest: z.number().int(),
  boardsPublished: z.number().int().nonnegative(),
});

export const tokenPairSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

export const authResultSchema = tokenPairSchema.extend({
  user: userSchema,
});

export type SignupBody = z.infer<typeof signupBodySchema>;
export type SigninBody = z.infer<typeof signinBodySchema>;
export type RefreshBody = z.infer<typeof refreshBodySchema>;
export type ForgotBody = z.infer<typeof forgotBodySchema>;
export type ChangePasswordBody = z.infer<typeof changePasswordBodySchema>;
export type User = z.infer<typeof userSchema>;
export type TokenPair = z.infer<typeof tokenPairSchema>;
export type AuthResult = z.infer<typeof authResultSchema>;
