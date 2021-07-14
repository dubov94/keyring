import { success } from '@/redux/flow_signal'
import { expect } from 'chai'
import { authnViaDepotSignal, registrationSignal, remoteAuthnComplete } from '../authn/actions'
import { logOut, usernameChangeSignal } from '../user/account/actions'
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
      userKeys: []
    }),
    authnViaDepotSignal(success({
      username: 'username',
      password: 'password',
      userKeys: [],
      vaultKey: 'vaultKey'
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
  it('updates the username', () => {
    const state = reducer(undefined, rehydrateSession({
      username: 'username'
    }))

    expect(state.username).to.equal('username')
  })
})

describe('logOut', () => {
  it('clears the username', () => {
    const state = reducer({
      username: 'username'
    }, logOut())

    expect(state.username).to.be.null
  })
})
