import 'dotenv/config';

// Everything deployment-specific (API keys, EAS project, bundle ids) comes from
// environment variables so the repository itself contains no private values.
// See MediApp/.env.example.
const env = process.env;

export default ({ config }) => {
  const mapsKey = env.GOOGLE_MAPS_API_KEY;
  const easProjectId = env.EAS_PROJECT_ID;
  const bundleId = env.APP_BUNDLE_ID || config.ios?.bundleIdentifier;

  return {
    ...config,
    ...(env.EXPO_OWNER ? { owner: env.EXPO_OWNER } : {}),
    ...(easProjectId ? { updates: { url: `https://u.expo.dev/${easProjectId}` } } : {}),
    plugins: [...(config.plugins || []), 'expo-video', 'expo-audio', '@config-plugins/react-native-webrtc'],
    extra: {
      ...config.extra,
      ...(easProjectId ? { eas: { projectId: easProjectId } } : {}),
      EXPO_PUBLIC_MEDICUS_API_BASE_URL: env.EXPO_PUBLIC_MEDICUS_API_BASE_URL,
      SENTRY_DSN: env.EXPO_PUBLIC_SENTRY_DSN,
      NODE_ENV: env.NODE_ENV || 'development',
      APP_VERSION: config.version || '1.0.0',
      APP_NAME: config.name || 'Medicus',
    },
    ios: {
      ...config.ios,
      bundleIdentifier: bundleId,
      ...(mapsKey ? { config: { ...config.ios?.config, googleMapsApiKey: mapsKey } } : {}),
      infoPlist: {
        ...config.ios?.infoPlist,
        NSMicrophoneUsageDescription:
          'Allow Medicus to access your microphone for voice messages.',
      },
    },
    android: {
      ...config.android,
      package: env.APP_BUNDLE_ID || config.android?.package,
      ...(mapsKey ? { config: { ...config.android?.config, googleMaps: { apiKey: mapsKey } } } : {}),
    },
  };
};
