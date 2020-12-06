import { container, inject, injectable } from 'tsyringe'
import { SODIUM_INTERFACE_TOKEN, SodiumInterface } from './sodium_interface'
import { Password } from '@/store/state'

const ARGON2_DEFAULT_M = 64 * 1024 * 1024
const ARGON2_DEFAULT_T = 1

const AUTH_DIGEST_SIZE_IN_BYTES = 32
const ENCRYPTION_KEY_SIZE_IN_BYTES = 32

const PARAMETRIZATION_REGULAR_EXPRESSION = new RegExp(
  '^\\$(argon2(?:i|d|id))' +
  '\\$m=([1-9][0-9]*),t=([1-9][0-9]*),p=([1-9][0-9]*)' +
  '\\$([A-Za-z0-9-_]{22})$'
)

export interface MasterKeyDerivatives {
  authDigest: string;
  encryptionKey: string;
}

@injectable()
export class SodiumClient {
  constructor (@inject(SODIUM_INTERFACE_TOKEN) private sodiumInterface: SodiumInterface) {}

  async generateArgon2Parametrization (): Promise<string> {
    return '$argon2id' +
      `$m=${ARGON2_DEFAULT_M},t=${ARGON2_DEFAULT_T},p=1` +
      `$${await this.sodiumInterface.toBase64(await this.sodiumInterface.generateSalt())}`
  }

  async computeArgon2HashForDigestAndKey (parametrization: string, password: string): Promise<Uint8Array> {
    const matches = PARAMETRIZATION_REGULAR_EXPRESSION.exec(parametrization)
    if (matches === null) {
      throw new Error(`Malformed parametrization: '${parametrization}'`)
    }
    const [, algorithm, mText, tText, pText, salt] = matches
    const [m, t, p] = [mText, tText, pText].map(Number)
    if (algorithm === 'argon2id' && p === 1) {
      return this.sodiumInterface.computeHash(
        t, m, await this.sodiumInterface.fromBase64(salt), password,
        AUTH_DIGEST_SIZE_IN_BYTES + ENCRYPTION_KEY_SIZE_IN_BYTES)
    } else {
      throw new Error('Unsupported hashing parameters: ' +
        `algorithm = '${algorithm}', lanes = '${p}'`)
    }
  }

  async extractAuthDigestAndEncryptionKey (hash: Uint8Array): Promise<MasterKeyDerivatives> {
    return {
      authDigest: await this.sodiumInterface.toBase64(hash.slice(0, AUTH_DIGEST_SIZE_IN_BYTES)),
      encryptionKey: await this.sodiumInterface.toBase64(hash.slice(-ENCRYPTION_KEY_SIZE_IN_BYTES))
    }
  }

  async computeAuthDigestAndEncryptionKey (parametrization: string, password: string): Promise<MasterKeyDerivatives> {
    const hash = await this.computeArgon2HashForDigestAndKey(
      parametrization, password)
    return this.extractAuthDigestAndEncryptionKey(hash)
  }

  async encryptMessage (encryptionKey: string, message: string): Promise<string> {
    const nonce = await this.sodiumInterface.generateNonce()
    const base64Cipher = await this.sodiumInterface.encryptMessage(
      await this.sodiumInterface.fromBase64(encryptionKey), nonce, message)
    return this.sodiumInterface.joinNonceCipher(nonce, base64Cipher)
  }

  async decryptMessage (encryptionKey: string, pack: string): Promise<string> {
    const [nonce, base64Cipher] = await this.sodiumInterface.splitNonceCipher(pack)
    return this.sodiumInterface.decryptMessage(
      await this.sodiumInterface.fromBase64(encryptionKey), nonce, base64Cipher)
  }

  async encryptPassword (encryptionKey: string, { value, tags }: Password): Promise<Password> {
    return {
      value: await this.encryptMessage(encryptionKey, value),
      tags: await Promise.all(tags.map(
        (tag: string) => this.encryptMessage(encryptionKey, tag)))
    }
  }

  async decryptPassword (encryptionKey: string, { value, tags }: Password): Promise<Password> {
    return {
      value: await this.decryptMessage(encryptionKey, value),
      tags: await Promise.all(tags.map(
        (tag: string) => this.decryptMessage(encryptionKey, tag)))
    }
  }
}

export const getSodiumClient = () => container.resolve(SodiumClient)
