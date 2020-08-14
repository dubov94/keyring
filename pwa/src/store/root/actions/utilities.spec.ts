import { expect } from 'chai'
import { SESSION_TOKEN_HEADER_NAME } from '@/constants'
import { createSessionHeader } from './utilities'

describe('createSessionHeader', () => {
  it('constructs an object with the header', () => {
    expect(createSessionHeader('key')).to.eql({
      [SESSION_TOKEN_HEADER_NAME]: 'key'
    })
  })
})
