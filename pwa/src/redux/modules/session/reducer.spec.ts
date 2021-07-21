import { success } from '@/redux/flow_signal'
import { expect } from 'chai'
import { authnViaDepotSignal, registrationSignal, remoteAuthnComplete } from '../authn/actions'
import { logOut, LogoutTrigger, usernameChangeSignal } from '../user/account/actions'
import { rehydrateSession } from './actions'
import reducer from './reducer'

describe('registrationSignal', () => {
  it('updates the username', () => {
    const state = reducer(undefined, registrationSignal(success({
      username: 'username',
      parametrization: 'parametrization',
      encryptionKey: 'encryptionKey',
      sessionKey: 'sessionKey',
      userKeys: []
    })))

    expect(state.username).to.equal('username')
  })
})

describe('authnSignal', () => {
  ;[
    remoteAuthnComplete({
      username: 'username',
      password: 'password',
      parametrization: 'parametrization',
      encryptionKey: 'encryptionKey',
      sessionKey: 'sessionKey',
      mailVerificationRequired: false,
      mail: 'mail@example.com',
      userKeys: [],
      isOtpEnabled: false,
      otpToken: null
    }),
    authnViaDepotSignal(success({
      username: 'username',
      password: 'password',
      userKeys: [],
      depotKey: 'depotKey'
    }))
  ].forEach((trigger) => {
    it(`updates the username on ${trigger.type}`, () => {
      const state = reducer(undefined, trigger)

      expect(state.username).to.equal('username')
    })
  })
})

describe('usernameChangeSignal', () => {
  it('updates the username', () => {
    const state = reducer(undefined, usernameChangeSignal(success({
      before: 'usernameA',
      update: 'usernameB'
    })))

    expect(state.username).to.equal('usernameB')
  })
})

describe('rehydrateSession', () => {
  it('restores values', () => {
    const state = reducer(undefined, rehydrateSession({
      username: 'username',
      logoutTrigger: LogoutTrigger.USER_REQUEST
    }))

    expect(state.username).to.equal('username')
    expect(state.logoutTrigger).to.equal(LogoutTrigger.USER_REQUEST)
  })
})

describe('logOut', () => {
  it('clears the username', () => {
    const state = reducer({
      username: 'username',
      logoutTrigger: null
    }, logOut(LogoutTrigger.USER_REQUEST))

    expect(state.username).to.be.null
  })
})
