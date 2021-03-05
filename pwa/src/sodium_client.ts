import { container, inject, injectable } from 'tsyringe'
import { SODIUM_WORKER_INTERFACE_TOKEN, SodiumWorkerInterface } from './sodium_worker_interface'
import { Password } from '@/redux/entities'
import { DeepReadonly } from 'ts-essentials'

const ARGON2_DEFAULT_M = 64 * 1024 * 1024
const ARGON2_DEFAULT_T = 1

const AUTH_DIGEST_SIZE_IN_BYTES = 32
const ENCRYPTION_KEY_SIZE_IN_BYTES = 32

const PARAMETRIZATION_REGULAR_EXPRESSION = new RegExp(
  '^\\$(argon2(?:i|d|id))\\$m=([1-9][0-9]*),t=([1-9][0-9]*),p=([1-9][0-9]*)\\$([A-Za-z0-9-_]{22})$'
)

export interface MasterKeyDerivatives {
  authDigest: string;
  encryptionKey: string;
}

@injectable()
export class SodiumClient {
  constructor (@inject(SODIUM_WORKER_INTERFACE_TOKEN) private sodiumWorkerInterface: SodiumWorkerInterface) {}

  async generateNewParametrization (): Promise<string> {
    const salt = await this.sodiumWorkerInterface.toBase64(await this.sodiumWorkerInterface.generateSalt())
    // https://github.com/jedisct1/libsodium/blob/57d950a54e6f7743084092ba5d31b8fa0641eab2/src/libsodium/crypto_pwhash/argon2/argon2-encoding.c
    return `$argon2id$m=${ARGON2_DEFAULT_M},t=${ARGON2_DEFAULT_T},p=1$${salt}`
  }

  async _computeArgon2HashForDigestAndKey (parametrization: string, password: string): Promise<Uint8Array> {
    const matches = PARAMETRIZATION_REGULAR_EXPRESSION.exec(parametrization)
    if (matches === null) {
      throw new Error(`Malformed parametrization: '${parametrization}'`)
    }
    const [, algorithm, mText, tText, pText, salt] = matches
    const [m, t, p] = [mText, tText, pText].map(Number)
    if (algorithm === 'argon2id' && p === 1) {
      return this.sodiumWorkerInterface.computeHash(
        t, m, await this.sodiumWorkerInterface.fromBase64(salt), password,
        AUTH_DIGEST_SIZE_IN_BYTES + ENCRYPTION_KEY_SIZE_IN_BYTES)
    } else {
      throw new Error('Unsupported hashing parameters: ' +
        `algorithm = '${algorithm}', lanes = '${p}'`)
    }
  }

  async _extractAuthDigestAndEncryptionKey (hash: Uint8Array): Promise<MasterKeyDerivatives> {
    return {
      authDigest: await this.sodiumWorkerInterface.toBase64(hash.slice(0, AUTH_DIGEST_SIZE_IN_BYTES)),
      encryptionKey: await this.sodiumWorkerInterface.toBase64(hash.slice(-ENCRYPTION_KEY_SIZE_IN_BYTES))
    }
  }

  async computeAuthDigestAndEncryptionKey (parametrization: string, password: string): Promise<MasterKeyDerivatives> {
    const hash = await this._computeArgon2HashForDigestAndKey(parametrization, password)
    return this._extractAuthDigestAndEncryptionKey(hash)
  }

  async encryptMessage (encryptionKey: string, message: string): Promise<string> {
    const nonce = await this.sodiumWorkerInterface.generateNonce()
    const base64Cipher = await this.sodiumWorkerInterface.encryptMessage(
      await this.sodiumWorkerInterface.fromBase64(encryptionKey), nonce, message)
    return this.sodiumWorkerInterface.joinNonceCipher(nonce, base64Cipher)
  }

  async decryptMessage (encryptionKey: string, pack: string): Promise<string> {
    const [nonce, base64Cipher] = await this.sodiumWorkerInterface.splitNonceCipher(pack)
    return this.sodiumWorkerInterface.decryptMessage(
      await this.sodiumWorkerInterface.fromBase64(encryptionKey), nonce, base64Cipher)
  }

  async encryptPassword (encryptionKey: string, { value, tags }: DeepReadonly<Password>): Promise<Password> {
    return {
      value: await this.encryptMessage(encryptionKey, value),
      tags: await Promise.all(tags.map(
        (tag: string) => this.encryptMessage(encryptionKey, tag)))
    }
  }

  async decryptPassword (encryptionKey: string, { value, tags }: DeepReadonly<Password>): Promise<Password> {
    return {
      value: await this.decryptMessage(encryptionKey, value),
      tags: await Promise.all(tags.map(
        (tag: string) => this.decryptMessage(encryptionKey, tag)))
    }
  }
}

export const getSodiumClient = () => container.resolve(SodiumClient)
