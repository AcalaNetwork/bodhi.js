module.exports = {
  env: {
    browser: false,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 13,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'import', 'sort-imports-es6-autofix'],
  rules: {
    indent: [2, 2, { SwitchCase: 1 }],
    quotes: [2, 'single'],
    semi: [1, 'always'],
    'no-trailing-spaces': [2],
    'quote-props': [2, 'as-needed'],
    'eol-last': [2, 'always'],
    'object-curly-spacing': [2, 'always'],
    'comma-dangle': [2, {
      arrays: 'always-multiline',
      objects: 'always-multiline',
      imports: 'always-multiline',
      exports: 'always-multiline',
      functions: 'only-multiline',
    }],
    '@typescript-eslint/member-delimiter-style': 2,
    '@typescript-eslint/no-unused-vars': [1, {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_',
    }],
    'sort-imports-es6-autofix/sort-imports-es6': 1,

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
    '@typescript-eslint/no-non-null-assertion': 0,  // can assert not null
    'no-unused-expressions': 0, // short ciucuit if
    'max-lines': 0,
  },
};
