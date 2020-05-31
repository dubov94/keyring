import { cutHashToPrefix, cutHashToSuffix, getSuffixesByPrefix } from '../../haveibeenpwned'
import { sha1 } from '../../utilities'

const wasPasswordExposed = async (key) => {
  const hash = await sha1(key)
  return (await getSuffixesByPrefix(cutHashToPrefix(hash))).includes(
    cutHashToSuffix(hash))
}

export default {
  namespaced: true,
  state: {
    isAnalysisEnabled: false,
    gettingDuplicateGroups: false,
    duplicateGroups: [],
    gettingExposedUserKeys: false,
    exposedUserKeyIds: []
  },
  mutations: {
    setAnalysisEnabled (state, value) {
      state.isAnalysisEnabled = value
    },
    setGettingDuplicateGroups (state, value) {
      state.gettingDuplicateGroups = value
    },
    setDuplicateGroups (state, value) {
      state.duplicateGroups = value
    },
    setGettingExposedUserKeys (state, value) {
      state.gettingExposedUserKeys = value
    },
    setExposedUserKeyIds (state, value) {
      state.exposedUserKeyIds = value
    }
  },
  actions: {
    async enableAnalysis ({ commit, dispatch, rootState }) {
      commit('setAnalysisEnabled', true)
      await dispatch('maybeAssessUserKeys', rootState.userKeys)
    },
    async detectDuplicateGroups ({ commit }, userKeys) {
      commit('setGettingDuplicateGroups', true)
      const passwordToIds = new Map()
      userKeys.forEach(({ identifier, value }) => {
        if (!passwordToIds.has(value)) {
          passwordToIds.set(value, [])
        }
        passwordToIds.get(value).push(identifier)
      })
      const duplicateGroups = []
      for (const group of passwordToIds.values()) {
        if (group.length > 1) {
          duplicateGroups.push(group)
        }
      }
      commit('setDuplicateGroups', duplicateGroups)
      commit('setGettingDuplicateGroups', false)
    },
    async detectExposedUserKeys ({ commit }, userKeys) {
      commit('setGettingExposedUserKeys', true)
      const exposedUserKeyIds = (await Promise.all(
        userKeys.map(async ({ identifier, value }) => ({
          identifier,
          wasExposed: await wasPasswordExposed(value)
        })))).filter(
        ({
          wasExposed
        }) => wasExposed).map(
        ({
          identifier
        }) => identifier)
      commit('setExposedUserKeyIds', exposedUserKeyIds)
      commit('setGettingExposedUserKeys', false)
    },
    async maybeAssessUserKeys ({ state, dispatch }, userKeys) {
      if (state.isAnalysisEnabled) {
        return Promise.all([
          dispatch('detectDuplicateGroups', userKeys),
          dispatch('detectExposedUserKeys', userKeys)
        ])
      }
    }
  }
}
