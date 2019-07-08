import axios from 'axios'
import SodiumWrapper from '../../../sodium.wrapper'
import Status from '../status'
import {purgeSessionStorageAndLoadLogIn} from '../../../utilities'

export default {
  async register ({ commit }, { username, password, mail }) {
    let parametrization = await SodiumWrapper.generateArgon2Parametrization()
    let {authDigest, encryptionKey} =
      await SodiumWrapper.computeAuthDigestAndEncryptionKey(
        parametrization, password)
    let { data: response } =
      await axios.post('/api/authentication/register', {
        username,
        salt: parametrization,
        digest: authDigest,
        mail
      })
    if (response.error === 'NONE') {
      commit('setParametrization', parametrization)
      commit('setRemoteEncryptionKey', encryptionKey)
      commit('setSessionKey', response.session_key)
      commit('session/setUsername', username)
      commit('setStatus', Status.ONLINE)
      commit('setIsUserActive', true)
    }
    return response.error
  },
  async attemptOnlineAuthentication (
    { commit, dispatch }, { username, password, persist }) {
    try {
      commit('setStatus', Status.CONNECTING)
      let { data: saltResponse } =
        await axios.get(`/api/authentication/get-salt/${username}`)
      if (saltResponse.error === 'NONE') {
        let { salt: parametrization } = saltResponse
        let {authDigest, encryptionKey} =
          await SodiumWrapper.computeAuthDigestAndEncryptionKey(
            parametrization, password)
        let { data: authResponse } =
          await axios.post('/api/authentication/log-in', {
            username,
            digest: authDigest
          })
        if (authResponse.error === 'NONE') {
          let { payload } = authResponse
          commit('setParametrization', parametrization)
          commit('setRemoteEncryptionKey', encryptionKey)
          commit('setSessionKey', payload.session_key)
          // Ignore `persist` if there are any requirements.
          if (payload.requirements.length === 0) {
            if (persist) {
              await dispatch('depot/saveUsername', username)
              await dispatch('depot/saveAuthDigest', password)
              commit('setDepotEncryptionKey', await dispatch(
                'depot/computeEncryptionKey', password))
            }
            // Also triggers depot key synchronization.
            await dispatch('acceptUserKeys', {
              userKeys: payload.key_set.items
            })
          }
          commit('session/setUsername', username)
          commit('setStatus', Status.ONLINE)
          commit('setIsUserActive', true)
          return { success: true, requirements: payload.requirements }
        }
      }
      return { success: false }
    } catch (error) {
      commit('setStatus', Status.OFFLINE)
      throw error
    }
  },
  async logIn (
    { commit, dispatch, getters, state }, { username, password, persist }) {
    if (getters['depot/hasLocalData']) {
      if (state.depot.username === username) {
        if (await dispatch('depot/verifyPassword', password)) {
          commit('session/setUsername', username)
          commit('setDepotEncryptionKey', await dispatch(
            'depot/computeEncryptionKey', password))
          commit('setUserKeys', await dispatch('depot/getUserKeys', {
            encryptionKey: state.depotEncryptionKey
          }))
          commit('setStatus', Status.OFFLINE)
          commit('setIsUserActive', true)
          dispatch(
            'attemptOnlineAuthentication',
            { username, password, persist }
          ).then(async ({ success }) => {
            if (!success) {
              await dispatch('depot/purgeDepot')
              purgeSessionStorageAndLoadLogIn()
            }
          })
          return { success: true, requirements: [] }
        } else {
          return { success: false }
        }
      } else {
        await dispatch('depot/purgeDepot')
      }
    }
    return await dispatch(
      'attemptOnlineAuthentication', { username, password, persist })
  }
}
