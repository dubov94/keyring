import { success } from '@/redux/flow_signal'
import { hasData } from '@/redux/remote_data'
import { reduce } from '@/redux/testing'
import { expect } from 'chai'
import { authnViaApiSignal, authnViaDepotSignal, backgroundAuthnSignal, registrationSignal } from '../../authn/actions'
import { accountDeletionReset, accountDeletionSignal, mailTokenAcquisitionReset, mailTokenAcquisitionSignal, mailTokenReleaseReset, mailTokenReleaseSignal, MasterKeyChangeData, masterKeyChangeReset, masterKeyChangeSignal, rehashSignal, usernameChangeReset, usernameChangeSignal } from './actions'
import reducer from './reducer'

describe('registrationSignal', () => {
  it('sets the account state', () => {
    const state = reducer(undefined, registrationSignal(success({
      username: 'username',
      parametrization: 'parametrization',
      encryptionKey: 'encryptionKey',
      sessionKey: 'sessionKey'
    })))

    expect(state.isAuthenticated).to.be.true
    expect(state.parametrization).to.equal('parametrization')
    expect(state.encryptionKey).to.equal('encryptionKey')
    expect(state.sessionKey).to.equal('sessionKey')
    expect(state.requiresMailVerification).to.be.true
  })
})

describe('onlineAuthnSignal', () => {
  ;[
    authnViaApiSignal(success({
      username: 'username',
      password: 'password',
      parametrization: 'parametrization',
      encryptionKey: 'encryptionKey',
      sessionKey: 'sessionKey',
      requiresMailVerification: false,
      mail: 'mail@example.com',
      userKeys: []
    })),
    backgroundAuthnSignal(success({
      username: 'username',
      password: 'password',
      parametrization: 'parametrization',
      encryptionKey: 'encryptionKey',
      sessionKey: 'sessionKey',
      requiresMailVerification: false,
      mail: 'mail@example.com',
      userKeys: []
    }))
  ].forEach((trigger) => {
    it(`sets the account state on ${trigger.type}`, () => {
      const state = reducer(undefined, trigger)

      expect(state.isAuthenticated).to.be.true
      expect(state.parametrization).to.equal('parametrization')
      expect(state.encryptionKey).to.equal('encryptionKey')
      expect(state.sessionKey).to.equal('sessionKey')
      expect(state.requiresMailVerification).to.be.false
      expect(state.mail).to.equal('mail@example.com')
    })
  })
})

describe('authnViaDepotSignal', () => {
  it('transitions to the dashboard', () => {
    const state = reducer(undefined, authnViaDepotSignal(success({
      username: 'username',
      password: 'password',
      userKeys: [],
      vaultKey: 'vaultKey'
    })))

    expect(state.isAuthenticated).to.be.true
    expect(state.requiresMailVerification).to.be.false
  })
})

describe('mailTokenRelease', () => {
  const signalAction = mailTokenReleaseSignal(success('mail@example.com'))

  describe('mailTokenReleaseSignal', () => {
    it('updates the result', () => {
      const state = reducer(undefined, signalAction)

      expect(hasData(state.mailTokenRelease)).to.be.true
    })

    it('sets `requiresMailVerification` to false', () => {
      const state = reducer(undefined, signalAction)

      expect(state.requiresMailVerification).to.be.false
    })

    it('sets `mail` to the new mail', () => {
      const state = reducer(undefined, signalAction)

      expect(state.mail).to.equal('mail@example.com')
    })
  })

  describe('mailTokenReleaseReset', () => {
    it('clears the result', () => {
      const state = reduce(reducer, undefined, [signalAction, mailTokenReleaseReset()])

      expect(hasData(state.mailTokenRelease)).to.be.false
    })
  })
})

describe('mailTokenAcquisition', () => {
  const signalAction = mailTokenAcquisitionSignal(success('mail@example.com'))

  describe('mailTokenAcquisitionSignal', () => {
    it('updates the result', () => {
      const state = reducer(undefined, signalAction)

      expect(hasData(state.mailTokenAcquisition)).to.be.true
    })
  })

  describe('mailTokenAcquisitionReset', () => {
    it('clears the result', () => {
      const state = reduce(reducer, undefined, [signalAction, mailTokenAcquisitionReset()])

      expect(hasData(state.mailTokenAcquisition)).to.be.false
    })
  })
})

describe('masterKeyUpdate', () => {
  const masterKeyChangeData: MasterKeyChangeData = {
    newMasterKey: 'masterKey',
    newParametrization: 'newParametrization',
    newEncryptionKey: 'newEncryptionKey',
    newSessionKey: 'newSessionKey'
  }

  describe('masterKeyChangeSignal', () => {
    it('updates the result', () => {
      const state = reducer(undefined, masterKeyChangeSignal(success(masterKeyChangeData)))

      expect(hasData(state.masterKeyChange)).to.be.true
    })
  })

  ;[
    masterKeyChangeSignal(success(masterKeyChangeData)),
    rehashSignal(success(masterKeyChangeData))
  ].forEach((trigger) => {
    it(`sets credentials on ${trigger.type}`, () => {
      const state = reducer(undefined, trigger)

      expect(state.parametrization).to.equal('newParametrization')
      expect(state.encryptionKey).to.equal('newEncryptionKey')
      expect(state.sessionKey).to.equal('newSessionKey')
    })
  })

  describe('masterKeyChangeReset', () => {
    it('clears the result', () => {
      const state = reduce(reducer, undefined, [
        masterKeyChangeSignal(success(masterKeyChangeData)),
        masterKeyChangeReset()
      ])

      expect(hasData(state.masterKeyChange)).to.be.false
    })
  })
})

describe('usernameChange', () => {
  const signalAction = usernameChangeSignal(success({
    before: 'usernameA',
    update: 'usernameB'
  }))

  describe('usernameChangeSignal', () => {
    it('updates the result', () => {
      const state = reducer(undefined, signalAction)

      expect(hasData(state.usernameChange)).to.be.true
    })
  })

  describe('usernameChangeReset', () => {
    it('clears the result', () => {
      const state = reduce(reducer, undefined, [signalAction, usernameChangeReset()])

      expect(hasData(state.usernameChange)).to.be.false
    })
  })
})

describe('accountDeletion', () => {
  const signalAction = accountDeletionSignal(success({}))

  describe('accountDeletionSignal', () => {
    it('updates the result', () => {
      const state = reducer(undefined, signalAction)

      expect(hasData(state.accountDeletion)).to.be.true
    })
  })

  describe('accountDeletionReset', () => {
    it('clears the result', () => {
      const state = reduce(reducer, undefined, [signalAction, accountDeletionReset()])

      expect(hasData(state.accountDeletion)).to.be.false
    })
  })
})
