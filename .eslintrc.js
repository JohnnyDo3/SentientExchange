module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier', // Must be last to override other configs
  ],
  rules: {
    // Relaxed rules for gradual adoption
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-floating-promises': 'warn',
    '@typescript-eslint/no-misused-promises': 'warn',
    '@typescript-eslint/await-thenable': 'warn',
    '@typescript-eslint/require-await': 'off',
    '@typescript-eslint/no-unnecessary-type-assertion': 'off',
    '@typescript-eslint/prefer-nullish-coalescing': 'off',
    '@typescript-eslint/prefer-optional-chain': 'off',
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/restrict-template-expressions': 'off',
    '@typescript-eslint/no-namespace': 'off',

    // Import rules - relaxed
    'import/order': 'off', // Turn off for now, too many violations
    'import/no-unresolved': 'off',
    'import/no-cycle': 'off',
    'import/no-duplicates': 'warn',
    'import/no-named-as-default-member': 'off',

    // General rules - relaxed
    'no-console': 'off', // Allow console for now
    'no-debugger': 'warn',
    'prefer-const': 'warn',
    'no-var': 'error',
    eqeqeq: 'off',
    curly: 'off',
    'no-throw-literal': 'off',
  },
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json',
      },
    },
  },
  ignorePatterns: [
    'dist',
    'node_modules',
    'coverage',
    '*.config.js',
    '*.config.ts',
    'data',
    'examples',
    '.next',
  ],
};
