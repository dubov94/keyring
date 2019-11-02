import {cutHashToPrefix, cutHashToSuffix, getSuffixesByPrefix} from '../../haveibeenpwned'
import {sha1} from '../../utilities'

const isPasswordVulnerable = async (key) => {
  let hash = await sha1(key)
  return (await getSuffixesByPrefix(cutHashToPrefix(hash))).includes(
    cutHashToSuffix(hash))
}

export default {
  namespaced: true,
  state: {
    duplicateGroups: [],
    vulnerableUserKeyIds: []
  },
  mutations: {
    setDuplicateGroups (state, value) {
      state.duplicateGroups = value
    },
    setVulnerableUserKeyIds (state, value) {
      state.vulnerableUserKeyIds = value
    }
  },
  actions: {
    async assessUserKeys ({ commit }, userKeys) {
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
        userKeys.map(async ({
          identifier,
          value
        }) => ({
          identifier,
          isVulnerable: await isPasswordVulnerable(value)
        })))).filter(
        ({
          isVulnerable
        }) => isVulnerable).map(
        ({
          identifier
        }) => identifier)
      commit('setVulnerableUserKeyIds', vulnerableUserKeyIds)
    }
  }
}
