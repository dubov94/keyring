import {cutHashToPrefix, cutHashToSuffix, getSuffixesByPrefix} from '../../haveibeenpwned'
import {sha1} from '../../utilities'

const wasPasswordExposed = async (key) => {
  let hash = await sha1(key)
  return (await getSuffixesByPrefix(cutHashToPrefix(hash))).includes(
    cutHashToSuffix(hash))
}

export default {
  namespaced: true,
  state: {
    isAnalysisEnabled: false,
    duplicateGroups: [],
    exposedUserKeyIds: []
  },
  mutations: {
    setAnalysisEnabled (state, value) {
      state.isAnalysisEnabled = value
    },
    setDuplicateGroups (state, value) {
      state.duplicateGroups = value
    },
    setExposedUserKeyIds (state, value) {
      state.vulnerableUserKeyIds = value
    }
  },
  actions: {
    async enableAnalysis ({ commit, dispatch, rootState }) {
      commit('setAnalysisEnabled', true)
      await dispatch('maybeAssessUserKeys', rootState.userKeys)
    },
    async maybeAssessUserKeys ({ commit, state }, userKeys) {
      if (state.isAnalysisEnabled) {
        let passwordToIds = new Map()
        userKeys.forEach(({ identifier, value }) => {
          if (!passwordToIds.has(value)) {
            passwordToIds.set(value, [])
          }
          passwordToIds.get(value).push(identifier)
        })
        let duplicateGroups = []
        for (let group of passwordToIds.values()) {
          if (group.length > 1) {
            duplicateGroups.push(group)
          }
        }
        commit('setDuplicateGroups', duplicateGroups)
        let vulnerableUserKeyIds = (await Promise.all(
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
        commit('setExposedUserKeyIds', vulnerableUserKeyIds)
      }
    }
  }
}
