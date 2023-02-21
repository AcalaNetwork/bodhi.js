module.exports = {
  env: {
    browser: false,
    es2021: true
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/eslint-recommended'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 13,
    sourceType: 'module'
  },
  plugins: ['@typescript-eslint'],
  rules: {
    indent: [2, 2, { SwitchCase: 1 }],
    quotes: [2, 'single'],
    semi: [2, 'always'],
    'object-curly-spacing': [2, 'always'],
    'eol-last': [2, 'always'],
    'comma-dangle': [2, 'always-multiline'],

    /* ---------- turn off ---------- */
    '@typescript-eslint/no-extra-semi': 0,
    '@typescript-eslint/no-use-before-define': 0,
    '@typescript-eslint/explicit-member-accessibility': 0,
    '@typescript-eslint/naming-convention': 0,
    '@typescript-eslint/no-explicit-any': 0, // any is sometimes unavoidable
    '@typescript-eslint/consistent-type-definitions': 0, // can use Type and Interface
    '@typescript-eslint/explicit-function-return-type': 0, // type inference on return type is useful
    '@typescript-eslint/no-parameter-properties': 0,
    '@typescript-eslint/typedef': 0,
    'no-unused-expressions': 0 // short ciucuit if
  }
};
