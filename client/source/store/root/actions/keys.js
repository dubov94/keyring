import axios from 'axios'
import SodiumWrapper from '../../../sodium.wrapper'
import {createSessionHeader} from './utilities'

export default {
  async acceptUserKeys ({ commit, state }, { userKeys }) {
    commit('setUserKeys', await Promise.all(
      userKeys.map(async ({ identifier, password }) =>
        Object.assign({ identifier }, await SodiumWrapper.decryptPassword(
          state.remoteEncryptionKey, password))
      )
    ))
  },
  async createUserKey ({ commit, state }, { value, tags }) {
    let { data: response } =
      await axios.post('/api/administration/create-key', {
        password: await SodiumWrapper.encryptPassword(
          state.remoteEncryptionKey, { value, tags })
      }, { headers: createSessionHeader(state.sessionKey) })
    commit('unshiftUserKey', { identifier: response.identifier, value, tags })
  },
  async updateUserKey ({ commit, state }, { identifier, value, tags }) {
    await axios.put('/api/administration/update-key', {
      key: {
        identifier,
        password: await SodiumWrapper.encryptPassword(
          state.remoteEncryptionKey, { value, tags })
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
  async updateDepotKeys ({ dispatch, state }) {
    await dispatch('depot/saveUserKeys', {
      encryptionKey: state.depotEncryptionKey,
      userKeys: state.userKeys
    })
  }
}
