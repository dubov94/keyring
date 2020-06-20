import axios from 'axios'
import { container } from 'tsyringe'
import { SodiumClient } from '@/sodium_client'
import { createSessionHeader } from './utilities'

export default {
  async acquireMailToken ({ state }, { mail, password }) {
    return (
      await axios.post('/api/administration/acquire-mail-token', {
        digest: (await container.resolve(SodiumClient).computeAuthDigestAndEncryptionKey(
          state.parametrization, password)).authDigest,
        mail
      }, {
        headers: createSessionHeader(state.sessionKey)
      })
    ).data.error
  },
  async releaseMailToken ({ state }, { code }) {
    return (
      await axios.post('/api/administration/release-mail-token', { code }, {
        headers: createSessionHeader(state.sessionKey)
      })
    ).data.error
  }
}
