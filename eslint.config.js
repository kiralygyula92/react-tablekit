// @ts-check
import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/node_modules/**',
      'apps/site/public/mockServiceWorker.js',
      'apps/site/playwright-report/**',
      'apps/site/test-results/**',
      // Build-only ambient declaration; it is in tsconfig.build.json, not in the lint project.
      'packages/react-tablekit/types/**',
    ],
  },

  // Plain JS / config scripts.
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [js.configs.recommended],
    languageOptions: { globals: { ...globals.node } },
  },

  // All TypeScript: strict + type-checked.
  {
    files: ['**/*.{ts,tsx}'],
    extends: [...tseslint.configs.strictTypeChecked, ...tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
      globals: { ...globals.browser },
    },
    plugins: { 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
      // `x || undefined` on booleans is how data-* attributes are omitted.
      '@typescript-eslint/prefer-nullish-coalescing': [
        'error',
        { ignorePrimitives: { boolean: true } },
      ],
      // Index access is checked by `noUncheckedIndexedAccess`; `!` documents a known-present value.
      '@typescript-eslint/no-non-null-assertion': 'off',
      // State maps (selection, expansion, sizing) are plain records keyed by row/column id.
      '@typescript-eslint/no-dynamic-delete': 'off',
      // Instance and row APIs are closures / prototype methods designed to be called unbound.
      '@typescript-eslint/unbound-method': 'off',
      // Handlers are `void | Promise<void>` by contract (06 §5).
      '@typescript-eslint/no-invalid-void-type': 'off',
      // Public generic signatures are prescribed by the API reference (e.g. `getValue<TValue>`).
      '@typescript-eslint/no-unnecessary-type-parameters': 'off',
    },
  },

  // Library source: no `any` escape hatches without an explicit disable + reason; no console.
  {
    files: ['packages/react-tablekit/src/**/*.{ts,tsx}'],
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },

  // Core must stay framework-agnostic (docs/02 §3).
  {
    files: ['packages/react-tablekit/src/core/**/*.ts'],
    rules: {
      // Prototype row methods alias `this` for the closures they create.
      '@typescript-eslint/no-this-alias': 'off',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react/*', 'react-dom/*', '../react/*'],
              message: 'core must not depend on React.',
            },
          ],
        },
      ],
    },
  },

  // Tests and tooling config: relax a few rules that fight test idioms.
  {
    files: [
      '**/test/**/*.{ts,tsx}',
      '**/*.test.{ts,tsx}',
      '**/*.test-d.ts',
      '**/e2e/**/*.ts',
      '**/*.config.ts',
    ],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      'react-hooks/rules-of-hooks': 'off',
      // Fixtures attach click handlers to plain elements to assert event propagation.
      'jsx-a11y/click-events-have-key-events': 'off',
      'jsx-a11y/no-static-element-interactions': 'off',
    },
  },
);
