import { expect } from 'chai'
import { hideToast, toastReadyToBeShown } from './actions'
import reducer from './reducer'

describe('toastReadyToBeShown', () => {
  it('displays a toast with the timeout', () => {
    const state = reducer(undefined, toastReadyToBeShown({
      message: 'message',
      timeout: 1000
    }))

    expect(state.message).to.equal('message')
    expect(state.timeout).to.equal(1000)
    expect(state.show).to.be.true
  })
})

describe('hideToast', () => {
  it('makes the toast invisible', () => {
    const state = reducer({
      show: true,
      message: null,
      timeout: NaN
    }, hideToast())

    expect(state.show).to.be.false
  })
})
