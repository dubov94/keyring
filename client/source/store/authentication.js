import axios from 'axios'
import bcrypt from 'bcryptjs'
import sha256 from 'crypto-js/sha256'
import base64 from 'crypto-js/enc-base64'

const BCRYPT_ROUNDS_LOGARITHM = 12
const SESSION_LIFETIME_IN_SECONDS = 10 * 60

const getDigest = (hash) => hash.slice(-31)

const reloader = {
  identifier: null,
  postpone (delayInSeconds) {
    if (this.identifier !== null) {
      clearTimeout(this.identifier)
    }
    this.identifier = setTimeout(() => location.reload(), delayInSeconds * 1000)
  }
}

export default {
  state: {
    sessionKey: null,
    encryptionKey: null
  },
  getters: {
    encryptionKey (state) {
      return state.encryptionKey
    },
    sessionHeader (state) {
      reloader.postpone(SESSION_LIFETIME_IN_SECONDS)
      return { session: state.sessionKey }
    }
  },
  mutations: {
    setSessionKey (state, { sessionKey }) {
      reloader.postpone(SESSION_LIFETIME_IN_SECONDS)
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
    async activate ({ getters }, { code }) {
      return (await axios.post('/api/administration/activate', { code }, {
        headers: getters.sessionHeader
      })).data.error
    },
    async logIn ({ commit, dispatch }, { username, password }) {
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
          if (payload.challenge === 'NONE') {
            dispatch('administration/acceptKeys', {
              keys: payload.key_set.items
            })
          }
          return { success: true, challenge: payload.challenge }
        }
      }
      return { success: false, challenge: null }
    }
  }
}
