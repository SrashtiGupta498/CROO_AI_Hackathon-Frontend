// @ts-check
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    // Build output, reports and vendored content are not ours to lint.
    ignores: [
      'dist/**',
      'playwright-report/**',
      'test-results/**',
      'scripts/article-restructure/output/**',
      'scratch/**',
      'data/**',
      'public/**',
    ],
  },

  js.configs.recommended,

  // Deliberately the NON type-checked preset. The backend runs
  // `recommendedTypeChecked` and that reports ~900 `no-unsafe-*` errors there
  // — all of them about `any` rather than about broken code. Turning it on
  // here, on a codebase that has never had a linter, would bury the rules that
  // actually catch bugs. Tighten later, file by file, once this baseline is
  // clean.
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.es2022 },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,

      // Fast Refresh only works when a module exports components and nothing
      // else; constants are the common, harmless exception.
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],

      // The codebase leans on `any` in API payloads on purpose — flagging
      // every one is noise, not a finding.
      '@typescript-eslint/no-explicit-any': 'off',

      // Match the backend: a leading underscore means "destructured only to be
      // discarded", and without these patterns the rule reports every one.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },

  // Node scripts and config files run outside the browser.
  {
    files: ['*.{js,ts}', 'scripts/**/*.{js,ts,cjs,mjs}', 'e2e/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
  },

  // `.cjs` is CommonJS by definition, so `require` is the correct syntax
  // there — the rule exists to stop it leaking into ESM, not to ban the
  // format outright.
  {
    files: ['**/*.cjs'],
    languageOptions: { sourceType: 'commonjs' },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },

  // Must stay last: switches off every stylistic rule prettier already owns.
  prettier,
);
