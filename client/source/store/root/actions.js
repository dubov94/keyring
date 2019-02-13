import aes from 'crypto-js/aes'
import axios from 'axios'
import base64 from 'crypto-js/enc-base64'
import bcrypt from 'bcryptjs'
import encUtf8 from 'crypto-js/enc-utf8'
import sha256 from 'crypto-js/sha256'
import SodiumWorker from '../../sodium.worker'
import {SESSION_TOKEN_HEADER_NAME} from '../../constants'

const BcryptAesCryptography = {
  BCRYPT_ROUNDS_LOGARITHM: 12,
  getDigest: (hash) => hash.slice(-31),
  computeEcnryptionKey: (masterKey) => base64.stringify(sha256(masterKey)),
  encryptPassword: (encryptionKey, { value, tags }) => ({
    value: aes.encrypt(value, encryptionKey).toString(),
    tags: tags.map(tag => aes.encrypt(tag, encryptionKey).toString())
  }),
  decryptPassword: (encryptionKey, { value, tags }) => ({
    value: aes.decrypt(value, encryptionKey).toString(encUtf8),
    tags: tags.map(tag => aes.decrypt(tag, encryptionKey).toString(encUtf8))
  })
}

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
    let hash =
      await SodiumUtilities.computeArgon2Hash(parametrization, password)
    let {authDigest, encryptionKey} =
      await SodiumUtilities.extractAuthDigestAndEncryptionKey(hash)
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
    }
    commit('session/setUsername', username)
    return response.error
  },
  async releaseMailToken ({ state }, { code }) {
    return (
      await axios.post('/api/administration/release-mail-token', { code }, {
        headers: createSessionHeader(state.sessionKey)
      })
    ).data.error
  },
  async logIn ({ commit, dispatch }, { username, password }) {
    let { data: saltResponse } =
      await axios.get(`/api/authentication/get-salt/${username}`)
    if (saltResponse.error === 'NONE') {
      let { salt } = saltResponse
      if (salt.startsWith('$2a$')) {
        let hash = await bcrypt.hash(password, salt)
        let { data: authResponse } =
          await axios.post('/api/authentication/log-in', {
            username,
            digest: BcryptAesCryptography.getDigest(hash)
          })
        if (authResponse.error === 'NONE') {
          let { payload } = authResponse
          dispatch('importCredentials', {
            salt,
            sessionKey: payload.session_key,
            encryptionKey: BcryptAesCryptography.computeEcnryptionKey(password)
          })
          if (payload.requirements.length === 0) {
            dispatch('acceptUserKeys', {
              userKeys: payload.key_set.items
            })
          }
          commit('session/setUsername', username)
          dispatch('changeMasterKey', {
            current: password,
            renewal: password
          })
          return { success: true, requirements: payload.requirements }
        }
      } else {
        let {authDigest, encryptionKey} =
          await SodiumUtilities.extractAuthDigestAndEncryptionKey(
            await SodiumUtilities.computeArgon2Hash(salt, password))
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
            dispatch('acceptUserKeys', {
              userKeys: payload.key_set.items
            })
          }
          commit('session/setUsername', username)
          return { success: true, requirements: payload.requirements }
        }
      }
    }
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
        Object.assign({ identifier }, await (
          state.salt.startsWith('$2a$')
            ? Promise.resolve(BcryptAesCryptography.decryptPassword(
              state.encryptionKey, password))
            : SodiumUtilities.decryptPassword(state.encryptionKey, password)
        ))
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
    let curDigest
    if (state.salt.startsWith('$2a$')) {
      curDigest = BcryptAesCryptography.getDigest(
        await bcrypt.hash(current, state.salt))
    } else {
      curDigest = (await SodiumUtilities.extractAuthDigestAndEncryptionKey(
        await SodiumUtilities.computeArgon2Hash(state.salt, current)
      )).authDigest
    }
    let newSalt = await SodiumUtilities.generateArgon2Parametrization()
    let {authDigest, encryptionKey} =
      await SodiumUtilities.extractAuthDigestAndEncryptionKey(
        await SodiumUtilities.computeArgon2Hash(newSalt, renewal))
    let { data: response } =
      await axios.post('/api/administration/change-master-key', {
        current_digest: curDigest,
        renewal: {
          salt: newSalt,
          digest: authDigest,
          keys: await Promise.all(state.userKeys.map((key) => ({
            identifier: key.identifier,
            password: SodiumUtilities.encryptPassword(encryptionKey, {
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
        digest: (await SodiumUtilities.extractAuthDigestAndEncryptionKey(
          await SodiumUtilities.computeArgon2Hash(state.salt, password)
        )).authDigest,
        username
      }, {
        headers: createSessionHeader(state.sessionKey)
      })
    if (error === 'NONE') {
      if (state.preferences.username === state.session.username) {
        commit('preferences/setUsername', username)
      }
      commit('session/setUsername', username)
    }
    return error
  },
  async acquireMailToken ({ state }, { mail, password }) {
    return (
      await axios.post('/api/administration/acquire-mail-token', {
        digest: (await SodiumUtilities.extractAuthDigestAndEncryptionKey(
          await SodiumUtilities.computeArgon2Hash(state.salt, password)
        )).authDigest,
        mail
      }, {
        headers: createSessionHeader(state.sessionKey)
      })
    ).data.error
  },
  async deleteAccount ({ state }, { password }) {
    return (
      await axios.post('/api/administration/delete-account', {
        digest: (await SodiumUtilities.extractAuthDigestAndEncryptionKey(
          await SodiumUtilities.computeArgon2Hash(state.salt, password)
        )).authDigest
      }, {
        headers: createSessionHeader(state.sessionKey)
      })
    ).data.error
  }
}
