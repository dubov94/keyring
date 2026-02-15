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
import { clearDepot, newEncryptedOtpToken, newVault, rehydration } from './actions'
import reducer from './reducer'
import { createAuthnViaDepotFlowResult, createRegistrationFlowResult, createRemoteAuthnCompleteResult } from '@/redux/testing/domain'

const createFilledState = (): ReturnType<typeof reducer> => ({
  persisted: true,
  userId: 'userId',
  credentials: {
    username: 'username',
    salt: 'salt',
    hash: 'hash',
  },
  webAuthn: {
    credentialId: 'credentialId',
    salt: 'salt'
  },
  vault: 'vault',
  depotKey: 'depotKey',
  encryptedOtpToken: 'encryptedOtpToken'
})

describe('rehydration', () => {
  it('restores values', () => {
    const state = reducer(undefined, rehydration({
      username: 'username',
      salt: 'salt',
      hash: 'hash',
      vault: 'vault',
      encryptedOtpToken: 'encryptedOtpToken'
    }))

    expect(state.persisted).to.be.true
    expect(state.credentials).to.deep.equal({
      username: 'username',
      salt: 'salt',
      hash: 'hash'
    })
    expect(state.vault).to.equal('vault')
    expect(state.encryptedOtpToken).to.equal('encryptedOtpToken')
  })
})

describe('registrationSignal', () => {
  it('clears the state but saves the user ID', () => {
    const state = reducer(createFilledState(), registrationSignal(success(createRegistrationFlowResult({
      userId: 'foo'
    }))))

    expect(state.persisted).to.be.false
    expect(state.userId).to.equal('foo')
    expect(state.credentials).to.be.null
    expect(state.webAuthn).to.be.null
    expect(state.vault).to.be.null
    expect(state.encryptedOtpToken).to.be.null
  })
})

describe('authnViaDepotSignal', () => {
  it('sets the vault key', () => {
    const state = reducer(undefined, authnViaDepotSignal(success(createAuthnViaDepotFlowResult({}))))

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
      remoteAuthnComplete(createRemoteAuthnCompleteResult({}))
    ])

    expect(state.encryptedOtpToken).to.be.null
  })

  it('sets the user ID', () => {
    const state = reducer(undefined, remoteAuthnComplete(createRemoteAuthnCompleteResult({})))

    expect(state.userId).to.equal('userId')
  })
})

describe('usernameChangeSignal', () => {
  it('changes the username when it matches', () => {
    const state = reducer({
      persisted: true,
      userId: 'userId',
      credentials: {
        username: 'usernameA',
        salt: null,
        hash: null,
      },
      webAuthn: null,
      vault: null,
      depotKey: null,
      encryptedOtpToken: null
    }, usernameChangeSignal(success({
      before: 'usernameA',
      update: 'usernameB'
    })))

    expect(state.credentials?.username).to.equal('usernameB')
  })

  it('does not change the username when it does not match', () => {
    const state = reducer(undefined, usernameChangeSignal(success({
      before: 'usernameA',
      update: 'usernameB'
    })))

    expect(state.credentials?.username).to.equal(null)
  })
})

describe('clearDepot', () => {
  it('clears persisted data', () => {
    const state = reducer(createFilledState(), clearDepot())

    expect(state.persisted).to.be.false
    expect(state.userId).to.be.null
    expect(state.credentials).to.be.null
    expect(state.webAuthn).to.be.null
    expect(state.vault).to.be.null
    expect(state.encryptedOtpToken).to.be.null
  })
})

describe('toEmptyState', () => {
  ;[
    accountDeletionSignal(success({})),
    remoteCredentialsMismatchLocal(),
    localOtpTokenFailure()
  ].forEach((trigger) => {
    it(`clears persisted data on ${trigger.type}`, () => {
      const state = reducer(createFilledState(), trigger)

      expect(state.persisted).to.be.false
      expect(state.userId).to.be.null
      expect(state.credentials).to.be.null
      expect(state.webAuthn).to.be.null
      expect(state.vault).to.be.null
      expect(state.encryptedOtpToken).to.be.null
    })
  })
})
