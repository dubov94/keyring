import { expect } from 'chai'
import { Type, getters } from './getters'
import { constructInitialState } from './state'
import { Status } from './status'

describe(Type.IS_ONLINE, () => {
  it('returns true if online', () => {
    const state = constructInitialState()
    state.status = Status.ONLINE

    const isOnline = getters[Type.IS_ONLINE](state, {}, state, {})

    expect(isOnline).to.be.true
  })

  it('returns false if not online', () => {
    const state = constructInitialState()
    state.status = Status.CONNECTING

    const isOnline = getters[Type.IS_ONLINE](state, {}, state, {})

    expect(isOnline).to.be.false
  })
})

describe(Type.IS_USER_ACTIVE, () => {
  it('returns true if user is active', () => {
    const state = constructInitialState()
    state.isUserActive = true

    const isUserActive = getters[Type.IS_USER_ACTIVE](state, {}, state, {})

    expect(isUserActive).to.be.true
  })

  it('returns false if user is not active', () => {
    const state = constructInitialState()
    state.isUserActive = false

    const isUserActive = getters[Type.IS_USER_ACTIVE](state, {}, state, {})

    expect(isUserActive).to.be.false
  })
})

describe(Type.HAS_SESSION_KEY, () => {
  it('returns true if session key is present', () => {
    const state = constructInitialState()
    state.sessionKey = 'key'

    const hasSessionKey = getters[Type.HAS_SESSION_KEY](state, {}, state, {})

    expect(hasSessionKey).to.be.true
  })

  it('returns false if session key is absent', () => {
    const state = constructInitialState()
    state.sessionKey = null

    const hasSessionKey = getters[Type.HAS_SESSION_KEY](state, {}, state, {})

    expect(hasSessionKey).to.be.false
  })
})

describe(Type.HAS_SESSIONS_DATA, () => {
  it('returns true if `recentSessions` is not `null`', () => {
    const state = constructInitialState()
    state.recentSessions = []

    const hasSessionsData = getters[Type.HAS_SESSIONS_DATA](state, {}, state, {})

    expect(hasSessionsData).to.be.true
  })

  it('returns false if `recentSessions` is `null`', () => {
    const state = constructInitialState()
    state.recentSessions = null

    const hasSessionsData = getters[Type.HAS_SESSIONS_DATA](state, {}, state, {})

    expect(hasSessionsData).to.be.false
  })
})
