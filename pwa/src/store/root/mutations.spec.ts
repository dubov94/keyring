import { expect } from 'chai'
import { mutations, Type } from './mutations'
import { constructRootState, Key, Session } from './state'
import { Status } from './status'

describe(Type.SET_STATUS, () => {
  it('sets a different status', () => {
    const state = constructRootState()
    expect(state.status).to.equal(Status.OFFLINE)

    mutations[Type.SET_STATUS](state, Status.ONLINE)

    expect(state.status).to.equal(Status.ONLINE)
  })
})

describe(Type.SET_PARAMETRIZATION, () => {
  it('sets parametrization', () => {
    const state = constructRootState()

    mutations[Type.SET_PARAMETRIZATION](state, 'parametrization')

    expect(state.parametrization).to.equal('parametrization')
  })
})

describe(Type.SET_SESSION_KEY, () => {
  it('sets session key', () => {
    const state = constructRootState()

    mutations[Type.SET_SESSION_KEY](state, 'key')

    expect(state.sessionKey).to.equal('key')
  })
})

describe(Type.SET_ENCRYPTION_KEY, () => {
  it('sets encryption key', () => {
    const state = constructRootState()

    mutations[Type.SET_ENCRYPTION_KEY](state, 'key')

    expect(state.encryptionKey).to.equal('key')
  })
})

describe(Type.SET_IS_USER_ACTIVE, () => {
  it('changes `isUserActive`', () => {
    const state = constructRootState()
    expect(state.isUserActive).to.be.false

    mutations[Type.SET_IS_USER_ACTIVE](state, true)

    expect(state.isUserActive).to.be.true
  })
})

describe(Type.SET_USER_KEYS, () => {
  it('sorts by tags left to right', () => {
    const state = constructRootState()
    const keys: Array<Key> = [
      { identifier: '1', value: '', tags: ['a', 'c', 'd'] },
      { identifier: '2', value: '', tags: ['a', 'b', 'd'] },
      { identifier: '3', value: '', tags: ['a', 'b', 'e'] }
    ]

    mutations[Type.SET_USER_KEYS](state, keys)

    expect(state.userKeys.map(key => key.identifier)).to.eql(['2', '3', '1'])
  })

  it('puts keys with fewer tags earlier', () => {
    const state = constructRootState()
    const keys: Array<Key> = [
      { identifier: '1', value: '', tags: ['a', 'b'] },
      { identifier: '2', value: '', tags: ['a', 'b', 'c'] },
      { identifier: '3', value: '', tags: ['a'] }
    ]

    mutations[Type.SET_USER_KEYS](state, keys)

    expect(state.userKeys.map(key => key.identifier)).to.eql(['3', '1', '2'])
  })

  it('resorts to value comparison if tags are equal', () => {
    const state = constructRootState()
    const keys: Array<Key> = [
      { identifier: '1', value: 'c', tags: ['a'] },
      { identifier: '2', value: 'b', tags: ['a'] },
      { identifier: '3', value: 'a', tags: ['a'] }
    ]

    mutations[Type.SET_USER_KEYS](state, keys)

    expect(state.userKeys.map(key => key.identifier)).to.eql(['3', '2', '1'])
  })
})

describe(Type.UNSHIFT_USER_KEY, () => {
  it('adds to the beginning', () => {
    const state = constructRootState()
    const key1: Key = { identifier: '1', value: 'v', tags: ['t'] }
    const key2: Key = { identifier: '2', value: 'v', tags: ['x'] }

    mutations[Type.UNSHIFT_USER_KEY](state, key1)
    mutations[Type.UNSHIFT_USER_KEY](state, key2)

    expect(state.userKeys).to.eql([key2, key1])
  })
})

describe(Type.MODIFY_USER_KEY, () => {
  it('updates a key by identifier', () => {
    const state = constructRootState()
    const key: Key = { identifier: '1', value: 'v', tags: ['t'] }
    const keyUpdate: Key = { identifier: '1', value: 'y', tags: ['x'] }
    mutations[Type.UNSHIFT_USER_KEY](state, key)

    mutations[Type.MODIFY_USER_KEY](state, keyUpdate)

    expect(state.userKeys).to.eql([
      { identifier: '1', value: 'y', tags: ['x'] }
    ])
  })
})

describe(Type.DELETE_USER_KEY, () => {
  it('deletes a key by identifier', () => {
    const state = constructRootState()
    const key: Key = { identifier: '1', value: 'v', tags: ['t'] }
    mutations[Type.UNSHIFT_USER_KEY](state, key)

    mutations[Type.DELETE_USER_KEY](state, '1')

    expect(state.userKeys).to.be.empty
  })
})

describe(Type.SET_RECENT_SESSIONS, () => {
  it('sets given sessions', () => {
    const state = constructRootState()
    const recentSessions: Array<Session> = [
      {
        creationTimeInMillis: 1,
        ipAddress: '127.0.0.1',
        userAgent: 'Chrome',
        geolocation: {
          country: 'Country',
          city: 'City'
        }
      }
    ]

    mutations[Type.SET_RECENT_SESSIONS](state, recentSessions)

    expect(state.recentSessions).to.eql(recentSessions)
  })
})
