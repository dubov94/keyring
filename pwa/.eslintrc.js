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
    },
    {
      files: ['src/api/definitions/*.{js,ts}'],
      rules: {
        'comma-dangle': 'off',
        'comma-spacing': 'off',
        'indent': 'off',
        'no-multi-spaces': 'off',
        'no-multiple-empty-lines': 'off',
        'no-trailing-spaces': 'off',
        'padded-blocks': 'off',
        'quotes': 'off',
        'semi': 'off',
        'space-before-function-paren': 'off',
        'node/no-deprecated-api': 'off',
        '@typescript-eslint/consistent-type-assertions': 'off',
        '@typescript-eslint/no-empty-interface': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/triple-slash-reference': 'off'
      }
    }
  ]
}
