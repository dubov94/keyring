import aes from 'crypto-js/aes'
import axios from 'axios'
import encUtf8 from 'crypto-js/enc-utf8'
import {shuffle} from '../utilities'

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
    async readKeys ({ commit, rootGetters }) {
      let { data: response } =
        await axios.get('/api/administration/read-keys', {
          headers: rootGetters.sessionHeader
        })
      commit('setKeys', response.keys.map(({ identifier, password }) =>
        Object.assign({ identifier },
          decryptPassword(rootGetters.encryptionKey, password))))
    },
    async createKey ({ commit, rootGetters }, { value, tags }) {
      let { data: response } =
        await axios.post('/api/administration/create-key', {
          password: encryptPassword(rootGetters.encryptionKey, { value, tags })
        }, { headers: rootGetters.sessionHeader })
      commit('unshiftKey', { identifier: response.identifier, value, tags })
    },
    async updateKey ({ commit, rootGetters }, { identifier, value, tags }) {
      await axios.put('/api/administration/update-key', {
        key: {
          identifier,
          password: encryptPassword(rootGetters.encryptionKey, { value, tags })
        }
      }, { headers: rootGetters.sessionHeader })
      commit('modifyKey', { identifier, value, tags })
    },
    async removeKey ({ commit, rootGetters }, { identifier }) {
      await axios.post('/api/administration/delete-key', { identifier }, {
        headers: rootGetters.sessionHeader
      })
      commit('deleteKey', identifier)
    }
  }
}
