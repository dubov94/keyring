import { expect } from 'chai'
import { option } from 'fp-ts'
import { ServiceFeatureType } from '@/api/definitions'
import { success } from '@/redux/flow_signal'
import { authnViaDepotSignal, registrationSignal, remoteAuthnComplete } from '@/redux/modules/authn/actions'
import { hasData, zero } from '@/redux/remote_data'
import { reduce } from '@/redux/testing'
import {
  accountDeletionReset,
  accountDeletionSignal,
  cancelOtpReset,
  featureAckSignal,
  mailTokenAcquisitionReset,
  mailTokenAcquisitionSignal,
  mailTokenReleaseReset,
  mailTokenReleaseSignal,
  MasterKeyChangeData,
  masterKeyChangeReset,
  masterKeyChangeSignal,
  otpParamsAcceptanceReset,
  otpParamsAcceptanceSignal,
  otpParamsGenerationReset,
  otpParamsGenerationSignal,
  otpResetSignal,
  remoteRehashSignal,
  usernameChangeReset,
  usernameChangeSignal
} from './actions'
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
    expect(state.mailVerificationRequired).to.be.true
  })
})

describe('remoteAuthnComplete', () => {
  it('sets the account state', () => {
    const state = reducer(undefined, remoteAuthnComplete({
      username: 'username',
      password: 'password',
      parametrization: 'parametrization',
      encryptionKey: 'encryptionKey',
      sessionKey: 'sessionKey',
      featurePrompts: [{ featureType: ServiceFeatureType.UNKNOWN }],
      mailVerificationRequired: false,
      mail: 'mail@example.com',
      userKeys: [],
      isOtpEnabled: true,
      otpToken: 'otpToken'
    }))

    expect(state.isAuthenticated).to.be.true
    expect(state.parametrization).to.equal('parametrization')
    expect(state.encryptionKey).to.equal('encryptionKey')
    expect(state.sessionKey).to.equal('sessionKey')
    expect(state.featurePrompts).to.deep.equal([{ featureType: ServiceFeatureType.UNKNOWN }])
    expect(state.mailVerificationRequired).to.be.false
    expect(state.mail).to.equal('mail@example.com')
    expect(state.isOtpEnabled).to.be.true
    expect(state.otpToken).to.equal('otpToken')
  })
})

describe('authnViaDepotSignal', () => {
  it('transitions to the dashboard', () => {
    const state = reducer(undefined, authnViaDepotSignal(success({
      username: 'username',
      password: 'password',
      userKeys: [],
      depotKey: 'depotKey'
    })))

    expect(state.isAuthenticated).to.be.true
    expect(state.mailVerificationRequired).to.be.false
  })
})

describe('mailTokenRelease', () => {
  const signalAction = mailTokenReleaseSignal(success('mail@example.com'))

  describe('mailTokenReleaseSignal', () => {
    it('updates the result', () => {
      const state = reducer(undefined, signalAction)

      expect(hasData(state.mailTokenRelease)).to.be.true
    })

    it('sets `mailVerificationRequired` to false', () => {
      const state = reducer(undefined, signalAction)

      expect(state.mailVerificationRequired).to.be.false
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
    remoteRehashSignal(success(masterKeyChangeData))
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

describe('otpParamsGeneration', () => {
  const signalAction = otpParamsGenerationSignal(success({
    otpParamsId: 'id',
    sharedSecret: 'secret',
    scratchCodes: ['a', 'b', 'c'],
    keyUri: 'uri',
    qrcDataUrl: 'qrc'
  }))

  describe('otpParamsGenerationSignal', () => {
    it('updates the result', () => {
      const state = reducer(undefined, signalAction)

      expect(hasData(state.otpParamsGeneration)).to.be.true
    })
  })

  describe('otpParamsGenerationReset', () => {
    it('clears the result', () => {
      const state = reduce(reducer, undefined, [signalAction, otpParamsGenerationReset()])

      expect(hasData(state.otpParamsGeneration)).to.be.false
    })
  })
})

describe('otpParamsAcceptance', () => {
  const signalAction = otpParamsAcceptanceSignal(success(option.of('token')))

  describe('otpParamsAcceptanceSignal', () => {
    it('updates the result', () => {
      const state = reducer(undefined, signalAction)

      expect(hasData(state.otpParamsAcceptance)).to.be.true
    })

    it('sets the token', () => {
      const state = reducer(undefined, signalAction)

      expect(state.isOtpEnabled).to.be.true
      expect(state.otpToken).to.equal('token')
    })
  })

  describe('otpParamsAcceptanceReset', () => {
    it('clears the result', () => {
      const state = reduce(reducer, undefined, [signalAction, otpParamsAcceptanceReset()])

      expect(hasData(state.otpParamsAcceptance)).to.be.false
    })
  })
})

describe('otpReset', () => {
  const signalAction = otpResetSignal(success({}))

  describe('otpResetSignal', () => {
    it('updates the result', () => {
      const state = reducer(undefined, signalAction)

      expect(hasData(state.otpReset)).to.be.true
    })

    it('sets `isOtpEnabled` to false', () => {
      const state = reduce(reducer, undefined, [
        otpParamsAcceptanceSignal(success(option.of('token'))),
        signalAction
      ])

      expect(state.isOtpEnabled).to.be.false
      expect(state.otpToken).to.be.null
    })
  })

  describe('cancelOtpReset', () => {
    it('clears the result', () => {
      const state = reduce(reducer, undefined, [signalAction, cancelOtpReset()])

      expect(hasData(state.otpReset)).to.be.false
    })
  })
})

describe('featureAckSignal', () => {
  it('filters out prompts', () => {
    const state = reducer({
      isAuthenticated: false,
      parametrization: null,
      encryptionKey: null,
      sessionKey: null,
      featurePrompts: [{ featureType: ServiceFeatureType.UNKNOWN }],
      mailVerificationRequired: true,
      mail: null,
      mailTokenRelease: zero(),
      mailTokenAcquisition: zero(),
      masterKeyChange: zero(),
      usernameChange: zero(),
      accountDeletion: zero(),
      isOtpEnabled: false,
      otpToken: null,
      otpParamsGeneration: zero(),
      otpParamsAcceptance: zero(),
      otpReset: zero()
    }, featureAckSignal(success(ServiceFeatureType.UNKNOWN)))

    expect(state.featurePrompts).to.be.empty
  })
})
