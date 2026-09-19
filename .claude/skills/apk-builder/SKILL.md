---
name: apk-builder
description: Build and sign the Royal Navy Android APK locally on Windows with free tooling only. Use for any release build, version bump, keystore work, or build-failure debugging.
---

# APK builder

## Constraint

Free tooling only. No paid EAS builds, no paid CI minutes. Everything runs on the developer's
Windows machine with JDK 17 Temurin, Android Studio and the Pixel_6_API_34 AVD.

## Recommended path: `expo prebuild` + Gradle

This is the documented default because it needs no Expo account and no network at build time.

```powershell
# 1. generate the native project (once, and after any native config change)
pnpm --filter mobile exec expo prebuild --platform android --clean

# 2. build a signed release
cd apps/mobile/android
./gradlew assembleRelease

# 3. the artifact
# apps/mobile/android/app/build/outputs/apk/release/app-release.apk
```

## Alternative: `eas build --local`

Works offline and free, but pulls a large Docker-less local toolchain and is slower on Windows.
Use only if `prebuild` cannot produce a working native project.

```powershell
pnpm --filter mobile exec eas build --platform android --local --profile production
```

## Keystore

Generate once, then never regenerate — a lost keystore means a new app listing.

```powershell
keytool -genkeypair -v -storetype PKCS12 `
  -keystore royal-navy-release.keystore `
  -alias royal-navy -keyalg RSA -keysize 2048 -validity 10000
```

Store the keystore **outside the repository**. Put its path and passwords in
`apps/mobile/android/gradle.properties` (git-ignored) or in environment variables:

```
ROYAL_NAVY_UPLOAD_STORE_FILE=C:\keys\royal-navy-release.keystore
ROYAL_NAVY_UPLOAD_KEY_ALIAS=royal-navy
ROYAL_NAVY_UPLOAD_STORE_PASSWORD=...
ROYAL_NAVY_UPLOAD_KEY_PASSWORD=...
```

Never commit a keystore, a password, or a `gradle.properties` containing one. Back the keystore up
somewhere you control.

## Versioning

- `app.json` → `expo.version` is the user-visible version (`1.0.0`).
- `expo.android.versionCode` is an integer, incremented on **every** build that leaves the machine.
- Both are surfaced in the app on `3f` Settings as `Royal Navy <version> · build <versionCode>`.
  That line is read from the app config — never hard-code it.

## Before you build a release

- [ ] All phase gates in `TASKS.md` are green.
- [ ] `versionCode` incremented.
- [ ] `EXPO_PUBLIC_API_URL` points at the intended server.
- [ ] Release build uses the release keystore, not the debug one.
- [ ] Proguard/R8 rules verified — the engine package must not be stripped.

## After the build

- [ ] Install on a clean device: `adb install -r app-release.apk`.
- [ ] Complete one full match on the installed APK.
- [ ] Check the Settings build line matches the build.
- [ ] Record the version, build number and date in `docs/11-build-and-release.md`.

## Common failures

| Symptom | Cause | Fix |
| --- | --- | --- |
| `SDK location not found` | `local.properties` missing | write `sdk.dir=C\:\\Users\\<you>\\AppData\\Local\\Android\\Sdk` |
| `Unsupported class file major version` | wrong JDK | use JDK 17 Temurin; check `java -version` |
| `Duplicate class` after adding a dependency | stale prebuild | re-run `expo prebuild --clean` |
| App installs but shows a blank screen | release build pointing at a dev bundle URL | check `EXPO_PUBLIC_API_URL` and that the JS bundle is embedded |
| Signing works locally, install refused on device | debug and release signatures differ | uninstall the old build first |
