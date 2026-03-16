import { assert, expect } from 'chai'
import { either, function as fn } from 'fp-ts'
import { Password } from '@/redux/domain'
import { createCliqueFromPassword } from '@/redux/modules/user/keys/selectors'
import { convertImportedRowToPassword, deserializeVault, ImportedRow, serializeVault } from './csv'

describe('deserializeVault', () => {
  it('maps into `ImportedRow`', () => {
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

  it('checks if the password column is present', () => {
    const csv = [
      'url,email',
      'example.com,mail@domain.com'
    ].join('\n')

    const results = deserializeVault(csv)

    expect(results).to.deep.equal(either.left({
      message: 'Missing column \'password\''
    }))
  })

  it('is able to process uppercase headers', () => {
    const csv = [
      'URL,USERNAME,PASSWORD',
      'example.com,user,abc'
    ].join('\n')

    const results = deserializeVault(csv)

    expect(results).to.deep.equal(either.right([{
      url: 'example.com',
      username: 'user',
      password: 'abc',
      labels: []
    }]))
  })
})

describe('serializeVault', () => {
  it('creates a table from cliques', () => {
    const cliques = [
      createCliqueFromPassword('clique-1', 'key-1', {
        value: 'ab',
        tags: ['a', 'b']
      }, 0),
      createCliqueFromPassword('clique-2', 'key-2', {
        value: 'cdef',
        tags: ['c', 'd', 'e', 'f']
      }, 0)
    ]

    const csv = serializeVault(cliques)

    expect(csv).to.equal([
      'password,label_1,label_2,label_3,label_4',
      'ab,a,b,,',
      'cdef,c,d,e,f'
    ].join('\n'))
  })
})

describe('invertibility', () => {
  it('applies to `serializeVault` and `deserializeVault`', () => {
    const passwords: Password[] = [{
      value: 'ab',
      tags: ['a', 'b']
    }, {
      value: 'cdef',
      tags: ['c', 'd', 'e', 'f']
    }]

    const csv = serializeVault([
      createCliqueFromPassword('clique-1', 'key-1', passwords[0], 0),
      createCliqueFromPassword('clique-2', 'key-2', passwords[1], 0)
    ])
    const importedRows = fn.pipe(
      deserializeVault(csv),
      either.getOrElse((): ImportedRow[] => [])
    )

    assert(importedRows.length === 2)
    const importedPasswords = importedRows.map(convertImportedRowToPassword)
    expect(importedPasswords).to.deep.equal([
      { value: 'ab', tags: ['a', 'b'] },
      { value: 'cdef', tags: ['c', 'd', 'e', 'f'] }
    ])
  })
})
