import { cancel, FlowSignalKind, indicator, success } from './flow_signal'
import { identity, reducer } from './remote_data'
import { option, these } from 'fp-ts'
import { expect } from 'chai'

describe('reducer', () => {
  const testReducer = reducer(identity<number>(), identity<string>(), identity<number>())

  it('sets an indicator', () => {
    const remoteData = testReducer({
      indicator: option.of(1),
      result: option.zero()
    }, indicator(2))

    expect(remoteData.indicator).to.deep.equal(option.of(2))
  })

  it('replaces the result on success', () => {
    const remoteData = testReducer({
      indicator: option.of(1),
      result: option.of(these.both('abc', 2))
    }, success('def'))

    expect(remoteData.indicator).to.deep.equal(option.zero())
    expect(remoteData.result).to.deep.equal(option.of(these.left('def')))
  })

  it('resets the indicator on cancel', () => {
    const remoteData = testReducer({
      indicator: option.of(1),
      result: option.of(these.left('abc'))
    }, cancel())

    expect(remoteData.indicator).to.deep.equal(option.zero())
    expect(remoteData.result).to.deep.equal(option.of(these.left('abc')))
  })

  it('replaces the error when it exists', () => {
    const remoteData = testReducer({
      indicator: option.of(1),
      result: option.of(these.both('abc', 2))
    }, { kind: FlowSignalKind.ERROR, error: 3 })

    expect(remoteData.indicator).to.deep.equal(option.zero())
    expect(remoteData.result).to.deep.equal(option.of(these.both('abc', 3)))
  })

  it('sets an error when there was no other error', () => {
    const remoteData = testReducer({
      indicator: option.of(1),
      result: option.of(these.left('abc'))
    }, { kind: FlowSignalKind.ERROR, error: 2 })

    expect(remoteData.indicator).to.deep.equal(option.zero())
    expect(remoteData.result).to.deep.equal(option.of(these.both('abc', 2)))
  })
})
