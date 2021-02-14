import { expect } from 'chai'
import { rehydrateDepot } from './actions'
import reducer from './reducer'

describe('rehydrateDepot', () => {
  it('restores values', () => {
    const state = reducer(undefined, rehydrateDepot({
      username: 'username',
      salt: 'salt',
      hash: 'hash',
      vault: 'vault'
    }))

    expect(state.username).to.equal('username')
    expect(state.salt).to.equal('salt')
    expect(state.hash).to.equal('hash')
    expect(state.vault).to.equal('vault')
  })
})
