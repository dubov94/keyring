module.exports = {
  // https://github.com/vuejs/vue-cli/issues/2176#issuecomment-421354721
  parallel: false,
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
    config.resolve.alias.set('canvas', 'lodash/noop')

    config.module
      .rule('workerize')
      .before('js')
      .test(/\.worker\.(js|ts)$/)
      .use('workerize-loader')
      .loader('workerize-loader')
      .end()

    config
      .plugin('html')
      .tap(args => {
        args[0].title = 'Parolica'
        const constructTemplateParameters = args[0].templateParameters
        args[0].templateParameters = (compilation, assets, pluginOptions) => {
          const parameters = constructTemplateParameters(compilation, assets, pluginOptions)
          parameters.APP_VERSION = '$STABLE_GIT_REVISION'
          parameters.MODE = process.env.NODE_ENV
          // https://developers.cloudflare.com/turnstile/frequently-asked-questions/#are-there-sitekeys-and-secret-keys-that-can-be-used-for-testing
          parameters.TURNSTILE_SITE_KEY = '1x00000000000000000000AA'
          if (parameters.MODE === 'production') {
            parameters.TURNSTILE_SITE_KEY = '0x4AAAAAAABCphzck0J8mHyD'
          }
          return parameters
        }
        return args
      })

    const svgRule = config.module.rule('svg')
    svgRule.uses.clear()
    svgRule
      .use('babel-loader')
      .loader('babel-loader')
      .end()
      .use('vue-svg-loader')
      .loader('vue-svg-loader')
  },
  pwa: {
    name: 'Parolica',
    themeColor: '#052842',
    // Recommended by Metro.
    msTileColor: '#2b5797',
    assetsVersion: 'c6c7a71c3f9d4ff5a0742bfecbda8123',
    // Disables manifest auto-generation. See
    // https://github.com/vuejs/vue-cli/blob/ea4c98ae84f20d410126707a1defc58a33998e8b/packages/@vue/cli-plugin-pwa/lib/HtmlPwaPlugin.js#L185
    manifestPath: 'https://parolica.com/site.webmanifest',
    iconPaths: {
      favicon32: 'assets/favicon-32x32.png',
      favicon16: 'assets/favicon-16x16.png',
      appleTouchIcon: 'assets/apple-touch-icon.png',
      maskIcon: 'assets/safari-pinned-tab.svg',
      msTileImage: 'assets/mstile-150x150.png'
    },
    workboxPluginMode: 'InjectManifest',
    workboxOptions: {
      swSrc: `${__dirname}/service_worker/service-worker.js`,
      // Derived from https://github.com/vuejs/vue-cli/pull/769.
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
