import axios from 'axios'
import bcrypt from 'bcryptjs'
import sha256 from 'crypto-js/sha256'
import base64 from 'crypto-js/enc-base64'
import {SESSION_LIFETIME_IN_MS} from '../constants'

const BCRYPT_ROUNDS_LOGARITHM = 12

const getDigest = (hash) => hash.slice(-31)

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
      return { session: state.sessionKey }
    }
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
    async register ({ dispatch }, { username, password, mail }) {
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
        dispatch('importKeys', { sessionKey: response.session_key, password })
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
          dispatch('importKeys', { sessionKey: payload.session_key, password })
          if (payload.challenge === 'NONE') {
            dispatch('administration/acceptKeys', {
              keys: payload.key_set.items
            })
          }
          return { success: true, challenge: payload.challenge }
        }
      }
      return { success: false, challenge: null }
    },
    importKeys ({ commit, dispatch }, { sessionKey, password }) {
      commit('setSessionKey', { sessionKey })
      commit('setEncryptionKey', { password })
      dispatch('scheduleBeat')
    },
    scheduleBeat ({ dispatch }) {
      setTimeout(() => {
        dispatch('keepAlive')
      }, SESSION_LIFETIME_IN_MS / 2)
    },
    async keepAlive ({ state, dispatch }) {
      await axios.put('/api/authentication/keep-alive', {
        session_key: state.sessionKey
      })
      dispatch('scheduleBeat')
    }
  }
}
