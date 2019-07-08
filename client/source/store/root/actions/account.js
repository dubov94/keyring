import axios from 'axios'
import SodiumWrapper from '../../../sodium.wrapper'
import {createSessionHeader} from './utilities'

export default {
  async changeMasterKey (
    { commit, dispatch, getters, state }, { current, renewal }) {
    let curDigest = (await SodiumWrapper.computeAuthDigestAndEncryptionKey(
      state.parametrization, current)).authDigest
    let newParametrization = await SodiumWrapper.generateArgon2Parametrization()
    let {authDigest, encryptionKey} =
      await SodiumWrapper.computeAuthDigestAndEncryptionKey(
        newParametrization, renewal)
    let { data: response } =
      await axios.post('/api/administration/change-master-key', {
        current_digest: curDigest,
        renewal: {
          salt: newParametrization,
          digest: authDigest,
          keys: await Promise.all(state.userKeys.map(async (key) => ({
            identifier: key.identifier,
            password: await SodiumWrapper.encryptPassword(encryptionKey, {
              value: key.value,
              tags: key.tags
            })
          })))
        }
      }, {
        headers: createSessionHeader(state.sessionKey)
      })
    if (response.error === 'NONE') {
      commit('setParametrization', newParametrization)
      commit('setSessionKey', response.session_key)
      commit('setRemoteEncryptionKey', encryptionKey)
      if (getters['depot/hasLocalData']) {
        await dispatch('depot/saveAuthDigest', renewal)
        commit('setDepotEncryptionKey', await dispatch(
          'depot/computeEncryptionKey', renewal))
        await dispatch('updateDepotKeys')
      }
    }
    return response.error
  },
  async changeUsername (
    { commit, dispatch, getters, state }, { username, password }) {
    let { data: { error } } =
      await axios.put('/api/administration/change-username', {
        digest: (await SodiumWrapper.computeAuthDigestAndEncryptionKey(
          state.parametrization, password)).authDigest,
        username
      }, {
        headers: createSessionHeader(state.sessionKey)
      })
    if (error === 'NONE') {
      if (getters['depot/hasLocalData']) {
        await dispatch('depot/saveUsername', username)
      }
      commit('session/setUsername', username)
    }
    return error
  },
  async deleteAccount ({ state }, { password }) {
    return (
      await axios.post('/api/administration/delete-account', {
        digest: (await SodiumWrapper.computeAuthDigestAndEncryptionKey(
          state.parametrization, password)).authDigest
      }, {
        headers: createSessionHeader(state.sessionKey)
      })
    ).data.error
  }
}
