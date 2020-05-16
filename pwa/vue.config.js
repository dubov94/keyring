module.exports = {
  indexPath: 'entry.html',
  '^/api': {
    target: 'http://localhost:5001',
    changeOrigin: true
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
  }
}
