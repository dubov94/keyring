import { container, inject, injectable } from 'tsyringe'
import { SODIUM_WORKER_INTERFACE_TOKEN, SodiumWorkerInterface } from './sodium_worker_interface'
import { Password } from '@/redux/entities'
import { DeepReadonly } from 'ts-essentials'
import { parseArgon2Parametrization, recommendedArgon2Settings, serializeArgon2Parametrization } from './argon2'

const AUTH_DIGEST_SIZE_IN_BYTES = 32
const ENCRYPTION_KEY_SIZE_IN_BYTES = 32

export interface MasterKeyDerivatives {
  authDigest: string;
  encryptionKey: string;
}

@injectable()
export class SodiumClient {
  constructor (@inject(SODIUM_WORKER_INTERFACE_TOKEN) private sodiumWorkerInterface: SodiumWorkerInterface) {}

  async generateNewParametrization (): Promise<string> {
    const salt = await this.sodiumWorkerInterface.toBase64(await this.sodiumWorkerInterface.generateSalt())
    return serializeArgon2Parametrization({
      separator: '$',
      settings: recommendedArgon2Settings(),
      salt
    })
  }

  private async computeArgon2HashForDigestAndKey (parametrization: string, password: string): Promise<Uint8Array> {
    const struct = parseArgon2Parametrization(parametrization)
    if (struct.settings.type !== 'argon2id' ||
        struct.settings.version !== 'latest' ||
        struct.settings.threads !== 1) {
      throw new Error(`Unsupported Argon2 parametrization: ${JSON.stringify(struct)}`)
    }
    return this.sodiumWorkerInterface.computeHash(
      struct.settings.iterations,
      struct.settings.memoryInBytes,
      await this.sodiumWorkerInterface.fromBase64(struct.salt),
      password,
      AUTH_DIGEST_SIZE_IN_BYTES + ENCRYPTION_KEY_SIZE_IN_BYTES
    )
  }

  private async extractAuthDigestAndEncryptionKey (hash: Uint8Array): Promise<MasterKeyDerivatives> {
    return {
      authDigest: await this.sodiumWorkerInterface.toBase64(hash.slice(0, AUTH_DIGEST_SIZE_IN_BYTES)),
      encryptionKey: await this.sodiumWorkerInterface.toBase64(hash.slice(-ENCRYPTION_KEY_SIZE_IN_BYTES))
    }
  }

  async computeAuthDigestAndEncryptionKey (parametrization: string, password: string): Promise<MasterKeyDerivatives> {
    const hash = await this.computeArgon2HashForDigestAndKey(parametrization, password)
    return this.extractAuthDigestAndEncryptionKey(hash)
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
