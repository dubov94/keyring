import SodiumWorker from './sodium.worker'

const sodiumWorker = new SodiumWorker()

export default {
  generateArgon2Parametrization () {
    return sodiumWorker.generateArgon2Parametrization()
  },
  computeArgon2HashForDigestAndKey (parametrization, password) {
    return sodiumWorker.computeArgon2HashForDigestAndKey(
        parametrization, password)
  },
  extractAuthDigestAndEncryptionKey (hash) {
    return sodiumWorker.extractAuthDigestAndEncryptionKey(hash)
  },
  async computeAuthDigestAndEncryptionKey (parametrization, password) {
    let hash = await this.computeArgon2HashForDigestAndKey(
        parametrization, password)
    return this.extractAuthDigestAndEncryptionKey(hash)
  },
  encryptMessage (encryptionKey, message) {
    return sodiumWorker.encryptMessage(encryptionKey, message)
  },
  decryptMessage (encryptionKey, cipher) {
    return sodiumWorker.decryptMessage(encryptionKey, cipher)
  },
  async encryptPassword (encryptionKey, { value, tags }) {
    return {
      value: await sodiumWorker.encryptMessage(encryptionKey, value),
      tags: await Promise.all(tags.map(
        tag => sodiumWorker.encryptMessage(encryptionKey, tag)))
    }
  },
  async decryptPassword (encryptionKey, { value, tags }) {
    return {
      value: await sodiumWorker.decryptMessage(encryptionKey, value),
      tags: await Promise.all(tags.map(
        tag => sodiumWorker.decryptMessage(encryptionKey, tag)))
    }
  }
}
