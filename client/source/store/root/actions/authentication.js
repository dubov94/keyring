import axios from 'axios'
import SodiumWrapper from '../../../sodium.wrapper'
import Status from '../status'
import {purgeSessionStorageAndLoadLogIn} from '../../../utilities'

export default {
  async register ({ commit, dispatch }, { username, password, mail }) {
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
      dispatch('importCredentials', {
        salt: parametrization,
        sessionKey: response.session_key,
        encryptionKey: encryptionKey
      })
      commit('session/setUsername', username)
      commit('setStatus', Status.ONLINE)
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
        let { salt } = saltResponse
        let {authDigest, encryptionKey} =
          await SodiumWrapper.computeAuthDigestAndEncryptionKey(
            salt, password)
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
            // Ignore if there are any requirements.
            if (persist) {
              dispatch('depot/saveUsername', username)
              await dispatch('depot/savePassword', password)
            }
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
    } catch (error) {
      commit('setStatus', Status.OFFLINE)
      throw error
    }
    return { success: false }
  },
  async logIn ({ commit, dispatch, getters }, { username, password, persist }) {
    if (getters['depot/hasLocalData']) {
      if (await dispatch('depot/verifyPassword', password)) {
        commit('session/setUsername', username)
        commit('setUserKeys', await dispatch('depot/getUserKeys'))
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
      return await dispatch(
        'attemptOnlineAuthentication',
        { username, password, persist }
      )
    }
  },
  importCredentials ({ commit }, { salt, sessionKey, encryptionKey }) {
    commit('setSalt', salt)
    commit('setSessionKey', sessionKey)
    commit('setEncryptionKey', encryptionKey)
  }
}
