import { expect } from 'chai'
import { option, these } from 'fp-ts'
import { success } from '@/redux/flow_signal'
import { authnViaDepotSignal, registrationSignal, remoteAuthnComplete } from '@/redux/modules/authn/actions'
import {
  accountDeletionSignal,
  localOtpTokenFailure,
  remoteCredentialsMismatchLocal,
  usernameChangeSignal
} from '@/redux/modules/user/account/actions'
import { data, hasData, zero } from '@/redux/remote_data'
import { reduce } from '@/redux/testing'
import { createAuthnViaDepotFlowResult, createDepotRehydration, createDepotRehydrationWebAuthn, createRegistrationFlowResult, createRemoteAuthnCompleteResult, createWebAuthnResult } from '@/redux/testing/domain'
import {
  clearDepot,
  depotActivationData,
  newEncryptedOtpToken,
  newVault,
  newWebAuthnLocalDerivatives,
  newWebAuthnRemoteDerivatives,
  rehydration,
  toggleDepot,
  webAuthnResult,
  webAuthnSignal
} from './actions'
import reducer from './reducer'

const createFilledState = (): ReturnType<typeof reducer> => ({
  persisted: true,
  userId: 'userId',
  credentials: {
    username: 'username',
    salt: 'salt',
    hash: 'hash'
  },
  webAuthnData: {
    indicator: option.zero(),
    result: option.of(these.left({
      credentialId: 'credentialId',
      salt: 'salt'
    }))
  },
  webAuthnResult: 'webAuthnResult',
  webAuthnEncryptedLocalDerivatives: 'webAuthnEncryptedLocalDerivatives',
  webAuthnEncryptedRemoteDerivatives: 'webAuthnEncryptedRemoteDerivatives',
  vault: 'vault',
  depotKey: 'depotKey',
  encryptedOtpToken: 'encryptedOtpToken'
})

describe('rehydration', () => {
  it('restores values', () => {
    const state = reducer(undefined, rehydration(createDepotRehydration(createDepotRehydrationWebAuthn({}))))

    expect(state.persisted).to.be.true
    expect(state.credentials).to.deep.equal({
      username: 'username',
      salt: 'salt',
      hash: 'hash'
    })
    expect(data(state.webAuthnData)).to.deep.equal(option.of({
      credentialId: 'webAuthnCredentialId',
      salt: 'webAuthnSalt'
    }))
    expect(state.webAuthnEncryptedLocalDerivatives).to.equal('webAuthnEncryptedLocalDerivatives')
    expect(state.webAuthnEncryptedRemoteDerivatives).to.equal('webAuthnEncryptedRemoteDerivatives')
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
    expect(state.webAuthnData).to.deep.equal(zero())
    expect(state.webAuthnResult).to.be.null
    expect(state.webAuthnEncryptedLocalDerivatives).to.be.null
    expect(state.webAuthnEncryptedRemoteDerivatives).to.be.null
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
        hash: null
      },
      webAuthnData: zero(),
      webAuthnResult: null,
      webAuthnEncryptedLocalDerivatives: null,
      webAuthnEncryptedRemoteDerivatives: null,
      vault: null,
      depotKey: null,
      encryptedOtpToken: null
    }, usernameChangeSignal(success({
      before: 'usernameA',
      update: 'usernameB'
    })))

    expect(state.credentials?.username ?? null).to.equal('usernameB')
  })

  it('does not change the username when it does not match', () => {
    const state = reducer(undefined, usernameChangeSignal(success({
      before: 'usernameA',
      update: 'usernameB'
    })))

    expect(state.credentials?.username ?? null).to.equal(null)
  })
})

describe('depotActivationData', () => {
  it('sets credentials and depot key', () => {
    const state = reducer(undefined, depotActivationData({
      username: 'username',
      salt: 'salt',
      hash: 'hash',
      depotKey: 'depotKey'
    }))

    expect(state.credentials).to.deep.equal({
      username: 'username',
      salt: 'salt',
      hash: 'hash'
    })
    expect(state.depotKey).to.equal('depotKey')
  })
})

describe('webAuthnSignal', () => {
  it('updates the result', () => {
    const state = reducer(undefined, webAuthnSignal(success({
      credentialId: 'credentialId',
      salt: 'salt'
    })))

    expect(hasData(state.webAuthnData)).to.be.true
  })
})

describe('webAuthnResult', () => {
  it('sets WebAuthn result', () => {
    const state = reducer(undefined, webAuthnResult(createWebAuthnResult({})))

    expect(state.webAuthnResult).to.equal('webAuthnResult')
  })
})

describe('newWebAuthnLocalDerivatives', () => {
  it('sets WebAuthn local derivatives', () => {
    const state = reducer(undefined, newWebAuthnLocalDerivatives('newWebAuthnLocalDerivatives'))

    expect(state.webAuthnEncryptedLocalDerivatives).to.equal('newWebAuthnLocalDerivatives')
  })
})

describe('newWebAuthnRemoteDerivatives', () => {
  it('sets WebAuthn remote derivatives', () => {
    const state = reducer(undefined, newWebAuthnRemoteDerivatives('newWebAuthnRemoteDerivatives'))

    expect(state.webAuthnEncryptedRemoteDerivatives).to.equal('newWebAuthnRemoteDerivatives')
  })
})

describe('toggleDepot', () => {
  it('sets the persistence flag', () => {
    const state = reducer(undefined, toggleDepot(true))

    expect(state.persisted).to.be.true
  })
})

describe('clearDepot', () => {
  it('clears persisted data', () => {
    const state = reducer(createFilledState(), clearDepot())

    expect(state.persisted).to.be.false
    expect(state.userId).to.be.null
    expect(state.credentials).to.be.null
    expect(state.webAuthnData).to.deep.equal(zero())
    expect(state.webAuthnResult).to.be.null
    expect(state.webAuthnEncryptedLocalDerivatives).to.be.null
    expect(state.webAuthnEncryptedRemoteDerivatives).to.be.null
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
      expect(state.webAuthnData).to.deep.equal(zero())
      expect(state.webAuthnResult).to.be.null
      expect(state.webAuthnEncryptedLocalDerivatives).to.be.null
      expect(state.webAuthnEncryptedRemoteDerivatives).to.be.null
      expect(state.vault).to.be.null
      expect(state.encryptedOtpToken).to.be.null
    })
  })
})
