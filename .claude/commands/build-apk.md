---
description: Build a signed release APK locally on Windows, free tooling only.
---

# /build-apk

Load the `apk-builder` skill and follow it. Do not improvise a build path.

1. Pre-flight:
   - every phase gate in `TASKS.md` that precedes H3 is green;
   - working tree clean;
   - `java -version` reports JDK 17 Temurin;
   - the keystore path and passwords resolve from the environment or the git-ignored
     `gradle.properties`;
   - `EXPO_PUBLIC_API_URL` points at the intended server.
2. Bump `expo.android.versionCode` by one. Confirm `expo.version` is what the release should show.
3. `pnpm --filter mobile exec expo prebuild --platform android --clean`
4. `cd apps/mobile/android && ./gradlew assembleRelease`
5. Report the artifact path and its size.
6. Post-build checks:
   - `adb install -r app-release.apk` on a clean device or the Pixel_6_API_34 AVD;
   - launch, sign in, complete one match;
   - Settings shows `Royal Navy <version> · build <versionCode>` matching this build.
7. Append the version, build number, date and artifact hash to `docs/11-build-and-release.md`.

If the build fails, consult the failure table in the `apk-builder` skill first. If the error is not
listed, dispatch the `web-researcher` agent with the exact error string and the pinned versions —
never disable a check or downgrade a dependency to make it pass without reporting why.
