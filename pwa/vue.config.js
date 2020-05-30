const StableStatus = require('./stable_status.json')

module.exports = {
  indexPath: 'entry.html',
  devServer: {
    proxy: {
      '^/api': {
        target: 'http://localhost:5001',
        changeOrigin: true
      }
    }
  },
  chainWebpack: config => {
    config.module
      .rule('workerize')
      .test(/\.worker\.js$/)
      .use('workerize-loader')
        .loader('workerize-loader')
        .options({
          inline: true
        })
        .end()

    config
      .plugin('html')
      .tap(args => {
        Object.assign(args[0], {
          title: 'Key Ring',
          appVersion: StableStatus.STABLE_GIT_REVISION
        })
        return args
      })
  }
}
