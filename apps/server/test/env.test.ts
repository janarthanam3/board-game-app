import { describe, expect, it } from "vitest";

import { parseEnv } from "../src/config/env.js";
import { testEnv } from "./helpers.js";

describe("environment validation", () => {
  it("accepts the documented local values", () => {
    const env = parseEnv(testEnv());
    expect(env.PORT).toBe(0);
    expect(env.HOST).toBe("127.0.0.1");
  });

  it("fills the documented defaults for optional variables", () => {
    const env = parseEnv(testEnv());
    expect(env.RECONNECT_GRACE_SECONDS).toBe(90);
    expect(env.ROOM_CODE_ALPHABET).toBe("ABCDEFGHJKLMNPQRSTUVWXYZ23456789");
    expect(env.LOG_LEVEL).toBe("silent");
  });

  it("fails fast naming the first missing required variable", () => {
    const withoutRedis = testEnv();
    delete withoutRedis["REDIS_URL"];
    expect(() => parseEnv(withoutRedis)).toThrow(/REDIS_URL/);
  });
});
