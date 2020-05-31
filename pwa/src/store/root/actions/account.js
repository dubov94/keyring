import axios from 'axios'
import SodiumWrapper from '../../../sodium.wrapper'
import {createSessionHeader} from './utilities'

export default {
  async changeMasterKey ({ commit, dispatch, state }, { current, renewal }) {
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
        commit('depot/setUsername', username)
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
  },
  async fetchRecentSessions ({ commit, state }) {
    let { data: { sessions: list } } =
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
