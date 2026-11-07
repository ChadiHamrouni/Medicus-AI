// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'node_modules/*'],
    rules: {
      // Production readiness rules
      'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
      'no-debugger': 'error',
      'no-alert': 'warn',

      // Security rules
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',

      // Code quality rules
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'always'],

      // React Native specific
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/rules-of-hooks': 'error',

      // Medical app specific - sensitive data handling
      'no-restricted-globals': [
        'error',
        {
          name: 'localStorage',
          message: 'Use expo-secure-store for sensitive data storage',
        },
      ],
    },
  },
]);
