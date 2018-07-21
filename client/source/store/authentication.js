import axios from 'axios'
import bcrypt from 'bcryptjs'
import sha256 from 'crypto-js/sha256'
import base64 from 'crypto-js/enc-base64'

const BCRYPT_ROUNDS_LOGARITHM = 12

const getDigest = (hash) => hash.slice(-31)

export default {
  namespaced: true,
  state: {
    sessionKey: null,
    encryptionKey: null
  },
  mutations: {
    setSessionKey (state, { sessionKey }) {
      state.sessionKey = sessionKey
    },
    setEncryptionKey (state, { password }) {
      state.encryptionKey = base64.stringify(sha256(password))
    }
  },
  actions: {
    async register ({ commit }, { username, password, mail }) {
      let salt = await bcrypt.genSalt(BCRYPT_ROUNDS_LOGARITHM)
      let hash = await bcrypt.hash(password, salt)
      let { data: response } =
        await axios.post('/api/authentication/register', {
          username,
          salt,
          digest: getDigest(hash),
          mail
        })
      if (response.error === 'NONE') {
        commit('setSessionKey', { sessionKey: response.session_key })
        commit('setEncryptionKey', { password })
      }
      return response.error
    },
    async activate ({ state }, { code }) {
      return (await axios.post('/api/administration/activate', { code }, {
        headers: {
          session: state.sessionKey
        }
      })).data.error
    },
    async logIn ({ commit }, { username, password }) {
      let { data: saltResponse } =
        await axios.get(`/api/authentication/get-salt/${username}`)
      if (saltResponse.error === 'NONE') {
        let hash = await bcrypt.hash(password, saltResponse.salt)
        let { data: authResponse } =
          await axios.post('/api/authentication/log-in', {
            username,
            digest: getDigest(hash)
          })
        if (authResponse.error === 'NONE') {
          let { payload } = authResponse
          commit('setSessionKey', { sessionKey: payload.session_key })
          commit('setEncryptionKey', { password })
          return { success: true, isPending: payload.is_pending }
        }
      }
      return { success: false, isPending: null }
    }
  }
}
