var pg = require('pg')

var generateRandomString = () => Math.random().toString(36).slice(2)

module.exports = {
  before: function () {
    this.state = {
      username: generateRandomString(),
      password: 'password',
      mail: 'inbox@domain.com',
      code: null,
      pendingPromise: null,
      pgPool: new pg.Pool({
        host: 'localhost',
        database: 'keyring',
        user: 'postgres',
        password: 'postgres'
      })
    }
  },
  afterEach: function (client, done) {
    if (this.state.pendingPromise !== null) {
      this.state.pendingPromise.then((error) => {
        this.state.pendingPromise = null
        done(error)
      })
    } else {
      done()
    }
  },
  after: function () {
    this.state.pgPool.end()
  },
  'Go to the registration form': function (client) {
    client.page['log-in']()
      .navigate()
      .click('@registerLink')
  },
  'Submit user data': function (client) {
    client.page['register']()
      .assert.urlContains('/register')
      .setValue('@usernameInput', this.state.username)
      .setValue('@passwordInput', this.state.password)
      .setValue('@repeatInput', this.state.password)
      .setValue('@mailInput', this.state.mail)
      .click('@registerButton')
  },
  'Wait for the activation page': function (client) {
    client.assert.urlContains('/set-up')
  },
  'Get an activation code': function () {
    this.state.pendingPromise = this.state.pgPool.query(
      'select code from mail_tokens ' +
      'inner join users on mail_tokens.user_identifier = users.identifier ' +
      'where username = $1',
      [this.state.username]
    ).then((result) => {
      this.state.code = result.rows[0].code
    })
  },
  'Enter the activation code': function (client) {
    client.page['set-up']()
      .setValue('@codeInput', this.state.code)
      .click('@activateButton')
  },
  'Assert we are at /dashboard': function (client) {
    client
      .assert.urlContains('/dashboard')
      .end()
  }
}
