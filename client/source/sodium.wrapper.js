import SodiumWorker from './sodium.worker'

const sodiumWorker = new SodiumWorker()

export default {
  generateArgon2Parametrization () {
    return sodiumWorker.generateArgon2Parametrization()
  },
  computeArgon2Hash (parametrization, password) {
    return sodiumWorker.computeArgon2Hash(parametrization, password)
  },
  extractAuthDigestAndEncryptionKey (hash) {
    return sodiumWorker.extractAuthDigestAndEncryptionKey(hash)
  },
  async computeAuthDigestAndEncryptionKey (parametrization, password) {
    let hash = await this.computeArgon2Hash(parametrization, password)
    return this.extractAuthDigestAndEncryptionKey(hash)
  },
  async computeAuthDigest (parametrization, password) {
    return (
      await this.computeAuthDigestAndEncryptionKey(parametrization, password)
    ).authDigest
  },
  encryptMessage (encryptionKey, message) {
    return sodiumWorker.encryptMessage(encryptionKey, message)
  },
  descryptMessage (encryptionKey, cipher) {
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
