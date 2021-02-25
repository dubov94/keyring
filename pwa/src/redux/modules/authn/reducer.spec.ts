import { success } from '@/redux/flow_signal'
import { expect } from 'chai'
import { authnViaApiReset, authnViaApiSignal, authnViaDepotReset, authnViaDepotSignal, registrationReset, registrationSignal } from './actions'
import reducer from './reducer'
import { hasData } from '@/redux/remote_data'
import { reduce } from '@/redux/testing'

describe('registration', () => {
  const signalAction = registrationSignal(success({
    username: 'username',
    parametrization: 'parametrization',
    encryptionKey: 'encryptionKey',
    sessionKey: 'sessionKey',
    userKeys: []
  }))

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
  const signalAction = authnViaApiSignal(success({
    username: 'username',
    password: 'password',
    parametrization: 'parametrization',
    encryptionKey: 'encryptionKey',
    sessionKey: 'sessionKey',
    requiresMailVerification: false,
    userKeys: []
  }))

  describe('authnViaApiSignal', () => {
    it('updates the result', () => {
      const state = reducer(undefined, signalAction)

      expect(hasData(state.authnViaApi)).to.be.true
    })
  })

  describe('authnViaApiReset', () => {
    it('clears the result', () => {
      const state = reduce(reducer, undefined, [signalAction, authnViaApiReset()])

      expect(hasData(state.authnViaApi)).to.be.false
    })
  })
})

describe('authnViaDepot', () => {
  const signalAction = authnViaDepotSignal(success({
    username: 'username',
    password: 'password',
    userKeys: [],
    vaultKey: 'vaultKey'
  }))

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