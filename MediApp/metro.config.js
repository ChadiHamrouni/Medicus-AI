const { withNativeWind } = require('nativewind/metro');
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname);

// Add resolver to handle UUID version conflicts
config.resolver.alias = {
  ...config.resolver.alias,
  uuid: require.resolve('uuid'),
};

module.exports = withNativeWind(config, { input: './global.css' });
