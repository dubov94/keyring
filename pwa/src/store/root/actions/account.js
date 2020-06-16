import axios from 'axios'
import SodiumClient from '@/sodium_client'
import { createSessionHeader } from './utilities'

export default {
  async changeMasterKey ({ commit, dispatch, state }, { current, renewal }) {
    const curDigest = (await SodiumClient.computeAuthDigestAndEncryptionKey(
      state.parametrization, current)).authDigest
    const newParametrization = await SodiumClient.generateArgon2Parametrization()
    const { authDigest, encryptionKey } =
      await SodiumClient.computeAuthDigestAndEncryptionKey(
        newParametrization, renewal)
    const { data: response } =
      await axios.post('/api/administration/change-master-key', {
        current_digest: curDigest,
        renewal: {
          salt: newParametrization,
          digest: authDigest,
          keys: await Promise.all(state.userKeys.map(async (key) => ({
            identifier: key.identifier,
            password: await SodiumClient.encryptPassword(encryptionKey, {
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
      commit('setEncryptionKey', encryptionKey)
      commit('setSessionKey', response.session_key)
      await dispatch('depot/maybeUpdateDepot', {
        password: renewal,
        userKeys: state.userKeys
      })
    }
    return response.error
  },
  async changeUsername ({ commit, getters, state }, { username, password }) {
    const { data: { error } } =
      await axios.put('/api/administration/change-username', {
        digest: (await SodiumClient.computeAuthDigestAndEncryptionKey(
          state.parametrization, password)).authDigest,
        username
      }, {
        headers: createSessionHeader(state.sessionKey)
      })
    if (error === 'NONE') {
      if (getters['depot/hasLocalData']) {
        commit('depot/setUsername', username)
      }
      commit('session/setUsername', username)
    }
    return error
  },
  async deleteAccount ({ state }, { password }) {
    return (
      await axios.post('/api/administration/delete-account', {
        digest: (await SodiumClient.computeAuthDigestAndEncryptionKey(
          state.parametrization, password)).authDigest
      }, {
        headers: createSessionHeader(state.sessionKey)
      })
    ).data.error
  },
  async fetchRecentSessions ({ commit, state }) {
    const { data: { sessions: list } } =
      await axios.get('/api/administration/get-recent-sessions', {
        headers: createSessionHeader(state.sessionKey)
      })
    commit('setRecentSessions', list.map(
      ({ creation_time_in_millis, ip_address, user_agent, geolocation }) => ({
        // `int64`.
        creationTimeInMillis: Number(creation_time_in_millis),
        ipAddress: ip_address,
        userAgent: user_agent,
        geolocation: geolocation || {}
      })
    ))
  },
  clearRecentSessions ({ commit }) {
    commit('setRecentSessions', [])
  }
}
