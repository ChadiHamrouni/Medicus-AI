module.exports = function (api) {
  api.cache(true);

  const isProduction = process.env.NODE_ENV === 'production';

  const plugins = [];

  // Remove console statements in production builds
  if (isProduction) {
    plugins.push(['transform-remove-console', { exclude: ['error', 'warn'] }]);
  }

  // Reanimated Worklets plugin must be listed last
  plugins.push('react-native-worklets/plugin');

  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins,
  };
};
