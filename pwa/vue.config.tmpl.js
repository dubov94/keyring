module.exports = {
  transpileDependencies: [
    'vuetify'
  ],
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
          parameters.APP_VERSION = '$STABLE_GIT_REVISION'
          parameters.MODE = process.env.NODE_ENV
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
    // Disables manifest auto-generation. See
    // https://github.com/vuejs/vue-cli/blob/dev/packages/%40vue/cli-plugin-pwa/lib/HtmlPwaPlugin.js#L168.
    manifestPath: 'https://pwd.floreina.me/site.webmanifest',
    iconPaths: {
      favicon32: 'img/icons/favicon-32x32.png',
      favicon16: 'img/icons/favicon-16x16.png',
      appleTouchIcon: 'img/icons/apple-touch-icon.png',
      maskIcon: 'img/icons/safari-pinned-tab.svg',
      msTileImage: 'img/icons/mstile-144x144.png'
    },
    workboxPluginMode: 'InjectManifest',
    workboxOptions: {
      swSrc: `${__dirname}/service_worker/service-worker.js`,
      // Inherited from https://github.com/vuejs/vue-cli/pull/769.
      exclude: [
        'robots.txt',
        'favicon.ico',
        /^img\/icons\//,
        'browserconfig.xml',
        'site.webmanifest',
        /\.map$/,
        'metadata.json'
      ]
    }
  }
}
