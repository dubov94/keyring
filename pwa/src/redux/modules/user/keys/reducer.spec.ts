import { success } from '@/redux/flow_signal'
import { reduce } from '@/redux/testing'
import { expect } from 'chai'
import {
  create,
  creationSignal,
  deletionSignal,
  emplace,
  updationSignal
} from './actions'
import reducer from './reducer'

describe('semaphore', () => {
  it('increases on CUD commands', () => {
    const state = reducer(undefined, create({ value: 'value', tags: ['tag'] }))

    expect(state.semaphore).to.equal(1)
  })

  it('decreases on CUD finales', () => {
    const state = reducer(undefined, creationSignal(success({
      identifier: 'identifier',
      value: 'value',
      tags: ['tag']
    })))

    expect(state.semaphore).to.equal(-1)
  })
})

describe('emplace', () => {
  it('sorts and sets the keys', () => {
    const a = { identifier: 'A', value: 'b', tags: ['a', 'b'] }
    const b = { identifier: 'B', value: 'a', tags: ['a', 'c'] }
    const c = { identifier: 'C', value: 'a', tags: ['a', 'b', 'd'] }
    const d = { identifier: 'D', value: 'a', tags: ['a', 'b'] }
    const state = reducer(undefined, emplace([a, b, c, d]))

    expect(state.userKeys).to.deep.equal([d, a, c, b])
  })
})

describe('creationSignal', () => {
  it('prepends the new key', () => {
    const a = { identifier: 'A', value: 'a', tags: [] }
    const b = { identifier: 'A', value: 'b', tags: [] }
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
      emplace([{ identifier: 'A', value: 'x', tags: [] }]),
      updationSignal(success({ identifier: 'A', value: 'y', tags: ['t'] }))
    ])

    expect(state.userKeys).to.deep.equal([{ identifier: 'A', value: 'y', tags: ['t'] }])
  })
})

describe('deletionSignal', () => {
  it('deletes an existing key', () => {
    const state = reduce(reducer, undefined, [
      emplace([{ identifier: 'A', value: '', tags: [] }]),
      deletionSignal(success('A'))
    ])

    expect(state.userKeys).to.be.empty
  })
})
