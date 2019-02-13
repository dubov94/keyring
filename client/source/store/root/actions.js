import aes from 'crypto-js/aes'
import axios from 'axios'
import base64 from 'crypto-js/enc-base64'
import bcrypt from 'bcryptjs'
import encUtf8 from 'crypto-js/enc-utf8'
import sha256 from 'crypto-js/sha256'
import sodium from 'libsodium-wrappers'
import {SESSION_TOKEN_HEADER_NAME} from '../../constants'

const bcryptAesCryptography = {
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

const sodiumCryptography = {
  ARGON2_MEMORY_COST: 128 * 1024 * 1024,
  ARGON2_TIME_COST: 3,
  AUTH_DIGEST_SIZE_IN_BYTES: 32,
  ENCRYPTION_KEY_SIZE_IN_BYTES: 32,
  PARAMETRIZATION_REGULAR_EXPRESSION: new RegExp(
    '^\\$(argon2(?:i|d|id))' +
    '\\$m=([1-9][0-9]*),t=([1-9][0-9]*),p=([1-9][0-9]*)' +
    '\\$([A-Za-z0-9-_]{22})$'
  ),
  generateArgon2Parametrization () {
    return '$argon2id' +
      `$m=${this.ARGON2_MEMORY_COST},t=${this.ARGON2_TIME_COST},p=1` +
      `$${sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES, 'base64')}`
  },
  computeArgon2Hash (parametrization, password) {
    let [, algorithm, m, t, p, salt] =
      this.PARAMETRIZATION_REGULAR_EXPRESSION.exec(parametrization)
    ;[m, t, p] = [m, t, p].map(Number)
    if (algorithm === 'argon2id' && p === 1) {
      return sodium.crypto_pwhash(
        this.AUTH_DIGEST_SIZE_IN_BYTES + this.ENCRYPTION_KEY_SIZE_IN_BYTES,
        password,
        sodium.from_base64(salt),
        t, m, sodium.crypto_pwhash_ALG_ARGON2ID13)
    } else {
      throw new Error('Unsupported hashing parameters: ' +
        `algorithm = '${algorithm}', lanes = '${p}'.`)
    }
  },
  extractAuthDigestAndEncryptionKey (hash) {
    return {
      authDigest: sodium.to_base64(
        hash.slice(0, this.AUTH_DIGEST_SIZE_IN_BYTES)),
      encryptionKey: sodium.to_base64(
        hash.slice(-this.ENCRYPTION_KEY_SIZE_IN_BYTES))
    }
  },
  encryptString (encryptionKey, message) {
    let nonce = sodium.randombytes_buf(
      sodium.crypto_secretbox_NONCEBYTES, 'base64')
    let code = sodium.crypto_secretbox_easy(
      message,
      sodium.from_base64(nonce),
      sodium.from_base64(encryptionKey),
      'base64'
    )
    return `${nonce}${code}`
  },
  decryptString (encryptionKey, cipher) {
    let nonceBase64Length = sodium.crypto_secretbox_NONCEBYTES * 8 / 6
    let nonce = cipher.slice(0, nonceBase64Length)
    let code = cipher.slice(nonceBase64Length)
    return sodium.crypto_secretbox_open_easy(
      sodium.from_base64(code),
      sodium.from_base64(nonce),
      sodium.from_base64(encryptionKey),
      'text'
    )
  },
  encryptPassword (encryptionKey, { value, tags }) {
    return {
      value: this.encryptString(encryptionKey, value),
      tags: tags.map(tag => this.encryptString(encryptionKey, tag))
    }
  },
  decryptPassword (encryptionKey, { value, tags }) {
    return {
      value: this.decryptString(encryptionKey, value),
      tags: tags.map(tag => this.decryptString(encryptionKey, tag))
    }
  }
}

const createSessionHeader = (sessionKey) => ({
  [SESSION_TOKEN_HEADER_NAME]: sessionKey
})

export default {
  async register ({ commit, dispatch }, { username, password, mail }) {
    let parametrization = sodiumCryptography.generateArgon2Parametrization()
    let hash = sodiumCryptography.computeArgon2Hash(parametrization, password)
    let {authDigest, encryptionKey} =
      sodiumCryptography.extractAuthDigestAndEncryptionKey(hash)
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
            digest: bcryptAesCryptography.getDigest(hash)
          })
        if (authResponse.error === 'NONE') {
          let { payload } = authResponse
          dispatch('importCredentials', {
            salt,
            sessionKey: payload.session_key,
            encryptionKey: bcryptAesCryptography.computeEcnryptionKey(password)
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
          sodiumCryptography.extractAuthDigestAndEncryptionKey(
            sodiumCryptography.computeArgon2Hash(salt, password))
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
    commit('setUserKeys', userKeys.map(({ identifier, password }) =>
      Object.assign({ identifier }, state.salt.startsWith('$2a$')
        ? bcryptAesCryptography.decryptPassword(state.encryptionKey, password)
        : sodiumCryptography.decryptPassword(state.encryptionKey, password))))
  },
  async createUserKey ({ commit, state }, { value, tags }) {
    let { data: response } =
      await axios.post('/api/administration/create-key', {
        password: sodiumCryptography.encryptPassword(
          state.encryptionKey, { value, tags })
      }, { headers: createSessionHeader(state.sessionKey) })
    commit('unshiftUserKey', { identifier: response.identifier, value, tags })
  },
  async updateUserKey ({ commit, state }, { identifier, value, tags }) {
    await axios.put('/api/administration/update-key', {
      key: {
        identifier,
        password: sodiumCryptography.encryptPassword(
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
      curDigest = bcryptAesCryptography.getDigest(
        await bcrypt.hash(current, state.salt))
    } else {
      curDigest = sodiumCryptography.extractAuthDigestAndEncryptionKey(
        sodiumCryptography.computeArgon2Hash(state.salt, current)).authDigest
    }
    let newSalt = sodiumCryptography.generateArgon2Parametrization()
    let {authDigest, encryptionKey} =
      sodiumCryptography.extractAuthDigestAndEncryptionKey(
        sodiumCryptography.computeArgon2Hash(newSalt, renewal))
    let { data: response } =
      await axios.post('/api/administration/change-master-key', {
        current_digest: curDigest,
        renewal: {
          salt: newSalt,
          digest: authDigest,
          keys: state.userKeys.map((key) => ({
            identifier: key.identifier,
            password: sodiumCryptography.encryptPassword(encryptionKey, {
              value: key.value,
              tags: key.tags
            })
          }))
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
        digest: sodiumCryptography.extractAuthDigestAndEncryptionKey(
          sodiumCryptography.computeArgon2Hash(state.salt, password)
        ).authDigest,
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
        digest: sodiumCryptography.extractAuthDigestAndEncryptionKey(
          sodiumCryptography.computeArgon2Hash(state.salt, password)
        ).authDigest,
        mail
      }, {
        headers: createSessionHeader(state.sessionKey)
      })
    ).data.error
  },
  async deleteAccount ({ state }, { password }) {
    return (
      await axios.post('/api/administration/delete-account', {
        digest: sodiumCryptography.extractAuthDigestAndEncryptionKey(
          sodiumCryptography.computeArgon2Hash(state.salt, password)
        ).authDigest
      }, {
        headers: createSessionHeader(state.sessionKey)
      })
    ).data.error
  }
}
