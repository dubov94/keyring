// See http://vuejs-templates.github.io/webpack for documentation.
var path = require('path')

module.exports = {
  build: {
    env: require('./prod.env'),
    index: path.resolve(__dirname, '../dist/entry.html'),
    assetsRoot: path.resolve(__dirname, '../dist'),
    assetsSubDirectory: 'static',
    assetsPublicPath: '/',
    productionSourceMap: true,
    // Uses compression-webpack-plugin.
    productionGzip: false,
    productionGzipExtensions: ['js', 'css'],
    // Run the build command with an extra argument to view the bundle analyzer
    // report after build finishes: `npm run build --report`. Set to `true` or
    // `false` to always turn it on or off.
    bundleAnalyzerReport: process.env.npm_config_report,
    enableSwPrecache: false
  },
  dev: {
    env: require('./dev.env'),
    port: 8080,
    assetsSubDirectory: 'static',
    assetsPublicPath: '/',
    proxyTable: {
      '/api': {
        target: 'http://localhost',
        changeOrigin: true
      }
    },
    // See https://github.com/webpack/css-loader#sourcemap for reference.
    cssSourceMap: false
  }
}
