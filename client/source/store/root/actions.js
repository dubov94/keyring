import axios from 'axios'
import SodiumWorker from '../../sodium.worker'
import Status from './status'
import {SESSION_TOKEN_HEADER_NAME} from '../../constants'

const sodiumWorker = new SodiumWorker()

const SodiumUtilities = {
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

const createSessionHeader = (sessionKey) => ({
  [SESSION_TOKEN_HEADER_NAME]: sessionKey
})

export default {
  async register ({ commit, dispatch }, { username, password, mail }) {
    let parametrization = await SodiumUtilities.generateArgon2Parametrization()
    let {authDigest, encryptionKey} =
      await SodiumUtilities.computeAuthDigestAndEncryptionKey(
        parametrization, password)
    let { data: response } =
      await axios.post('/api/authentication/register', {
        username,
        salt: parametrization,
        digest: authDigest,
        mail
      })
    if (response.error === 'NONE') {
      dispatch('importCredentials', {
        salt: parametrization,
        sessionKey: response.session_key,
        encryptionKey: encryptionKey
      })
      commit('session/setUsername', username)
      commit('setStatus', Status.ONLINE)
    }
    return response.error
  },
  async releaseMailToken ({ state }, { code }) {
    return (
      await axios.post('/api/administration/release-mail-token', { code }, {
        headers: createSessionHeader(state.sessionKey)
      })
    ).data.error
  },
  async logIn ({ commit, dispatch }, { username, password, persist }) {
    commit('setStatus', Status.CONNECTING)
    let { data: saltResponse } =
      await axios.get(`/api/authentication/get-salt/${username}`)
    if (saltResponse.error === 'NONE') {
      let { salt } = saltResponse
      let {authDigest, encryptionKey} =
        await SodiumUtilities.computeAuthDigestAndEncryptionKey(
          salt, password)
      let { data: authResponse } =
        await axios.post('/api/authentication/log-in', {
          username,
          digest: authDigest
        })
      if (authResponse.error === 'NONE') {
        let { payload } = authResponse
        dispatch('importCredentials', {
          salt,
          sessionKey: payload.session_key,
          encryptionKey: encryptionKey
        })
        if (payload.requirements.length === 0) {
          await dispatch('acceptUserKeys', {
            userKeys: payload.key_set.items
          })
        }
        commit('session/setUsername', username)
        commit('setStatus', Status.ONLINE)
        if (persist) {
          dispatch('depot/saveUsername', username)
        }
        return { success: true, requirements: payload.requirements }
      }
    }
    commit('setStatus', Status.OFFLINE)
    return { success: false }
  },
  importCredentials ({ commit }, { salt, sessionKey, encryptionKey }) {
    commit('setSalt', salt)
    commit('setSessionKey', sessionKey)
    commit('setEncryptionKey', encryptionKey)
  },
  async acceptUserKeys ({ commit, state }, { userKeys }) {
    commit('setUserKeys', await Promise.all(
      userKeys.map(async ({ identifier, password }) =>
        Object.assign({ identifier }, await SodiumUtilities.decryptPassword(
          state.encryptionKey, password))
      )
    ))
  },
  async createUserKey ({ commit, state }, { value, tags }) {
    let { data: response } =
      await axios.post('/api/administration/create-key', {
        password: await SodiumUtilities.encryptPassword(
          state.encryptionKey, { value, tags })
      }, { headers: createSessionHeader(state.sessionKey) })
    commit('unshiftUserKey', { identifier: response.identifier, value, tags })
  },
  async updateUserKey ({ commit, state }, { identifier, value, tags }) {
    await axios.put('/api/administration/update-key', {
      key: {
        identifier,
        password: await SodiumUtilities.encryptPassword(
          state.encryptionKey, { value, tags })
      }
    }, { headers: createSessionHeader(state.sessionKey) })
    commit('modifyUserKey', { identifier, value, tags })
  },
  async removeUserKey ({ commit, state }, { identifier }) {
    await axios.post('/api/administration/delete-key', { identifier }, {
      headers: createSessionHeader(state.sessionKey)
    })
    commit('deleteUserKey', identifier)
  },
  async changeMasterKey ({ dispatch, state }, { current, renewal }) {
    let curDigest = await SodiumUtilities.computeAuthDigest(state.salt, current)
    let newSalt = await SodiumUtilities.generateArgon2Parametrization()
    let {authDigest, encryptionKey} =
      await SodiumUtilities.computeAuthDigestAndEncryptionKey(newSalt, renewal)
    let { data: response } =
      await axios.post('/api/administration/change-master-key', {
        current_digest: curDigest,
        renewal: {
          salt: newSalt,
          digest: authDigest,
          keys: await Promise.all(state.userKeys.map(async (key) => ({
            identifier: key.identifier,
            password: await SodiumUtilities.encryptPassword(encryptionKey, {
              value: key.value,
              tags: key.tags
            })
          })))
        }
      }, {
        headers: createSessionHeader(state.sessionKey)
      })
    if (response.error === 'NONE') {
      dispatch('importCredentials', {
        salt: newSalt,
        sessionKey: response.session_key,
        encryptionKey: encryptionKey
      })
    }
    return response.error
  },
  async changeUsername ({ commit, state }, { username, password }) {
    let { data: { error } } =
      await axios.put('/api/administration/change-username', {
        digest: await SodiumUtilities.computeAuthDigest(state.salt, password),
        username
      }, {
        headers: createSessionHeader(state.sessionKey)
      })
    if (error === 'NONE') {
      if (state.depot.username === state.session.username) {
        commit('depot/setUsername', username)
      }
      commit('session/setUsername', username)
    }
    return error
  },
  async acquireMailToken ({ state }, { mail, password }) {
    return (
      await axios.post('/api/administration/acquire-mail-token', {
        digest: await SodiumUtilities.computeAuthDigest(state.salt, password),
        mail
      }, {
        headers: createSessionHeader(state.sessionKey)
      })
    ).data.error
  },
  async deleteAccount ({ state }, { password }) {
    return (
      await axios.post('/api/administration/delete-account', {
        digest: await SodiumUtilities.computeAuthDigest(state.salt, password)
      }, {
        headers: createSessionHeader(state.sessionKey)
      })
    ).data.error
  }
}
