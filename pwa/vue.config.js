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
        args[0].title = 'Key Ring'
        let constructTemplateParameters = args[0].templateParameters
        args[0].templateParameters = (compilation, assets, pluginOptions) => {
          let parameters = constructTemplateParameters(compilation, assets, pluginOptions)
          parameters.APP_VERSION = StableStatus.STABLE_GIT_REVISION
          return parameters
        }
        return args
      })
  },
  pwa: {
    name: 'Key Ring',
    themeColor: '#1976d2',
    msTileColor: '#2d89ef',
    assetsVersion: 'A0mpzYva75',
    manifestPath: 'site.webmanifest',
    iconPaths: {
      favicon32: 'img/icons/favicon-32x32.png',
      favicon16: 'img/icons/favicon-16x16.png',
      appleTouchIcon: 'img/icons/apple-touch-icon.png',
      maskIcon: 'img/icons/safari-pinned-tab.svg',
      msTileImage: 'img/icons/mstile-144x144.png'
    }
  }
}
