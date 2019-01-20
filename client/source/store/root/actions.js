import axios from 'axios'
import bcrypt from 'bcryptjs'
import aes from 'crypto-js/aes'
import base64 from 'crypto-js/enc-base64'
import encUtf8 from 'crypto-js/enc-utf8'
import sha256 from 'crypto-js/sha256'

const BCRYPT_ROUNDS_LOGARITHM = 12

const getDigest = (hash) => hash.slice(-31)

const createSessionHeader = (sessionKey) => ({
  'X-Session-Token': sessionKey
})

const encryptPassword = (encryptionKey, { value, tags }) => {
  return {
    value: aes.encrypt(value, encryptionKey).toString(),
    tags: tags.map(tag => aes.encrypt(tag, encryptionKey).toString())
  }
}

const decryptPassword = (encryptionKey, { value, tags }) => {
  return {
    value: aes.decrypt(value, encryptionKey).toString(encUtf8),
    tags: tags.map(tag => aes.decrypt(tag, encryptionKey).toString(encUtf8))
  }
}

export default {
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
      dispatch('importCredentials', {
        salt,
        sessionKey: response.session_key,
        masterKey: password
      })
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
  async logIn ({ dispatch }, { username, password }) {
    let { data: saltResponse } =
      await axios.get(`/api/authentication/get-salt/${username}`)
    if (saltResponse.error === 'NONE') {
      let { salt } = saltResponse
      let hash = await bcrypt.hash(password, salt)
      let { data: authResponse } =
        await axios.post('/api/authentication/log-in', {
          username,
          digest: getDigest(hash)
        })
      if (authResponse.error === 'NONE') {
        let { payload } = authResponse
        dispatch('importCredentials', {
          salt,
          sessionKey: payload.session_key,
          masterKey: password
        })
        if (payload.requirements.length === 0) {
          dispatch('acceptUserKeys', {
            userKeys: payload.key_set.items
          })
        }
        return { success: true, requirements: payload.requirements }
      }
    }
    return { success: false }
  },
  importCredentials ({ commit }, { salt, sessionKey, masterKey }) {
    commit('setSalt', salt)
    commit('setSessionKey', sessionKey)
    commit('setEncryptionKey', base64.stringify(sha256(masterKey)))
  },
  async acceptUserKeys ({ commit, state }, { userKeys }) {
    commit('setUserKeys', userKeys.map(({ identifier, password }) =>
      Object.assign({ identifier },
        decryptPassword(state.encryptionKey, password))))
  },
  async createUserKey ({ commit, state }, { value, tags }) {
    let { data: response } =
      await axios.post('/api/administration/create-key', {
        password: encryptPassword(state.encryptionKey, { value, tags })
      }, { headers: createSessionHeader(state.sessionKey) })
    commit('unshiftUserKey', { identifier: response.identifier, value, tags })
  },
  async updateUserKey ({ commit, state }, { identifier, value, tags }) {
    await axios.put('/api/administration/update-key', {
      key: {
        identifier,
        password: encryptPassword(state.encryptionKey, { value, tags })
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
  async changeMasterKey ({ commit, state }, { current, renewal }) {
    let newSalt = await bcrypt.genSalt(BCRYPT_ROUNDS_LOGARITHM)
    let curDigest = getDigest(await bcrypt.hash(current, state.salt))
    let newDigest = getDigest(await bcrypt.hash(renewal, newSalt))
    let newEncryptionKey = base64.stringify(sha256(renewal))
    let { data: { error } } =
      await axios.put('/api/administration/change-master-key', {
        current_digest: curDigest,
        renewal: {
          salt: newSalt,
          digest: newDigest,
          keys: state.userKeys.map((key) => ({
            identifier: key.identifier,
            password: encryptPassword(newEncryptionKey, {
              value: key.value,
              tags: key.tags
            })
          }))
        }
      }, {
        headers: createSessionHeader(state.sessionKey)
      })
    if (error === 'NONE') {
      commit('setSalt', newSalt)
      commit('setEncryptionKey', newEncryptionKey)
    }
    return error
  },
  async changeUsername ({ state }, { username, password }) {
    return (
      await axios.put('/api/administration/change-username', {
        digest: getDigest(await bcrypt.hash(password, state.salt)), username
      }, {
        headers: createSessionHeader(state.sessionKey)
      })
    ).data.error
  },
  async acquireMailToken ({ state }, { mail, password }) {
    return (
      await axios.post('/api/administration/acquire-mail-token', {
        digest: getDigest(await bcrypt.hash(password, state.salt)), mail
      }, {
        headers: createSessionHeader(state.sessionKey)
      })
    ).data.error
  },
  async deleteAccount ({ state }, { password }) {
    return (
      await axios.post('/api/administration/delete-account', {
        digest: getDigest(await bcrypt.hash(password, state.salt))
      }, {
        headers: createSessionHeader(state.sessionKey)
      })
    ).data.error
  }
}
