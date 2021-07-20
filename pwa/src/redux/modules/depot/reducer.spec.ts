import { success } from '@/redux/flow_signal'
import { expect } from 'chai'
import { authnViaDepotSignal, registrationSignal } from '../authn/actions'
import {
  accountDeletionSignal,
  remoteCredentialsMismatchLocal,
  usernameChangeSignal
} from '../user/account/actions'
import { clearDepot, newVault, rehydrateDepot } from './actions'
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
      vaultKey: 'vaultKey'
    })))

    expect(state.vaultKey).to.equal('vaultKey')
  })
})

describe('newVault', () => {
  it('sets the vault', () => {
    const state = reducer(undefined, newVault('vault'))

    expect(state.vault).to.equal('vault')
  })
})

describe('usernameChangeSignal', () => {
  it('changes the username when it matches', () => {
    const state = reducer({
      username: 'usernameA',
      salt: null,
      hash: null,
      vault: null,
      vaultKey: null,
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
      vaultKey: 'vaultKey',
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
    remoteCredentialsMismatchLocal()
  ].forEach((trigger) => {
    it(`clears persisted data on ${trigger.type}`, () => {
      const state = reducer({
        username: 'username',
        salt: 'salt',
        hash: 'hash',
        vault: 'vault',
        vaultKey: 'vaultKey',
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
