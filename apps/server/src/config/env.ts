import { z } from "zod";

// Every variable from docs/09-server-config.md. Required ones have no default on purpose:
// a missing value must fail at boot naming the variable, never fall back to a hidden constant.
const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  PORT: z.coerce.number().int().min(0).max(65535),
  HOST: z.string().min(1),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),

  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL: z.string().default("30d"),
  ROOM_CODE_ALPHABET: z.string().default("ABCDEFGHJKLMNPQRSTUVWXYZ23456789"),
  MATCH_STATE_TTL: z.coerce.number().int().positive().default(86400),
  RECONNECT_GRACE_SECONDS: z.coerce.number().int().positive().default(90),
  MAX_PUBLISHED_BOARDS: z.coerce.number().int().positive().default(3),
  PROFANITY_LIST_PATH: z.string().default("./config/blocklist.txt"),
  TRADEMARK_LIST_PATH: z.string().default("./config/trademarks.txt"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  LOG_PRETTY: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  METRICS_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  CORS_ORIGINS: z.string().default("*"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Parses raw environment variables. Throws an Error whose message names the first
 * offending variable, so `index.ts` can print it and exit 1 (boot sequence step 1).
 */
export function parseEnv(raw: Record<string, string | undefined>): ServerEnv {
  const result = serverEnvSchema.safeParse(raw);
  if (result.success) {
    return result.data;
  }
  const first = result.error.issues[0];
  const variable = first?.path.join(".") ?? "unknown";
  const reason = first?.message ?? "invalid";
  throw new Error(`Invalid environment: ${variable} — ${reason}`);
}
