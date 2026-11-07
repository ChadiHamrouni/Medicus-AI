# Expo Config Plugins

This directory contains custom Expo config plugins that modify native code during the build process.

## withAndroidKeyboardFix.js

**Purpose:** Fixes the Android keyboard covering text input issue in chat screens.

**What it does:**
1. Sets `android:windowSoftInputMode="adjustResize"` in AndroidManifest.xml
2. Adds `WindowCompat.setDecorFitsSystemWindows(window, true)` to MainActivity.kt

**Why this is needed:**
- On Android 11+, apps run in edge-to-edge mode by default
- This can interfere with `adjustResize` working properly
- The plugin ensures the keyboard properly resizes the window instead of covering the input

**Usage:**
This plugin is automatically applied during `eas build` and `expo prebuild`.
No manual intervention needed - just build as normal.

**Testing:**
After making changes to this plugin, test with:
```bash
npx expo prebuild --clean
npx expo run:android
```

**Note:**
The `android/` and `ios/` folders are gitignored. This plugin ensures your native code modifications persist across builds without committing the entire native folders.
