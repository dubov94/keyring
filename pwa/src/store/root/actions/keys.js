import axios from 'axios'
import { container } from 'tsyringe'
import { SodiumClient } from '@/sodium_client'
import { createSessionHeader } from './utilities'

export default {
  async acceptUserKeys ({ commit, dispatch, state }, { userKeys, updateDepot }) {
    commit('setUserKeys', await Promise.all(
      userKeys.map(async ({ identifier, password }) =>
        Object.assign({ identifier }, await container.resolve(SodiumClient).decryptPassword(
          state.encryptionKey, password))
      )
    ))
    if (updateDepot) {
      await dispatch('depot/maybeUpdateDepot', { userKeys: state.userKeys })
    }
    await dispatch('threats/maybeAssessUserKeys', state.userKeys)
  },
  async createUserKey ({ commit, dispatch, state }, { value, tags }) {
    const { data: response } =
      await axios.post('/api/administration/create-key', {
        password: await container.resolve(SodiumClient).encryptPassword(
          state.encryptionKey, { value, tags })
      }, { headers: createSessionHeader(state.sessionKey) })
    commit('unshiftUserKey', { identifier: response.identifier, value, tags })
    await dispatch('depot/maybeUpdateDepot', { userKeys: state.userKeys })
    await dispatch('threats/maybeAssessUserKeys', state.userKeys)
  },
  async updateUserKey (
    { commit, dispatch, state }, { identifier, value, tags }) {
    await axios.put('/api/administration/update-key', {
      key: {
        identifier,
        password: await container.resolve(SodiumClient).encryptPassword(
          state.encryptionKey, { value, tags })
      }
    }, { headers: createSessionHeader(state.sessionKey) })
    commit('modifyUserKey', { identifier, value, tags })
    await dispatch('depot/maybeUpdateDepot', { userKeys: state.userKeys })
    await dispatch('threats/maybeAssessUserKeys', state.userKeys)
  },
  async removeUserKey ({ commit, dispatch, state }, { identifier }) {
    await axios.post('/api/administration/delete-key', { identifier }, {
      headers: createSessionHeader(state.sessionKey)
    })
    commit('deleteUserKey', identifier)
    await dispatch('depot/maybeUpdateDepot', { userKeys: state.userKeys })
    await dispatch('threats/maybeAssessUserKeys', state.userKeys)
  }
}
