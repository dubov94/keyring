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
      commit('setEncryptionKey', encryptionKey)
      commit('setSessionKey', response.session_key)
      commit('session/setUsername', username)
      commit('setStatus', Status.ONLINE)
      commit('setIsUserActive', true)
    }
    return response.error
  },
  async attemptOnlineAuthentication (
    { commit, dispatch, state }, { username, password, persist }) {
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
        commit('setEncryptionKey', encryptionKey)
        await dispatch('acceptUserKeys', { userKeys: payload.key_set.items })
        commit('setSessionKey', payload.session_key)
        if (persist) {
          commit('depot/setUsername', username)
          await dispatch('depot/maybeUpdateDepot', {
            password,
            userKeys: state.userKeys
          })
        }
        commit('session/setUsername', username)
        commit('setStatus', Status.ONLINE)
        commit('setIsUserActive', true)
        return {
          success: true,
          local: false,
          requirements: payload.requirements
        }
      }
    }
    commit('setStatus', Status.OFFLINE)
    return { success: false, local: false }
  },
  async logIn (
    { commit, dispatch, getters, state }, { username, password, persist }) {
    if (getters['depot/hasLocalData']) {
      if (state.depot.username === username) {
        if (await dispatch('depot/verifyPassword', password)) {
          commit('session/setUsername', username)
          await dispatch('depot/computeEncryptionKey', password)
          commit('setUserKeys', await dispatch('depot/getUserKeys'))
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
          return { success: true, local: true, requirements: [] }
        } else {
          return { success: false, local: true }
        }
      } else {
        await dispatch('depot/purgeDepot')
      }
    }
    return await dispatch(
      'attemptOnlineAuthentication', { username, password, persist })
  }
}
