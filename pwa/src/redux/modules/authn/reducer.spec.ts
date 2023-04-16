import { success } from '@/redux/flow_signal'
import { expect } from 'chai'
import {
  authnOtpProvisionReset,
  authnOtpProvisionSignal,
  authnViaApiReset,
  authnViaApiSignal,
  authnViaDepotReset,
  authnViaDepotSignal,
  registrationReset,
  registrationSignal
} from './actions'
import reducer from './reducer'
import { hasData, data } from '@/redux/remote_data'
import { reduce } from '@/redux/testing'
import { either, option } from 'fp-ts'
import { defaultMailVerification } from '../user/account/actions'
import { createAuthnViaDepotFlowResult, createRegistrationFlowResult } from '@/redux/testing/domain'

describe('registration', () => {
  const signalAction = registrationSignal(success(createRegistrationFlowResult({})))

  describe('registrationSignal', () => {
    it('updates the result', () => {
      const state = reducer(undefined, signalAction)

      expect(hasData(state.registration)).to.be.true
    })
  })

  describe('registrationReset', () => {
    it('clears the result', () => {
      const state = reduce(reducer, undefined, [signalAction, registrationReset()])

      expect(hasData(state.registration)).to.be.false
    })
  })
})

describe('authnViaApi', () => {
  const flowResult = {
    username: 'username',
    password: 'password',
    parametrization: 'parametrization',
    encryptionKey: 'encryptionKey',
    content: either.left({
      authnKey: 'token',
      attemptsLeft: 1
    })
  }
  const signalAction = authnViaApiSignal(success(flowResult))

  describe('authnViaApiSignal', () => {
    it('updates the result', () => {
      const state = reducer(undefined, signalAction)

      expect(data(state.authnViaApi)).to.deep.equal(option.of(flowResult))
    })
  })

  describe('authnViaApiReset', () => {
    it('clears the result', () => {
      const state = reduce(reducer, undefined, [signalAction, authnViaApiReset()])

      expect(hasData(state.authnViaApi)).to.be.false
    })
  })
})

describe('authnOtpProvision', () => {
  const signalAction = authnOtpProvisionSignal(success({
    credentialParams: {
      username: 'username',
      password: 'password',
      parametrization: 'parametrization',
      encryptionKey: 'encryptionKey'
    },
    trustedToken: option.none,
    userData: {
      sessionKey: 'sessionKey',
      featurePrompts: [],
      mailVerification: defaultMailVerification(),
      mail: null,
      userKeys: []
    }
  }))

  describe('authnOtpProvisionSignal', () => {
    it('updates the result', () => {
      const state = reducer(undefined, signalAction)

      expect(hasData(state.authnOtpProvision)).to.be.true
    })
  })

  describe('authnOtpProvisionReset', () => {
    it('clears the result', () => {
      const state = reduce(reducer, undefined, [signalAction, authnOtpProvisionReset()])

      expect(hasData(state.authnOtpProvision)).to.be.false
    })
  })
})

describe('authnViaDepot', () => {
  const signalAction = authnViaDepotSignal(success(createAuthnViaDepotFlowResult({})))

  describe('authnViaDepotSignal', () => {
    it('updates the result', () => {
      const state = reducer(undefined, signalAction)

      expect(hasData(state.authnViaDepot)).to.be.true
    })
  })

  describe('authnViaDepotReset', () => {
    it('clears the result', () => {
      const state = reduce(reducer, undefined, [signalAction, authnViaDepotReset()])

      expect(hasData(state.authnViaDepot)).to.be.false
    })
  })
})
