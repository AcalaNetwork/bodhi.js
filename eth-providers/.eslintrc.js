// This is a workaround for https://github.com/eslint/eslint/issues/3458
require('@rushstack/eslint-config/patch/modern-module-resolution');

module.exports = {
  extends: ['@rushstack/eslint-config/profile/node-trusted-tool'], // <---- put your profile string here
  parserOptions: { tsconfigRootDir: __dirname },
  rules: {
    eqeqeq: 'warn',
    '@typescript-eslint/explicit-member-accessibility': 'off',
    '@rushstack/typedef-var': 'off',
    '@typescript-eslint/naming-convention': 'off',
    '@typescript-eslint/no-use-before-define': 'warn'
  }
};
