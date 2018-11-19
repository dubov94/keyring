module.exports = {
  url: function () {
    return `${this.api.launchUrl}/register`
  },
  elements: {
    usernameInput: 'input[aria-label="Username"]',
    passwordInput: 'input[aria-label="Password"]',
    repeatInput: 'input[aria-label="Repeat password"]',
    mailInput: 'input[aria-label="E-mail"]',
    registerButton: '.card__actions > .btn'
  }
}
