// @ts-check

import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig([
  {
    ignores: [
      'adr/**',
      '**/lib/**',
      '**/node_modules/**',
      '**/*.config.js',
      '**/*.test.ts',
      '**/*.spec.ts',
      '**/tests/**',
      '**/coverage/**',
      '**/*.config.ts',
    ],
  },
  {
    files: ['packages/**/*.ts'],
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
  },
]);
