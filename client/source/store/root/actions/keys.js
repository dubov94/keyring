import axios from 'axios'
import SodiumWrapper from '../../../sodium.wrapper'
import {createSessionHeader} from './utilities'

export default {
  async acceptUserKeys ({ commit, dispatch, state }, { userKeys }) {
    commit('setUserKeys', await Promise.all(
      userKeys.map(async ({ identifier, password }) =>
        Object.assign({ identifier }, await SodiumWrapper.decryptPassword(
          state.encryptionKey, password))
      )
    ))
    // Depot synchronization happens during authentication.
    await dispatch('vulnerabilities/assessUserKeys', state.userKeys)
  },
  async createUserKey ({ commit, dispatch, state }, { value, tags }) {
    let { data: response } =
      await axios.post('/api/administration/create-key', {
        password: await SodiumWrapper.encryptPassword(
          state.encryptionKey, { value, tags })
      }, { headers: createSessionHeader(state.sessionKey) })
    commit('unshiftUserKey', { identifier: response.identifier, value, tags })
    await dispatch('depot/maybeUpdateDepot', { userKeys: state.userKeys })
    await dispatch('vulnerabilities/assessUserKeys', state.userKeys)
  },
  async updateUserKey (
    { commit, dispatch, state }, { identifier, value, tags }) {
    await axios.put('/api/administration/update-key', {
      key: {
        identifier,
        password: await SodiumWrapper.encryptPassword(
          state.encryptionKey, { value, tags })
      }
    }, { headers: createSessionHeader(state.sessionKey) })
    commit('modifyUserKey', { identifier, value, tags })
    await dispatch('depot/maybeUpdateDepot', { userKeys: state.userKeys })
    await dispatch('vulnerabilities/assessUserKeys', state.userKeys)
  },
  async removeUserKey ({ commit, dispatch, state }, { identifier }) {
    await axios.post('/api/administration/delete-key', { identifier }, {
      headers: createSessionHeader(state.sessionKey)
    })
    commit('deleteUserKey', identifier)
    await dispatch('depot/maybeUpdateDepot', { userKeys: state.userKeys })
    await dispatch('vulnerabilities/assessUserKeys', state.userKeys)
  }
}
