module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'import', 'sort-imports-es6-autofix'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
    'plugin:import/recommended',
    'plugin:import/typescript'
  ],
  rules: {
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    'sort-imports-es6-autofix/sort-imports-es6': 'warn',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    'no-useless-escape': 'off',
    '@typescript-eslint/no-non-null-asserted-optional-chain': 'off',
    'import/no-named-as-default-member': 'off',
    'import/no-named-as-default': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-unused-vars': [
      'off',
      // {
      //   argsIgnorePattern: '^_',
      //   varsIgnorePattern: '^_',
      //   caughtErrorsIgnorePattern: '^_'
      // }
    ]
  },
  settings: {
    'import/resolver': {
      typescript: {
        project: 'tsconfig.json'
      }
    }
  }
};
