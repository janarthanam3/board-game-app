import { config as loadDotenv } from "dotenv";

import { buildApp } from "./app.js";
import { parseEnv } from "./config/env.js";

// .env lives at the repo root (README section 4). The first path that has a key wins, so a
// per-app .env can still override it while developing.
loadDotenv({ path: [".env", "../../.env"] });

// Boot sequence step 1: validate env and exit 1 naming the first missing variable.
let env;
try {
  env = parseEnv(process.env);
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}

const app = await buildApp(env);

try {
  // Step 6: listen on HOST:PORT. HOST is 0.0.0.0 locally so the Android emulator can reach it.
  await app.listen({ host: env.HOST, port: env.PORT });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
