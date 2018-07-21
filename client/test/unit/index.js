import Vue from 'vue'

Vue.config.productionTip = false

// require all test files (files that ends with .spec.js)
const testsContext = require.context('../../source', true, /\.spec$/)
testsContext.keys().forEach(testsContext)

// require all source files except main.js for coverage.
// you can also change this to match only the subset of files that
// you want coverage for.
const sourceContext = require.context('../../source', true, /^\.\/(?!main(\.js)?$)/)
sourceContext.keys().forEach(sourceContext)
