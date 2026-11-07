const { withAndroidManifest, withMainActivity } = require('@expo/config-plugins');

/**
 * Custom Expo config plugin to fix Android keyboard covering input issue
 * This plugin:
 * 1. Sets windowSoftInputMode to "adjustResize" in AndroidManifest.xml
 * 2. Adds WindowCompat.setDecorFitsSystemWindows to MainActivity
 */

const withAndroidKeyboardFix = (config) => {
  // Step 1: Modify AndroidManifest.xml
  config = withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const mainActivity = androidManifest.manifest.application[0].activity?.find(
      (activity) => activity.$['android:name'] === '.MainActivity'
    );

    if (mainActivity) {
      mainActivity.$['android:windowSoftInputMode'] = 'adjustResize';
    }

    return config;
  });

  // Step 2: Modify MainActivity to add WindowCompat.setDecorFitsSystemWindows
  config = withMainActivity(config, async (config) => {
    const { modResults } = config;
    let content = modResults.contents;

    // Add import for WindowCompat if not already present
    if (!content.includes('import androidx.core.view.WindowCompat')) {
      // Find the import section (after package declaration)
      const packageMatch = content.match(/(package .+?\n)/);
      if (packageMatch) {
        const insertPosition = packageMatch.index + packageMatch[0].length;
        content =
          content.slice(0, insertPosition) +
          'import androidx.core.view.WindowCompat\n' +
          content.slice(insertPosition);
      }
    }

    // Add WindowCompat.setDecorFitsSystemWindows in onCreate
    if (!content.includes('WindowCompat.setDecorFitsSystemWindows')) {
      // Find the super.onCreate call and add our code after it
      const superOnCreateMatch = content.match(/(super\.onCreate\([^)]*\))/);
      if (superOnCreateMatch) {
        const insertPosition = superOnCreateMatch.index + superOnCreateMatch[0].length;
        const indentation = '\n\n    ';
        const codeToAdd = `${indentation}// Enable proper keyboard handling for adjustResize
    WindowCompat.setDecorFitsSystemWindows(window, true)`;

        content =
          content.slice(0, insertPosition) +
          codeToAdd +
          content.slice(insertPosition);
      }
    }

    modResults.contents = content;
    return config;
  });

  return config;
};

module.exports = withAndroidKeyboardFix;
