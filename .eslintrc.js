module.exports = {
  root: true,
  env: { node: true },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'import', 'sort-imports-es6-autofix'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
  ],
  rules: {
    /* -------------------- error -------------------- */
    indent: [2, 2, { SwitchCase: 1 }],
    quotes: [2, 'single'],
    'no-trailing-spaces': [2],
    'quote-props': [2, 'as-needed'],
    'arrow-parens': [2, 'as-needed'],
    'eol-last': [2, 'always'],
    'object-curly-spacing': [2, 'always'],
    'comma-dangle': [2, {
      arrays: 'always-multiline',
      objects: 'always-multiline',
      imports: 'always-multiline',
      exports: 'always-multiline',
      functions: 'only-multiline',
    }],

    /* -------------------- warn -------------------- */
    semi: [1, 'always'],
    '@typescript-eslint/no-unused-vars': [1, {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_',
    }],
    'sort-imports-es6-autofix/sort-imports-es6': 1,
    'max-len': [1, {
      code: 120,
      ignoreComments: true,
      ignoreStrings: true,
      ignoreTemplateLiterals: true,
    }],

    /* -------------------- off -------------------- */
    '@typescript-eslint/no-extra-semi': 0,
    '@typescript-eslint/no-use-before-define': 0,
    '@typescript-eslint/explicit-member-accessibility': 0,
    '@typescript-eslint/naming-convention': 0,
    '@typescript-eslint/no-explicit-any': 0,                // any is sometimes unavoidable
    '@typescript-eslint/consistent-type-definitions': 0,    // can use Type and Interface
    '@typescript-eslint/explicit-function-return-type': 0,  // type inference on return type is useful
    '@typescript-eslint/no-parameter-properties': 0,
    '@typescript-eslint/typedef': 0,
    '@typescript-eslint/no-non-null-assertion': 0,          // can assert not null
    '@typescript-eslint/no-empty-function': 0,
    '@typescript-eslint/explicit-module-boundary-types': 0,
    '@typescript-eslint/ban-ts-comment': 0,
    '@typescript-eslint/no-non-null-asserted-optional-chain': 0,
    '@typescript-eslint/no-unused-expressions': 0,          // short circuit if
    'import/no-named-as-default-member': 0,
    'import/no-named-as-default': 0,
    'no-unused-expressions': 0,                             // short ciucuit if
    'no-useless-escape': 0,
    'max-lines': 0,
  },
  settings: {
    'import/resolver': {
      typescript: {
        project: 'tsconfig.json',
      },
    },
  },
  ignorePatterns: [
    '**/e2e-truffle/**',
  ],
};
