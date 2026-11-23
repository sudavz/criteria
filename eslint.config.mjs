// @ts-check

import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig({
  files: ['**/*.ts'],
  ignores: [
    'adr/**',
    '**/lib/**',
    '**/node_modules/**',
    '**/*.config.js',
    '**/*.test.ts',
    '**/*.spec.ts',
    '**/tests/**',
    '**/coverage/**',
    'coverage/**',
    '**/*.config.ts',
  ],
  extends: [
    tseslint.configs.strict,
    tseslint.configs.stylistic,
    tseslint.configs.recommendedTypeChecked,
  ],
  languageOptions: {
    parserOptions: {
      projectService: true,
    },
  },
});
