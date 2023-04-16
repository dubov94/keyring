import { container, inject, injectable } from 'tsyringe'
import { SODIUM_WORKER_INTERFACE_TOKEN, SodiumWorkerInterface } from './sodium_worker_interface'
import { Password } from '@/redux/domain'
import { DeepReadonly } from 'ts-essentials'
import { parseArgon2Parametrization, recommendedArgon2Settings, serializeArgon2Parametrization } from './argon2'
import isEqual from 'lodash/isEqual'

const AUTH_DIGEST_SIZE_IN_BYTES = 32
const ENCRYPTION_KEY_SIZE_IN_BYTES = 32

const LETTER_BETA = 'β'
const PADDING_BLOCK_SIZE = 16

export interface MasterKeyDerivatives {
  authDigest: string;
  encryptionKey: string;
}

@injectable()
export class SodiumClient {
  constructor (@inject(SODIUM_WORKER_INTERFACE_TOKEN) private swi: SodiumWorkerInterface) {}

  async generateNewParametrization (): Promise<string> {
    const salt = await this.swi.toBase64(await this.swi.generateSalt())
    return serializeArgon2Parametrization({
      separator: '$',
      settings: recommendedArgon2Settings(),
      salt
    })
  }

  isParametrizationUpToDate (parametrization: string): boolean {
    const struct = parseArgon2Parametrization(parametrization)
    return isEqual(struct.settings, recommendedArgon2Settings())
  }

  private async computeArgon2HashForDigestAndKey (parametrization: string, password: string): Promise<Uint8Array> {
    const struct = parseArgon2Parametrization(parametrization)
    if (struct.settings.type !== 'argon2id' ||
        struct.settings.version !== 'latest' ||
        struct.settings.threads !== 1) {
      throw new Error(`Unsupported Argon2 parametrization: ${JSON.stringify(struct)}`)
    }
    return this.swi.computeHash(
      struct.settings.iterations,
      struct.settings.memoryInBytes,
      await this.swi.fromBase64(struct.salt),
      password,
      AUTH_DIGEST_SIZE_IN_BYTES + ENCRYPTION_KEY_SIZE_IN_BYTES
    )
  }

  private async extractAuthDigestAndEncryptionKey (hash: Uint8Array): Promise<MasterKeyDerivatives> {
    return {
      authDigest: await this.swi.toBase64(hash.slice(0, AUTH_DIGEST_SIZE_IN_BYTES)),
      encryptionKey: await this.swi.toBase64(hash.slice(-ENCRYPTION_KEY_SIZE_IN_BYTES))
    }
  }

  // https://crypto.stackexchange.com/q/102449 and the references there are a
  // good starting point for this scheme analysis.
  async computeAuthDigestAndEncryptionKey (parametrization: string, password: string): Promise<MasterKeyDerivatives> {
    const hash = await this.computeArgon2HashForDigestAndKey(parametrization, password)
    return this.extractAuthDigestAndEncryptionKey(hash)
  }

  async encryptMessage (encryptionKey: string, message: string): Promise<string> {
    const nonce = await this.swi.generateNonce()
    const cipher = await this.swi.encryptMessage(
      await this.swi.fromBase64(encryptionKey),
      nonce,
      await this.swi.pad(await this.swi.fromString(message), PADDING_BLOCK_SIZE)
    )
    const pack = await this.swi.toBase64(
      await this.swi.joinNonceCipher(nonce, cipher))
    return `${LETTER_BETA}:${pack}`
  }

  private async decryptPreBeta (encryptionKey: string, pack: string): Promise<string> {
    const nonceBase64Length = await this.swi.nonceBase64Length()
    const [nonce, cipher] = await Promise.all([
      pack.slice(0, nonceBase64Length),
      pack.slice(nonceBase64Length)
    ].map(this.swi.fromBase64))
    const message = await this.swi.decryptMessage(
      await this.swi.fromBase64(encryptionKey),
      nonce,
      cipher
    )
    return this.swi.toString(message)
  }

  async decryptMessage (encryptionKey: string, pack: string): Promise<string> {
    if (!pack.includes(':')) {
      // We can get rid of `decryptPreBeta` once everyone migrates.
      return this.decryptPreBeta(encryptionKey, pack)
    }
    const [type, payload] = pack.split(':', 2)
    if (type !== LETTER_BETA) {
      throw new Error(`Unsupported encryption: ${type}`)
    }
    const [nonce, cipher] = await this.swi.splitNonceCipher(
      await this.swi.fromBase64(payload))
    const message = await this.swi.unpad(
      await this.swi.decryptMessage(
        await this.swi.fromBase64(encryptionKey),
        nonce,
        cipher
      ),
      PADDING_BLOCK_SIZE
    )
    return await this.swi.toString(message)
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
