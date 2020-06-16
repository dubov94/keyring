import * as WorkerMethods from './sodium.worker'
import SodiumWorker from './sodium.worker.ts'
import { Password } from '@/store/root/state'

const sodiumWorker = SodiumWorker<typeof WorkerMethods>()

export interface MasterKeyDerivatives {
  authDigest: string;
  encryptionKey: string;
}

export default {
  generateArgon2Parametrization (): Promise<string> {
    return sodiumWorker.generateArgon2Parametrization()
  },
  computeArgon2HashForDigestAndKey (parametrization: string, password: string): Promise<Uint8Array> {
    return sodiumWorker.computeArgon2HashForDigestAndKey(
      parametrization, password)
  },
  extractAuthDigestAndEncryptionKey (hash: Uint8Array): Promise<MasterKeyDerivatives> {
    return sodiumWorker.extractAuthDigestAndEncryptionKey(hash)
  },
  async computeAuthDigestAndEncryptionKey (parametrization: string, password: string): Promise<MasterKeyDerivatives> {
    const hash = await this.computeArgon2HashForDigestAndKey(
      parametrization, password)
    return await this.extractAuthDigestAndEncryptionKey(hash)
  },
  encryptMessage (encryptionKey: string, message: string): Promise<string> {
    return sodiumWorker.encryptMessage(encryptionKey, message)
  },
  decryptMessage (encryptionKey: string, cipher: string): Promise<string> {
    return sodiumWorker.decryptMessage(encryptionKey, cipher)
  },
  async encryptPassword (encryptionKey: string, { value, tags }: Password): Promise<Password> {
    return {
      value: await sodiumWorker.encryptMessage(encryptionKey, value),
      tags: await Promise.all(tags.map(
        (tag: string) => sodiumWorker.encryptMessage(encryptionKey, tag)))
    }
  },
  async decryptPassword (encryptionKey: string, { value, tags }: Password): Promise<Password> {
    return {
      value: await sodiumWorker.decryptMessage(encryptionKey, value),
      tags: await Promise.all(tags.map(
        (tag: string) => sodiumWorker.decryptMessage(encryptionKey, tag)))
    }
  }
}
