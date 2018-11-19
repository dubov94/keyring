module.exports = {
  url: function () {
    return `${this.api.launchUrl}/log-in`
  },
  elements: {
    registerLink: 'a[href="/register"]'
  }
}
