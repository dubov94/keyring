import { expect } from 'chai'
import { container } from 'tsyringe'
import { UidService, UID_SERVICE_TOKEN } from '@/cryptography/uid_service'
import { success } from '@/redux/flow_signal'
import { reduce } from '@/redux/testing'
import { createUserKey } from '@/redux/testing/domain'
import { SequentialFakeUidService } from '@/redux/testing/services'
import {
  creationSignal,
  deletionSignal,
  emplace,
  keyPinTogglingSignal,
  NIL_KEY_ID,
  shadowElectionSignal,
  updationSignal
} from './actions'
import reducer from './reducer'

describe('emplace', () => {
  beforeEach(() => {
    container.register<UidService>(UID_SERVICE_TOKEN, {
      useValue: new SequentialFakeUidService()
    })
  })

  it('sets the keys', () => {
    const userKeys = [
      createUserKey({ identifier: '1', value: 'x', tags: ['a', 'b'] }),
      createUserKey({ identifier: '2', value: 'y', tags: ['c', 'd'] })
    ]
    const state = reducer(undefined, emplace(userKeys))

    expect(state.userKeys).to.deep.equal(userKeys)
  })

  it('inherits cliques', () => {
    const replacement = createUserKey({ identifier: '1', value: 'after' })
    const state = reduce(reducer, undefined, [
      emplace([createUserKey({ identifier: '1', value: 'before' })]),
      emplace([replacement])
    ])

    expect(state.userKeys).to.deep.equal([replacement])
    expect(state.idToClique).to.deep.equal({ 1: 'uid-1' })
  })
})

describe('creationSignal', () => {
  it('installs a new key', () => {
    const addition = createUserKey({ identifier: '1', value: 'a' })
    const state = reducer(undefined, creationSignal(
      success(addition), { uid: 'random', clique: 'clique' }
    ))

    expect(state.userKeys).to.deep.equal([addition])
    expect(state.idToClique).to.deep.equal({ 1: 'clique' })
  })
})

describe('updationSignal', () => {
  beforeEach(() => {
    container.register<UidService>(UID_SERVICE_TOKEN, {
      useValue: new SequentialFakeUidService()
    })
  })

  it('updates an existing key', () => {
    const replacement = createUserKey({ identifier: '1', value: 'y', tags: ['t'] })
    const state = reduce(reducer, undefined, [
      emplace([createUserKey({ identifier: '1', value: 'x' })]),
      updationSignal(success(replacement), { uid: 'random' })
    ])

    expect(state.userKeys).to.deep.equal([replacement])
  })
})

describe('deletionSignal', () => {
  beforeEach(() => {
    container.register<UidService>(UID_SERVICE_TOKEN, {
      useValue: new SequentialFakeUidService()
    })
  })

  it('deletes the key and its shadows', () => {
    const state = reduce(reducer, undefined, [
      emplace([
        createUserKey({ identifier: '1' }),
        createUserKey({ identifier: '2', attrs: { isShadow: true, parent: '1' } })
      ]),
      deletionSignal(success('1'), { uid: 'random' })
    ])

    expect(state.userKeys).to.be.empty
    expect(state.idToClique).to.be.empty
  })
})

describe('shadowElectionSignal', () => {
  beforeEach(() => {
    container.register<UidService>(UID_SERVICE_TOKEN, {
      useValue: new SequentialFakeUidService()
    })
  })

  it('applies shadow metamorphosis', () => {
    const result = createUserKey({ identifier: '2' })
    const state = reduce(reducer, undefined, [
      emplace([
        createUserKey({
          identifier: '1',
          attrs: { isShadow: true, parent: NIL_KEY_ID }
        })
      ]),
      shadowElectionSignal(success({
        origin: '1',
        result,
        obsolete: ['1']
      }), { uid: 'random' })
    ])

    expect(state.userKeys).to.deep.equal([result])
    expect(state.idToClique).to.deep.equal({ 2: 'uid-1' })
  })

  it('applies shadow merge', () => {
    const result = createUserKey({ identifier: '1', value: 'after' })
    const state = reduce(reducer, undefined, [
      emplace([
        createUserKey({ identifier: '1', value: 'before' }),
        createUserKey({
          identifier: '2',
          attrs: { isShadow: true, parent: '1' },
          value: 'after'
        })
      ]),
      shadowElectionSignal(success({
        origin: '2',
        result,
        obsolete: ['2']
      }), { uid: 'random' })
    ])

    expect(state.userKeys).to.deep.equal([result])
    expect(state.idToClique).to.deep.equal({ 1: 'uid-1' })
  })

  it('applies shadow purge', () => {
    const result = createUserKey({ identifier: '1' })
    const state = reduce(reducer, undefined, [
      emplace([
        result,
        createUserKey({
          identifier: '2',
          attrs: { isShadow: true, parent: '2' }
        })
      ]),
      shadowElectionSignal(success({
        origin: '1',
        result,
        obsolete: ['2']
      }), { uid: 'random' })
    ])

    expect(state.userKeys).to.deep.equal([result])
    expect(state.idToClique).to.deep.equal({ 1: 'uid-1' })
  })
})

describe('keyPinTogglingSignal', () => {
  beforeEach(() => {
    container.register<UidService>(UID_SERVICE_TOKEN, {
      useValue: new SequentialFakeUidService()
    })
  })

  it('pins a key', () => {
    const state = reduce(reducer, undefined, [
      emplace([createUserKey({ identifier: '1' })]),
      keyPinTogglingSignal(success({
        identifier: '1',
        isPinned: true
      }), { uid: 'random', clique: 'clique' })
    ])

    expect(state.userKeys[0].attrs.isPinned).to.be.true
  })
})
