require('babel-register')

module.exports = {
  src_folders: ['test/e2e/scenarios'],
  page_objects_path: 'test/e2e/pages',
  output_folder: 'test/e2e/reports',
  selenium: {
    start_process: true,
    server_path: require('selenium-server').path,
    host: '127.0.0.1',
    port: 4444,
    cli_args: {
      'webdriver.chrome.driver': require('chromedriver').path
    }
  },
  test_settings: {
    default: {
      launch_url: 'http://localhost:8080',
      selenium_port: 4444,
      selenium_host: 'localhost',
      silent: true,
      globals: {
        waitForConditionTimeout: 12 * 1000,
        retryAssertionTimeout: 12 * 1000
      }
    },
    chrome: {
      desiredCapabilities: {
        browserName: 'chrome',
        javascriptEnabled: true,
        acceptSslCerts: true
      }
    }
  }
}
