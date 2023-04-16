import { assert, expect } from 'chai'
import 'reflect-metadata'
import { container } from 'tsyringe'
import { SODIUM_WORKER_INTERFACE_TOKEN, SodiumWorkerInterface } from './sodium_worker_interface'
import { SodiumClient } from './sodium_client'
import { recommendedArgon2Settings } from './argon2'
import pad from 'lodash/pad'

const toUtf8 = (uint8Array: Uint8Array) => new TextDecoder().decode(uint8Array)
const fromUtf8 = (utf8String: string) => new TextEncoder().encode(utf8String)

describe('SodiumClient', () => {
  before(() => {
    container.register<SodiumWorkerInterface>(SODIUM_WORKER_INTERFACE_TOKEN, {
      useValue: <SodiumWorkerInterface>{
        toString: (uint8Array) => Promise.resolve(toUtf8(uint8Array)),
        fromString: (utf8String) => Promise.resolve(fromUtf8(utf8String)),
        toBase64: (uint8Array) => Promise.resolve(toUtf8(uint8Array)),
        fromBase64: (base64String) => Promise.resolve(fromUtf8(base64String)),
        pad: (buffer, blockSize) => {
          const string = toUtf8(buffer)
          return Promise.resolve(fromUtf8(pad(string, string.length + blockSize)))
        },
        unpad: (buffer, blockSize) => {
          const string = toUtf8(buffer)
          expect(string.slice(0, blockSize)).to.equal(' '.repeat(blockSize))
          return Promise.resolve(fromUtf8(string.slice(blockSize)))
        },
        generateSalt: () => Promise.resolve(fromUtf8('_saltsaltsaltsaltsalt_')),
        computeHash: (iterations, memoryInBytes, salt, password, hashLength) => {
          const struct = recommendedArgon2Settings()
          expect(struct.iterations).to.equal(iterations)
          expect(struct.memoryInBytes).to.equal(memoryInBytes)
          const hash = JSON.stringify([toUtf8(salt), password])
          assert.isAtMost(hash.length, hashLength)
          return Promise.resolve(fromUtf8(pad(hash, hashLength)))
        },
        generateNonce: () => Promise.resolve(fromUtf8('nonce')),
        encryptMessage: (encryptionKey, nonce, message) => {
          return Promise.resolve(fromUtf8(JSON.stringify({
            encryptionKey: toUtf8(encryptionKey),
            nonce: toUtf8(nonce),
            message: toUtf8(message)
          })))
        },
        decryptMessage: (encryptionKey, nonce, cipher) => {
          const payload = JSON.parse(toUtf8(cipher))
          expect(payload.encryptionKey).to.equal(toUtf8(encryptionKey))
          expect(payload.nonce).to.equal(toUtf8(nonce))
          return Promise.resolve(fromUtf8(payload.message))
        },
        joinNonceCipher: (nonce, cipher) => {
          return Promise.resolve(fromUtf8(JSON.stringify({
            nonce: toUtf8(nonce),
            cipher: toUtf8(cipher)
          })))
        },
        splitNonceCipher: (pack) => {
          const { nonce, cipher } = JSON.parse(toUtf8(pack))
          return Promise.all([fromUtf8(nonce), fromUtf8(cipher)])
        }
      }
    })
  })

  it('generates a hash with given parameters', async () => {
    const sodiumClient = container.resolve(SodiumClient)

    const derivatives =
      await sodiumClient.computeAuthDigestAndEncryptionKey(
        await sodiumClient.generateNewParametrization(), 'pass')

    const [salt, password] = JSON.parse(derivatives.authDigest + derivatives.encryptionKey)
    expect(salt).to.equal('_saltsaltsaltsaltsalt_')
    expect(password).to.equal('pass')
  })

  it('can encrypt and decrypt passwords', async () => {
    const sodiumClient = container.resolve(SodiumClient)

    const password = await sodiumClient.decryptPassword('key',
      await sodiumClient.encryptPassword('key', { value: 'value', tags: ['tag'] }))

    expect(password.value).to.equal('value')
    expect(password.tags).to.eql(['tag'])
  })
})
