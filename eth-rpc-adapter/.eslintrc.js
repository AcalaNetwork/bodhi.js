// This is a workaround for https://github.com/eslint/eslint/issues/3458
require('@rushstack/eslint-config/patch/modern-module-resolution');

module.exports = {
  extends: ['@rushstack/eslint-config/profile/node-trusted-tool'], // <---- put your profile string here
  parserOptions: { tsconfigRootDir: __dirname },
  rules: {
    eqeqeq: 1,
    '@typescript-eslint/no-use-before-define': 1,

    '@typescript-eslint/explicit-member-accessibility': 0,
    '@rushstack/typedef-var': 0,
    '@typescript-eslint/naming-convention': 0,
    '@typescript-eslint/no-explicit-any': 0, // any is sometimes unavoidable
    '@typescript-eslint/consistent-type-definitions': 0, // can use Type and Interface
    '@rushstack/no-new-null': 0, // can use null as return type
    'no-unused-expressions': 0, // short ciucuit if
    '@typescript-eslint/explicit-function-return-type': 0, // type inference on return type is useful
    '@typescript-eslint/no-parameter-properties': 0,
    '@typescript-eslint/typedef': 0,
    '@typescript-eslint/no-use-before-define': 0
  }
};
