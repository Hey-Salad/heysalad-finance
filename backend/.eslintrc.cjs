module.exports = {
  env: {
    es2021: true,
    node: true,
    jest: true
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  plugins: ['@typescript-eslint', 'prettier'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:prettier/recommended'],
  rules: {
    '@typescript-eslint/no-misused-promises': ['error'],
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    'prettier/prettier': ['error', { endOfLine: 'auto' }]
  }
};
