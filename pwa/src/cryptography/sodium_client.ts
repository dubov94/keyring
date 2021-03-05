import { container, inject, injectable } from 'tsyringe'
import { SODIUM_WORKER_INTERFACE_TOKEN, SodiumWorkerInterface } from './sodium_worker_interface'
import { Password } from '@/redux/entities'
import { DeepReadonly } from 'ts-essentials'

const AUTH_DIGEST_SIZE_IN_BYTES = 32
const ENCRYPTION_KEY_SIZE_IN_BYTES = 32

export interface MasterKeyDerivatives {
  authDigest: string;
  encryptionKey: string;
}

interface Argon2Parametrization {
  separator: '$';
  type: 'argon2i' | 'argon2d' | 'argon2id';
  version: number;
  memoryInBytes: number;
  iterations: number;
  threads: number;
  salt: string;
}

// TODO: Re-enable version population once the grace period is over.
const serializeArgon2Parametrization = (struct: Argon2Parametrization): string => {
  // https://github.com/jedisct1/libsodium/blob/57d950a54e6f7743084092ba5d31b8fa0641eab2/src/libsodium/crypto_pwhash/argon2/argon2-encoding.c
  return [
    struct.separator,
    struct.type,
    struct.separator,
    [
      `m=${struct.memoryInBytes}`,
      `t=${struct.iterations}`,
      `p=${struct.threads}`
    ].join(','),
    struct.separator,
    struct.salt
  ].join('')
}

const parseArgon2Parametrization = (parametrization: string): Argon2Parametrization => {
  const SEPARATOR = '\\$'
  const TYPE = 'argon2(?:i|d|id)'
  const N = '[1-9][0-9]*'
  const BASE64 = '[A-Za-z0-9-_=]+'
  const regExp = new RegExp([
    '^',
    SEPARATOR,
    `(?<type>${TYPE})`,
    `(?:${SEPARATOR}v=(?<version>${N}))?`,
    SEPARATOR,
    [
      `m=(?<memoryInBytes>${N})`,
      `t=(?<iterations>${N})`,
      `p=(?<threads>${N})`
    ].join(','),
    SEPARATOR,
    `(?<salt>${BASE64})`,
    '$'
  ].join(''))
  const groups = regExp.exec(parametrization)!.groups!
  return <Argon2Parametrization>{
    separator: '$',
    type: groups.type,
    version: Number(groups.version || '19'),
    memoryInBytes: Number(groups.memoryInBytes),
    iterations: Number(groups.iterations),
    threads: Number(groups.threads),
    salt: groups.salt
  }
}

@injectable()
export class SodiumClient {
  constructor (@inject(SODIUM_WORKER_INTERFACE_TOKEN) private sodiumWorkerInterface: SodiumWorkerInterface) {}

  async generateNewParametrization (): Promise<string> {
    const salt = await this.sodiumWorkerInterface.toBase64(await this.sodiumWorkerInterface.generateSalt())
    // https://tools.ietf.org/html/draft-irtf-cfrg-argon2-12#section-4
    // https://github.com/golang/crypto/blob/5ea612d1eb830b38bc4e914e37f55311eb58adce/argon2/argon2.go
    return serializeArgon2Parametrization({
      separator: '$',
      type: 'argon2id',
      version: 19,
      memoryInBytes: 64 * 1024 * 1024,
      iterations: 1,
      threads: 1,
      salt
    })
  }

  async _computeArgon2HashForDigestAndKey (parametrization: string, password: string): Promise<Uint8Array> {
    const struct = parseArgon2Parametrization(parametrization)
    if (struct.type !== 'argon2id' || struct.version !== 19 || struct.threads !== 1) {
      throw new Error(`Unsupported Argon2 parametrization: ${JSON.stringify(struct)}`)
    }
    return this.sodiumWorkerInterface.computeHash(
      struct.iterations,
      struct.memoryInBytes,
      await this.sodiumWorkerInterface.fromBase64(struct.salt),
      password,
      AUTH_DIGEST_SIZE_IN_BYTES + ENCRYPTION_KEY_SIZE_IN_BYTES
    )
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
