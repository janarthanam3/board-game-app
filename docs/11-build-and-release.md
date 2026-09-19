# 11 · Build and release — free path only

> Generated from `Royal Navy 1080 v2.dc.html` — 49 options / 93 screens (Session 9 export) · 19 September 2026.

Everything here runs on the developer's Windows machine with free tooling. No paid EAS build, no
paid CI. GitHub Actions is used only inside the free monthly allowance and never for the release
build.

## Recommendation

Use **`expo prebuild` + Gradle `assembleRelease`**. It is the fully local route, needs nothing but
the JDK and the Android SDK already installed, produces a normal Android project you can debug, and
never touches a remote build service. `eas build --local` is documented as the alternative because
it reproduces EAS's exact build recipe, but it wants Docker-like isolation and is slower on Windows.

---

## 1. Generate a keystore (once, and never lose it)

```powershell
mkdir -p apps/mobile/android/keystores
keytool -genkeypair -v ^
  -keystore apps/mobile/android/keystores/royal-navy-release.keystore ^
  -alias royal-navy ^
  -keyalg RSA -keysize 2048 -validity 10950 ^
  -storetype JKS
```

Answer the prompts; CN can be your name. Record the store password and key password in your password
manager. **The keystore file and its passwords are the app's identity** — losing them means the app
can never be updated under the same package name.

`.gitignore` must contain:

```
apps/mobile/android/keystores/*.keystore
apps/mobile/android/gradle.properties.local
```

Passwords go in `%USERPROFILE%\.gradle\gradle.properties` (outside the repo):

```properties
ROYAL_NAVY_STORE_FILE=royal-navy-release.keystore
ROYAL_NAVY_STORE_PASSWORD=<store password>
ROYAL_NAVY_KEY_ALIAS=royal-navy
ROYAL_NAVY_KEY_PASSWORD=<key password>
```

## 2. app.json / app.config.ts

```json
{
  "expo": {
    "name": "Royal Navy",
    "slug": "royal-navy",
    "version": "1.0.0",
    "orientation": "portrait",
    "userInterfaceStyle": "dark",
    "backgroundColor": "#0B2456",
    "android": {
      "package": "com.royalnavy.game",
      "versionCode": 1,
      "minSdkVersion": 26,
      "compileSdkVersion": 34,
      "targetSdkVersion": 34,
      "adaptiveIcon": { "backgroundColor": "#0B2456" },
      "permissions": ["INTERNET"],
      "blockedPermissions": ["RECORD_AUDIO", "CAMERA", "ACCESS_FINE_LOCATION"]
    },
    "assetBundlePatterns": ["**/*"],
    "plugins": ["expo-font"]
  }
}
```

The app requests **no** runtime permissions. `INTERNET` is install-time only.

## 3. Signing config

After `pnpm --filter mobile exec expo prebuild --platform android`, edit
`apps/mobile/android/app/build.gradle`:

```gradle
android {
    signingConfigs {
        release {
            storeFile file("../keystores/" + (project.findProperty("ROYAL_NAVY_STORE_FILE") ?: "missing.keystore"))
            storePassword project.findProperty("ROYAL_NAVY_STORE_PASSWORD")
            keyAlias project.findProperty("ROYAL_NAVY_KEY_ALIAS")
            keyPassword project.findProperty("ROYAL_NAVY_KEY_PASSWORD")
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro"
        }
    }
}
```

`prebuild` regenerates `android/`, so either commit the `android/` folder (simplest for a solo dev,
and what this project does) or move the signing block into an Expo config plugin. Committing it is
recommended here; note in the commit message that `android/` is generated and hand-edited.

## 4. Build

```powershell
pnpm --filter mobile exec expo prebuild --platform android
cd apps/mobile/android
./gradlew.bat clean
./gradlew.bat assembleRelease
```

Output: `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`.

Wrapped as a script — `pnpm apk:release` runs the three commands and copies the APK to
`dist/royal-navy-<version>-<versionCode>.apk`.

Verify before shipping:

```powershell
# signature present and v2 scheme
%ANDROID_HOME%\build-tools\34.0.0\apksigner.bat verify -v dist\royal-navy-1.0.0-1.apk
# install on the emulator
adb install -r dist\royal-navy-1.0.0-1.apk
```

## 5. Alternative — `eas build --local`

```powershell
pnpm dlx eas-cli@latest build --platform android --profile production --local
```

`eas.json`:

```json
{
  "cli": { "version": ">= 12.0.0" },
  "build": {
    "production": {
      "android": { "buildType": "apk", "gradleCommand": ":app:assembleRelease" },
      "env": { "EXPO_PUBLIC_ENV": "production" }
    },
    "preview": {
      "android": { "buildType": "apk", "gradleCommand": ":app:assembleDebug" },
      "developmentClient": false
    }
  }
}
```

`--local` never uses EAS build minutes. It still requires the local JDK and SDK, and it downloads
its own Gradle, so the first run is slow. Credentials come from `credentials.json` pointing at the
same keystore.

## 6. Versioning

| Field | Rule |
| --- | --- |
| `version` | Semantic, human-facing. Feature phase completes → minor bump. |
| `versionCode` | Integer, **+1 every build you install anywhere but your own emulator**. Never reused. |
| Git tag | `v<version>+<versionCode>`, e.g. `v1.0.0+7` |

`pnpm release:bump patch|minor|major` bumps `version`, increments `versionCode`, writes both to
`app.json`, updates `CHANGELOG.md` from commit subjects since the last tag, and creates the tag.

## 7. Release checklist

1. `pnpm test` green, engine coverage ≥ 90%.
2. `docs/bug-log.md` has no open Sev-1 or Sev-2.
3. The phase gate for the phase being shipped is ticked in `TASKS.md`.
4. `/design-check` clean on every screen touched since the last release.
5. `pnpm release:bump`, then `pnpm apk:release`.
6. `apksigner verify`, install on Pixel_6_API_34 **and** one physical device.
7. Smoke script: sign in → host → join from second device → complete a 3-round match → result screen.
8. Attach the APK to a GitHub release with the changelog section.

## 8. What is deliberately not here

- Play Store upload (AAB, Play Console fee) — out of v1 scope; the deliverable is a signed APK.
- OTA updates (`expo-updates`) — free tier exists but adds a runtime dependency on a hosted service;
  out of v1.
- Crash reporting SaaS — see `docs/14-analytics-and-logging.md` for the local-only approach.
