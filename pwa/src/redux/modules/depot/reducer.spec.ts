import { expect } from 'chai'
import { success } from '@/redux/flow_signal'
import { authnViaDepotSignal, registrationSignal, remoteAuthnComplete } from '@/redux/modules/authn/actions'
import {
  accountDeletionSignal,
  localOtpTokenFailure,
  remoteCredentialsMismatchLocal,
  usernameChangeSignal
} from '@/redux/modules/user/account/actions'
import { reduce } from '@/redux/testing'
import { clearDepot, newEncryptedOtpToken, newVault, rehydrateDepot } from './actions'
import reducer from './reducer'

describe('rehydrateDepot', () => {
  it('restores values', () => {
    const state = reducer(undefined, rehydrateDepot({
      username: 'username',
      salt: 'salt',
      hash: 'hash',
      vault: 'vault',
      encryptedOtpToken: 'encryptedOtpToken'
    }))

    expect(state.username).to.equal('username')
    expect(state.salt).to.equal('salt')
    expect(state.hash).to.equal('hash')
    expect(state.vault).to.equal('vault')
    expect(state.encryptedOtpToken).to.equal('encryptedOtpToken')
  })
})

describe('authnViaDepotSignal', () => {
  it('sets the vault key', () => {
    const state = reducer(undefined, authnViaDepotSignal(success({
      username: 'username',
      password: 'password',
      userKeys: [],
      depotKey: 'depotKey'
    })))

    expect(state.depotKey).to.equal('depotKey')
  })
})

describe('newVault', () => {
  it('sets the vault', () => {
    const state = reducer(undefined, newVault('vault'))

    expect(state.vault).to.equal('vault')
  })
})

describe('newEncryptedOtpToken', () => {
  it('sets the encrypted OTP token', () => {
    const state = reducer(undefined, newEncryptedOtpToken('encryptedOtpToken'))

    expect(state.encryptedOtpToken).to.equal('encryptedOtpToken')
  })
})

describe('remoteAuthnComplete', () => {
  it('clears the encrypted OTP token', () => {
    const state = reduce(reducer, undefined, [
      newEncryptedOtpToken('encryptedOtpToken'),
      remoteAuthnComplete({
        username: 'username',
        password: 'password',
        parametrization: 'parametrization',
        encryptionKey: 'encryptionKey',
        sessionKey: 'sessionKey',
        featurePrompts: [],
        mailVerificationRequired: false,
        mail: 'mail@example.com',
        userKeys: [],
        isOtpEnabled: false,
        otpToken: null
      })
    ])

    expect(state.encryptedOtpToken).to.be.null
  })
})

describe('usernameChangeSignal', () => {
  it('changes the username when it matches', () => {
    const state = reducer({
      username: 'usernameA',
      salt: null,
      hash: null,
      vault: null,
      depotKey: null,
      encryptedOtpToken: null
    }, usernameChangeSignal(success({
      before: 'usernameA',
      update: 'usernameB'
    })))

    expect(state.username).to.equal('usernameB')
  })

  it('does not change the username when it does not match', () => {
    const state = reducer(undefined, usernameChangeSignal(success({
      before: 'usernameA',
      update: 'usernameB'
    })))

    expect(state.username).to.equal(null)
  })
})

describe('clearDepot', () => {
  it('clears persisted data', () => {
    const state = reducer({
      username: 'username',
      salt: 'salt',
      hash: 'hash',
      vault: 'vault',
      depotKey: 'depotKey',
      encryptedOtpToken: 'encryptedOtpToken'
    }, clearDepot())

    expect(state.username).to.be.null
    expect(state.salt).to.be.null
    expect(state.hash).to.be.null
    expect(state.vault).to.be.null
    expect(state.encryptedOtpToken).to.be.null
  })
})

describe('toInitialState', () => {
  ;[
    registrationSignal(success({
      username: 'username',
      parametrization: 'parametrization',
      encryptionKey: 'encryptionKey',
      sessionKey: 'sessionKey'
    })),
    accountDeletionSignal(success({})),
    remoteCredentialsMismatchLocal(),
    localOtpTokenFailure()
  ].forEach((trigger) => {
    it(`clears persisted data on ${trigger.type}`, () => {
      const state = reducer({
        username: 'username',
        salt: 'salt',
        hash: 'hash',
        vault: 'vault',
        depotKey: 'depotKey',
        encryptedOtpToken: 'encryptedOtpToken'
      }, trigger)

      expect(state.username).to.be.null
      expect(state.salt).to.be.null
      expect(state.hash).to.be.null
      expect(state.vault).to.be.null
      expect(state.encryptedOtpToken).to.be.null
    })
  })
})
