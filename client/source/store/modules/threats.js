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
    isEnabled: false,
    duplicateGroups: [],
    exposedUserKeyIds: []
  },
  mutations: {
    enable (state) {
      state.isEnabled = true
    },
    disable (state) {
      state.isEnabled = false
    },
    setDuplicateGroups (state, value) {
      state.duplicateGroups = value
    },
    setExposedUserKeyIds (state, value) {
      state.vulnerableUserKeyIds = value
    }
  },
  actions: {
    async maybeAssessUserKeys ({ commit, state }, userKeys) {
      if (state.isEnabled) {
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
