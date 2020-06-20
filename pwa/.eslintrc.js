module.exports = {
  root: true,
  env: {
    node: true
  },
  extends: [
    'plugin:vue/essential',
    '@vue/standard',
    '@vue/typescript/recommended'
  ],
  parserOptions: {
    ecmaVersion: 2020
  },
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-useless-constructor': 'off',
    '@typescript-eslint/camelcase': 'off',
    '@typescript-eslint/no-unused-vars': 'warn'
  },
  overrides: [
    {
      files: ['src/**/*.spec.{js,ts}'],
      env: {
        mocha: true
      },
      rules: {
        // For Chai's `expect(value).to.be.true`.
        'no-unused-expressions': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off'
      }
    }
  ]
}
