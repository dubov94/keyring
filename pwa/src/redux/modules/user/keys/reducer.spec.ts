import { success } from '@/redux/flow_signal'
import { reduce } from '@/redux/testing'
import { expect } from 'chai'
import {
  create,
  creationSignal,
  delete_,
  deletionSignal,
  emplace,
  update,
  updationSignal
} from './actions'
import reducer from './reducer'

describe('semaphore', () => {
  ;[
    create({ value: 'value', tags: ['tag'] }),
    update({ identifier: 'identifier', value: 'value', tags: ['tag'] }),
    delete_('identifier')
  ].forEach((trigger) => {
    it(`increases on ${trigger.type}`, () => {
      const state = reducer(undefined, trigger)

      expect(state.semaphore).to.equal(1)
    })
  })

  ;[
    creationSignal(success({ identifier: 'identifier', value: 'value', tags: ['tag'] })),
    updationSignal(success({ identifier: 'identifier', value: 'value', tags: ['tag'] })),
    deletionSignal(success('identifier'))
  ].forEach((trigger) => {
    it(`decreases on ${trigger.type}`, () => {
      const state = reducer(undefined, trigger)

      expect(state.semaphore).to.equal(-1)
    })
  })
})

describe('emplace', () => {
  it('sorts and sets the keys', () => {
    const a = { identifier: '0', value: 'b', tags: ['a', 'b'] }
    const b = { identifier: '1', value: 'a', tags: ['a', 'c'] }
    const c = { identifier: '2', value: 'a', tags: ['a', 'b', 'd'] }
    const d = { identifier: '3', value: 'a', tags: ['a', 'b'] }
    const state = reducer(undefined, emplace([a, b, c, d]))

    expect(state.userKeys).to.deep.equal([d, a, c, b])
  })
})

describe('creationSignal', () => {
  it('prepends the new key', () => {
    const a = { identifier: '0', value: 'a', tags: [] }
    const b = { identifier: '0', value: 'b', tags: [] }
    const state = reduce(reducer, undefined, [
      emplace([a]),
      creationSignal(success(b))
    ])

    expect(state.userKeys).to.deep.equal([b, a])
  })
})

describe('updationSignal', () => {
  it('updates an existing key', () => {
    const state = reduce(reducer, undefined, [
      emplace([{ identifier: '0', value: 'x', tags: [] }]),
      updationSignal(success({ identifier: '0', value: 'y', tags: ['t'] }))
    ])

    expect(state.userKeys).to.deep.equal([{ identifier: '0', value: 'y', tags: ['t'] }])
  })
})

describe('deletionSignal', () => {
  it('deletes an existing key', () => {
    const state = reduce(reducer, undefined, [
      emplace([{ identifier: '0', value: '', tags: [] }]),
      deletionSignal(success('0'))
    ])

    expect(state.userKeys).to.be.empty
  })
})
