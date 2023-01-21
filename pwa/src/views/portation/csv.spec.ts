import { expect } from 'chai'
import { either } from 'fp-ts'
import { deserializeVault } from './csv'

describe('deserializeVault', () => {
  it('maps into `VaultItem`', () => {
    const csv = [
      'url,username,password,foo,bar',
      'example.com,user,abc,foo,bar'
    ].join('\n')

    const results = deserializeVault(csv)

    expect(results).to.deep.equal(either.right([{
      url: 'example.com',
      username: 'user',
      password: 'abc',
      labels: ['foo', 'bar']
    }]))
  })

  it('ignores empty lines', () => {
    const csv = [
      '',
      'url,username,password',
      '',
      'example.com,user,abc',
      ''
    ].join('\n')

    const results = deserializeVault(csv)

    expect(results).to.deep.equal(either.right([{
      url: 'example.com',
      username: 'user',
      password: 'abc',
      labels: []
    }]))
  })

  it('ignores empty labels', () => {
    const csv = [
      'url,username,password,foo,bar,baz',
      'example.com,user,abc,,v,'
    ].join('\n')

    const results = deserializeVault(csv)

    expect(results).to.deep.equal(either.right([{
      url: 'example.com',
      username: 'user',
      password: 'abc',
      labels: ['v']
    }]))
  })

  it('checks if expected columns are present', () => {
    const csv = [
      'url,email,password',
      'example.com,mail@domain.com,abc'
    ].join('\n')

    const results = deserializeVault(csv)

    expect(results).to.deep.equal(either.left({
      message: 'Missing column \'username\''
    }))
  })
})
