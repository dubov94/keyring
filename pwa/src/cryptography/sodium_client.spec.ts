import { assert, expect } from 'chai'
import 'reflect-metadata'
import { container } from 'tsyringe'
import { SODIUM_WORKER_INTERFACE_TOKEN, SodiumWorkerInterface } from './sodium_worker_interface'
import { SodiumClient } from './sodium_client'
import { recommendedArgon2Settings } from './argon2'
import pad from 'lodash/pad'

const toBase64 = (uint8Array: Uint8Array) => Buffer.from(uint8Array).toString('base64')
const fromBase64 = (base64String: string) => new Uint8Array(Buffer.from(base64String, 'base64'))
const toUtf8 = (uint8Array: Uint8Array) => new TextDecoder().decode(uint8Array)
const fromUtf8 = (utf8String: string) => new TextEncoder().encode(utf8String)

describe('SodiumClient', () => {
  beforeEach(() => {
    container.register<SodiumWorkerInterface>(SODIUM_WORKER_INTERFACE_TOKEN, {
      useValue: <SodiumWorkerInterface>{
        toString: (uint8Array) => Promise.resolve(toUtf8(uint8Array)),
        fromString: (utf8String) => Promise.resolve(fromUtf8(utf8String)),
        toBase64: (uint8Array) => Promise.resolve(toBase64(uint8Array)),
        fromBase64: (base64String) => Promise.resolve(fromBase64(base64String)),
        pad: (buffer, blockSize) => {
          return Promise.resolve(fromUtf8(JSON.stringify({
            buffer: toUtf8(buffer),
            blockSize
          })))
        },
        unpad: (buffer, blockSize) => {
          const payload = JSON.parse(toUtf8(buffer))
          expect(payload.blockSize).to.equal(blockSize)
          return Promise.resolve(fromUtf8(payload.buffer))
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
          return Promise.resolve([fromUtf8(nonce), fromUtf8(cipher)])
        }
      }
    })
  })

  it('generates a hash with given parameters', async () => {
    const sodiumClient = container.resolve(SodiumClient)

    const derivatives =
      await sodiumClient.computeAuthDigestAndEncryptionKey(
        await sodiumClient.generateNewParametrization(), 'pass')

    const [salt, password] = JSON.parse(
      toUtf8(fromBase64(derivatives.authDigest)) +
      toUtf8(fromBase64(derivatives.encryptionKey))
    )
    expect(salt).to.equal('_saltsaltsaltsaltsalt_')
    expect(password).to.equal('pass')
  })

  it('can encrypt and decrypt passwords', async () => {
    const sodiumClient = container.resolve(SodiumClient)

    const password = await sodiumClient.decryptPassword('base64Key',
      await sodiumClient.encryptPassword('base64Key', { value: 'value', tags: ['tag'] }))

    expect(password.value).to.equal('value')
    expect(password.tags).to.deep.equal(['tag'])
  })
})
