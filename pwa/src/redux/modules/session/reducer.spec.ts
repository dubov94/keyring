import { expect } from 'chai'
import { success } from '@/redux/flow_signal'
import { authnViaDepotSignal, registrationSignal, remoteAuthnComplete } from '@/redux/modules/authn/actions'
import { logOut, LogoutTrigger, usernameChangeSignal } from '@/redux/modules/user/account/actions'
import { rehydration } from './actions'
import reducer from './reducer'
import { createAuthnViaDepotFlowResult, createRegistrationFlowResult, createRemoteAuthnCompleteResult } from '@/redux/testing/domain'

describe('registrationSignal', () => {
  it('updates the username', () => {
    const state = reducer(undefined, registrationSignal(success(createRegistrationFlowResult({}))))

    expect(state.username).to.equal('username')
  })
})

describe('authnSignal', () => {
  ;[
    remoteAuthnComplete(createRemoteAuthnCompleteResult({})),
    authnViaDepotSignal(success(createAuthnViaDepotFlowResult({})))
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

describe('rehydration', () => {
  it('restores values', () => {
    const state = reducer(undefined, rehydration({
      username: 'username',
      logoutTrigger: LogoutTrigger.USER_REQUEST
    }))

    expect(state.username).to.equal('username')
    expect(state.logoutTrigger).to.be.null
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
