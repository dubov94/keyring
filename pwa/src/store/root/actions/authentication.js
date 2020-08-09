import axios from 'axios'
import { container } from 'tsyringe'
import { SodiumClient } from '@/sodium_client'
import { Status } from '../status'
import { purgeSessionStorageAndRedirect } from '../../../utilities'

export default {
  async register ({ commit }, { username, password, mail }) {
    const parametrization = await container.resolve(SodiumClient).generateArgon2Parametrization()
    const { authDigest, encryptionKey } =
      await container.resolve(SodiumClient).computeAuthDigestAndEncryptionKey(
        parametrization, password)
    const { data: response } =
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
      commit('setRequiresMailVerification', true)
      commit('session/setUsername', username)
      commit('setStatus', Status.ONLINE)
      commit('setIsUserActive', true)
    }
    return response.error
  },
  async attemptOnlineAuthentication (
    { commit, dispatch, state }, { username, password, persist }) {
    commit('setStatus', Status.CONNECTING)
    const { data: saltResponse } =
      await axios.get(`/api/authentication/get-salt/${username}`)
    if (saltResponse.error === 'NONE') {
      const { salt: parametrization } = saltResponse
      const { authDigest, encryptionKey } =
        await container.resolve(SodiumClient).computeAuthDigestAndEncryptionKey(
          parametrization, password)
      const { data: authResponse } =
        await axios.post('/api/authentication/log-in', {
          username,
          digest: authDigest
        })
      if (authResponse.error === 'NONE') {
        const {
          requires_mail_verification,
          key_set,
          session_key
        } = authResponse.payload
        commit('setParametrization', parametrization)
        commit('setEncryptionKey', encryptionKey)
        await dispatch('acceptUserKeys', {
          userKeys: key_set.items,
          updateDepot: false
        })
        commit('setSessionKey', session_key)
        if (persist) {
          // Ensures there will be no offline authentication until
          // the account is all set.
          if (!requires_mail_verification) {
            commit('depot/setUsername', username)
            await dispatch('depot/maybeUpdateDepot', {
              password,
              userKeys: state.userKeys
            })
          }
        }
        commit('session/setUsername', username)
        commit('setRequiresMailVerification', requires_mail_verification)
        commit('setStatus', Status.ONLINE)
        commit('setIsUserActive', true)
        return {
          success: true,
          local: false,
          requiresMailVerification: requires_mail_verification
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
          ).then(async ({ success, requiresMailVerification }) => {
            if (!success || requiresMailVerification) {
              await dispatch('depot/purgeDepot')
              purgeSessionStorageAndRedirect()
            }
          })
          return { success: true, local: true, requiresMailVerification: false }
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
