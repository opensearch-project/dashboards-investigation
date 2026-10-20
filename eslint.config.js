/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

const osdConfig = require('@elastic/eslint-config-kibana');
const { eui } = require('@elastic/eslint-config-kibana/extras');

const LICENSE_HEADER = `/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */`;

module.exports = [
  // Replaces .eslintignore (ESLint 10 no longer reads it).
  { ignores: ['node_modules', 'data', 'build', 'target', 'cypress.config.js', '**/*.d.ts'] },
  ...osdConfig,
  ...eui,
  {
    files: ['**/*.{js,mjs,ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': 0,
      '@osd/eslint/no-restricted-paths': [
        'error',
        {
          basePath: __dirname,
          zones: [
            {
              target: ['(public|server)/**/*'],
              from: ['../../packages/**/*', 'packages/**/*'],
            },
          ],
        },
      ],
      'jest/expect-expect': [
        'warn',
        {
          // Allow using custom expect test helpers as long as the name starts with `expect`.
          assertFunctionNames: ['expect*'],
        },
      ],
      '@osd/eslint/require-license-header': ['error', { licenses: [LICENSE_HEADER] }],
    },
  },
];
