# Royal Navy — setup from zero on Windows

> Generated from `Royal Navy 1080 v2.dc.html` — 49 options / 93 screens (Session 9 export) · 19 September 2026.

A two-to-six player board game for Android: play a stock board or build your own, write the rules
its cards draw from, publish it and host matches on it. React Native client, Fastify + Socket.IO
server, pure TypeScript rules engine shared by both.

This file gets you from a clean Windows machine to a running app and a signed APK. Everything used
here is free.

---

## 1. Install the toolchain

Install in this order. Reboot after Docker Desktop and after the JDK.

| Tool | Version | Where | Notes |
| --- | --- | --- | --- |
| Git | latest | git-scm.com | Enable "Git from the command line" |
| nvm-windows | latest | github.com/coreybutler/nvm-windows | Node version manager |
| Node | 20 LTS | `nvm install 20 && nvm use 20` | Node 20 exactly; 22 is untested here |
| pnpm | 9.x | `npm i -g pnpm@9` | Workspaces depend on it |
| Docker Desktop | latest | docker.com | WSL2 backend. Needed for Postgres + Redis |
| JDK 17 Temurin | 17.0.x | adoptium.net | Set `JAVA_HOME` |
| Android Studio | latest | developer.android.com | SDK 34, Build-Tools 34, Platform-Tools |
| Expo CLI | bundled | — | Use `pnpm dlx expo`, do not install globally |

### Environment variables (User, not System)

```
JAVA_HOME      C:\Program Files\Eclipse Adoptium\jdk-17.0.11.9-hotspot
ANDROID_HOME   C:\Users\<you>\AppData\Local\Android\Sdk
```

Append to `Path`:

```
%JAVA_HOME%\bin
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\emulator
%ANDROID_HOME%\tools\bin
```

Verify in a **new** terminal:

```powershell
node -v      # v20.x
pnpm -v      # 9.x
java -version # 17.0.x
adb version
docker ps
```

### The emulator

Android Studio → Device Manager → Create device → **Pixel 6** → system image **API 34 (Google APIs)**
→ name it exactly `Pixel_6_API_34`. Then:

```powershell
emulator -list-avds          # must print Pixel_6_API_34
emulator -avd Pixel_6_API_34
```

---

## 2. Clone and install

```powershell
git clone <your-repo-url> royal-navy
cd royal-navy
pnpm install
```

## 3. Start the databases

```powershell
docker compose up -d
docker compose ps        # postgres and redis both "running"
```

Postgres 16 listens on `5432`, Redis 7 on `6379`. Data lives in named Docker volumes, so
`docker compose down` keeps your data and `docker compose down -v` wipes it.

## 4. Environment file

```powershell
copy .env.example .env
```

The defaults in `.env.example` match `docker-compose.yml`, so local development needs no edits.
Every variable is documented in `docs/09-server-config.md`.

## 5. Migrate and seed

```powershell
pnpm --filter server migrate
pnpm --filter server seed
```

Seeding creates the official **Classic** board (11×11, 40 tiles), its four card decks, the rule
library entries those decks use, and three test accounts (`naveen`, `priya`, `arun`; password
`royalnavy`). See `docs/08-database.md`.

## 6. Run

Three terminals:

```powershell
pnpm dev:server     # Fastify on http://localhost:3000
pnpm dev:mobile     # Expo dev server
pnpm dev:engine     # game-engine in watch mode (optional)
```

With the emulator running, press `a` in the Expo terminal. The emulator reaches your host machine at
`10.0.2.2`, so `EXPO_PUBLIC_API_URL=http://10.0.2.2:3000` is the default for Android.

On a physical device over USB:

```powershell
adb reverse tcp:3000 tcp:3000
```

…then `http://localhost:3000` works on the device too.

## 7. Tests

```powershell
pnpm test              # everything
pnpm test:engine       # rules engine, must stay ≥90% lines
pnpm test:server       # API + socket integration (needs docker compose up)
pnpm test:mobile       # component tests
pnpm test:e2e          # Maestro flows, needs a running emulator
```

## 8. Build the APK

Short version:

```powershell
pnpm apk:release
```

The keystore, signing config, version bumping and the two build routes (`expo prebuild` + Gradle,
recommended; `eas build --local`, alternative) are in `docs/11-build-and-release.md`. Read it once
before your first build.

---

## Where to look

| Question | File |
| --- | --- |
| What is this app | `docs/00-overview.md` |
| How the pieces fit | `docs/01-architecture.md` |
| Exact colours, type, spacing | `docs/02-design-tokens.md` |
| A component's props and states | `docs/03-design-system.md` |
| Routes and back behaviour | `docs/04-navigation-map.md` |
| **Game rules and numbers** | `docs/05-game-rules.md` |
| Turn / auction / trade logic | `docs/06-state-machines.md` |
| REST + socket payloads | `docs/07-api-contract.md` |
| Tables, indexes, seeds | `docs/08-database.md` |
| Env vars, deploy | `docs/09-server-config.md` |
| Test strategy and gates | `docs/10-testing-strategy.md` |
| APK signing and release | `docs/11-build-and-release.md` |
| One screen in detail | `docs/screens/<id>-<name>.md` |
| One flow end to end | `docs/flows/<name>.md` |
| What is still undecided | `docs/OPEN-QUESTIONS.md` |

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `pnpm install` fails on `sharp`/`esbuild` | No build tools | `npm i -g windows-build-tools` is **not** needed on Node 20 — delete `node_modules` and retry with `pnpm install --ignore-scripts=false` |
| Metro: "Unable to resolve @royal-navy/game-engine" | Workspace not built | `pnpm --filter game-engine build` |
| App shows "Can't reach the deck" | Wrong host | Android emulator must use `10.0.2.2`, not `localhost` |
| Socket connects then drops every 30s | Two servers on 3000 | `netstat -ano | findstr :3000` and kill the stray PID |
| `JAVA_HOME is not set` in Gradle | Wrong terminal | Open a new terminal after setting env vars |
| Emulator boots to a black screen | Software renderer | Device Manager → Edit → Graphics: Hardware |
| Migrations hang | Postgres still starting | `docker compose logs postgres` and wait for "ready to accept connections" |
