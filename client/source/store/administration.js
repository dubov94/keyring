import aes from 'crypto-js/aes'
import axios from 'axios'
import encUtf8 from 'crypto-js/enc-utf8'
import {shuffle} from '../utilities'

const createSessionHeader = (rootState) => ({
  session: rootState.authentication.sessionKey
})

const getEncryptionKey = (rootState) =>
  rootState.authentication.encryptionKey

const encryptPassword = (rootState, { value, tags }) => {
  let key = getEncryptionKey(rootState)
  return {
    value: aes.encrypt(value, key).toString(),
    tags: tags.map(tag => aes.encrypt(tag, key).toString())
  }
}

const decryptPassword = (rootState, { value, tags }) => {
  let key = getEncryptionKey(rootState)
  return {
    value: aes.decrypt(value, key).toString(encUtf8),
    tags: tags.map(tag => aes.decrypt(tag, key).toString(encUtf8))
  }
}

export default {
  namespaced: true,
  state: {
    keys: []
  },
  mutations: {
    setKeys (state, keys) {
      state.keys.length = 0
      for (let item of keys) {
        state.keys.push(item)
      }
      shuffle(state.keys)
    },
    unshiftKey (state, key) {
      state.keys.unshift(key)
    },
    modifyKey (state, key) {
      let index = state.keys.findIndex(
        (item) => item.identifier === key.identifier)
      state.keys.splice(index, 1, key)
    },
    deleteKey (state, identifier) {
      let index = state.keys.findIndex(
        (item) => item.identifier === identifier)
      state.keys.splice(index, 1)
    }
  },
  actions: {
    async readKeys ({ commit, rootState }) {
      let { data: response } =
        await axios.get('/api/administration/read-keys', {
          headers: createSessionHeader(rootState)
        })
      commit('setKeys', response.keys.map(({ identifier, password }) =>
        Object.assign({ identifier }, decryptPassword(rootState, password))))
    },
    async createKey ({ commit, rootState }, { value, tags }) {
      let { data: response } =
        await axios.post('/api/administration/create-key', {
          password: encryptPassword(rootState, { value, tags })
        }, { headers: createSessionHeader(rootState) })
      commit('unshiftKey', { identifier: response.identifier, value, tags })
    },
    async updateKey ({ commit, rootState }, { identifier, value, tags }) {
      await axios.put('/api/administration/update-key', {
        key: {
          identifier,
          password: encryptPassword(rootState, { value, tags })
        }
      }, { headers: createSessionHeader(rootState) })
      commit('modifyKey', { identifier, value, tags })
    },
    async removeKey ({ commit, rootState }, { identifier }) {
      await axios.post('/api/administration/delete-key', { identifier }, {
        headers: createSessionHeader(rootState)
      })
      commit('deleteKey', identifier)
    }
  }
}
