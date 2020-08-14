import { Module } from 'vuex'
import { ThreatsState, RootState, Key } from '@/store/root/state'
import { cutHashToPrefix, cutHashToSuffix, getSuffixesByPrefix } from '@/haveibeenpwned'
import { sha1 } from '@/utilities'

const wasPasswordExposed = async (key: string): Promise<boolean> => {
  const hash = await sha1(key)
  return (await getSuffixesByPrefix(cutHashToPrefix(hash))).includes(
    cutHashToSuffix(hash))
}

export enum MutationType {
  SET_ANALYSIS_ENABLED = 'setAnalysisEnabled',
  SET_GETTING_DUPLICATE_GROUPS = 'setGettingDuplicateGroups',
  SET_DUPLICATE_GROUPS = 'setDuplicateGroups',
  SET_GETTING_EXPOSED_USER_KEYS = 'setGettingExposedUserKeys',
  SET_EXPOSED_USER_KEY_IDS = 'setExposedUserKeyIds',
}

export enum ActionType {
  ENABLE_ANALYSIS = 'enableAnalysis',
  DETECT_DUPLICATE_GROUPS = 'detectDuplicateGroups',
  DETECT_EXPOSED_USER_KEYS = 'detectExposedUserKeys',
  MAYBE_ASSESS_USER_KEYS = 'maybeAssessUserKeys',
}

export const Threats: Module<ThreatsState, RootState> = {
  namespaced: true,
  state: {
    isAnalysisEnabled: false,
    gettingDuplicateGroups: false,
    duplicateGroups: [],
    gettingExposedUserKeys: false,
    exposedUserKeyIds: []
  },
  mutations: {
    [MutationType.SET_ANALYSIS_ENABLED] (state, value) {
      state.isAnalysisEnabled = value
    },
    [MutationType.SET_GETTING_DUPLICATE_GROUPS] (state, value) {
      state.gettingDuplicateGroups = value
    },
    [MutationType.SET_DUPLICATE_GROUPS] (state, value) {
      state.duplicateGroups = value
    },
    [MutationType.SET_GETTING_EXPOSED_USER_KEYS] (state, value) {
      state.gettingExposedUserKeys = value
    },
    [MutationType.SET_EXPOSED_USER_KEY_IDS] (state, value) {
      state.exposedUserKeyIds = value
    }
  },
  actions: {
    async [ActionType.ENABLE_ANALYSIS] ({ commit, dispatch, rootState }): Promise<void> {
      commit(MutationType.SET_ANALYSIS_ENABLED, true)
      await dispatch(ActionType.MAYBE_ASSESS_USER_KEYS, rootState.userKeys)
    },
    async [ActionType.DETECT_DUPLICATE_GROUPS] ({ commit }, userKeys: Array<Key>): Promise<void> {
      commit(MutationType.SET_GETTING_DUPLICATE_GROUPS, true)
      const passwordToIds = new Map<string, Array<string>>()
      userKeys.forEach(({ identifier, value }) => {
        if (!passwordToIds.has(value)) {
          passwordToIds.set(value, [])
        }
        passwordToIds.get(value)!.push(identifier)
      })
      const duplicateGroups: Array<Array<string>> = []
      for (const group of passwordToIds.values()) {
        if (group.length > 1) {
          duplicateGroups.push(group)
        }
      }
      commit(MutationType.SET_DUPLICATE_GROUPS, duplicateGroups)
      commit(MutationType.SET_GETTING_DUPLICATE_GROUPS, false)
    },
    async [ActionType.DETECT_EXPOSED_USER_KEYS] ({ commit }, userKeys: Array<Key>): Promise<void> {
      try {
        commit(MutationType.SET_GETTING_EXPOSED_USER_KEYS, true)
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
        commit(MutationType.SET_EXPOSED_USER_KEY_IDS, exposedUserKeyIds)
      } finally {
        commit(MutationType.SET_GETTING_EXPOSED_USER_KEYS, false)
      }
    },
    async [ActionType.MAYBE_ASSESS_USER_KEYS] ({ state, dispatch }, userKeys: Array<Key>): Promise<Array<void>> {
      if (state.isAnalysisEnabled) {
        return Promise.all([
          dispatch(ActionType.DETECT_DUPLICATE_GROUPS, userKeys),
          dispatch(ActionType.DETECT_EXPOSED_USER_KEYS, userKeys)
        ])
      } else {
        return Promise.resolve([])
      }
    }
  }
}
