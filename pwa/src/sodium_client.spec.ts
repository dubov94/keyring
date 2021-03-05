import { expect } from 'chai'
import 'reflect-metadata'
import { container } from 'tsyringe'
import { SODIUM_WORKER_INTERFACE_TOKEN, SodiumWorkerInterface } from './sodium_worker_interface'
import { SodiumClient } from './sodium_client'

const toUtf8 = (uint8Array: Uint8Array) => new TextDecoder().decode(uint8Array)
const fromUtf8 = (utf8String: string) => new TextEncoder().encode(utf8String)

describe('SodiumClient', () => {
  before(() => {
    container.register<SodiumWorkerInterface>(SODIUM_WORKER_INTERFACE_TOKEN, {
      useValue: {
        toBase64: (uint8Array) => Promise.resolve(toUtf8(uint8Array)),
        fromBase64: (base64String) => Promise.resolve(fromUtf8(base64String)),
        generateSalt: () => Promise.resolve(fromUtf8('_saltsaltsaltsaltsalt_')),
        generateNonce: () => Promise.resolve(fromUtf8('nonce')),
        computeHash: (iterations, memoryInBytes, salt, password, hashLength) => {
          return Promise.resolve(fromUtf8(JSON.stringify({
            iterations,
            memoryInBytes,
            salt: toUtf8(salt),
            password,
            hashLength
          })))
        },
        encryptMessage: (encryptionKey, nonce, message) => {
          return Promise.resolve(JSON.stringify({
            encryptionKey: toUtf8(encryptionKey),
            nonce: toUtf8(nonce),
            message
          }))
        },
        decryptMessage: (encryptionKey, nonce, cipher) => {
          const payload = JSON.parse(cipher)
          expect(payload.encryptionKey).to.equal(toUtf8(encryptionKey))
          expect(payload.nonce).to.equal(toUtf8(nonce))
          return Promise.resolve(payload.message)
        },
        joinNonceCipher: (nonce, cipher) => {
          return Promise.resolve(JSON.stringify({
            nonce: toUtf8(nonce),
            cipher
          }))
        },
        splitNonceCipher: (pack) => {
          const { nonce, cipher } = JSON.parse(pack)
          return Promise.all([fromUtf8(nonce), cipher])
        }
      }
    })
  })

  it('generates a hash with given parameters', async () => {
    const sodiumClient = container.resolve(SodiumClient)

    const json = JSON.parse(toUtf8(
      await sodiumClient._computeArgon2HashForDigestAndKey(
        await sodiumClient.generateNewParametrization(), 'pass')))

    expect(json.salt).to.equal('_saltsaltsaltsaltsalt_')
    expect(json.password).to.equal('pass')
  })

  it('can encrypt and decrypt passwords', async () => {
    const sodiumClient = container.resolve(SodiumClient)

    const password = await sodiumClient.decryptPassword('key',
      await sodiumClient.encryptPassword('key', { value: 'value', tags: ['tag'] }))

    expect(password.value).to.equal('value')
    expect(password.tags).to.eql(['tag'])
  })
})
