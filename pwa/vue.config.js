// eslint-disable-next-line @typescript-eslint/no-var-requires
const StableStatus = require('./stable_status.json')

module.exports = {
  devServer: {
    proxy: {
      '^/api': {
        target: 'http://localhost:5002',
        changeOrigin: true,
        pathRewrite: {
          '^/api': ''
        }
      }
    }
  },
  chainWebpack: config => {
    config.module
      .rule('workerize')
      .before('js')
      .test(/\.worker\.(js|ts)$/)
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
        const constructTemplateParameters = args[0].templateParameters
        args[0].templateParameters = (compilation, assets, pluginOptions) => {
          const parameters = constructTemplateParameters(compilation, assets, pluginOptions)
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
    assetsVersion: 'MoVydmAfvrT9cZ7Q',
    manifestPath: 'https://pwd.floreina.me/site.webmanifest',
    iconPaths: {
      favicon32: 'img/icons/favicon-32x32.png',
      favicon16: 'img/icons/favicon-16x16.png',
      appleTouchIcon: 'img/icons/apple-touch-icon.png',
      maskIcon: 'img/icons/safari-pinned-tab.svg',
      msTileImage: 'img/icons/mstile-144x144.png'
    },
    workboxOptions: {
      navigateFallback: 'index.html'
    }
  }
}
