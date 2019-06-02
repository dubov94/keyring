import SodiumWrapper from '../../sodium.wrapper'

const createInitialState = () => ({
  username: null,
  parametrization: null,
  authDigest: null,
  encryptionKey: null,
  userKeys: null
})

export default {
  namespaced: true,
  state: createInitialState(),
  getters: {
    hasLocalData: (state) => state.username !== null
  },
  mutations: {
    setUsername (state, value) {
      state.username = value
    },
    setParametrization (state, value) {
      state.parametrization = value
    },
    setAuthDigest (state, value) {
      state.authDigest = value
    },
    setEncryptionKey (state, value) {
      state.encryptionKey = value
    },
    setUserKeys (state, value) {
      state.userKeys = value
    },
    setInitialValues (state) {
      Object.assign(state, createInitialState())
    }
  },
  actions: {
    saveUsername ({ commit }, username) {
      commit('setUsername', username)
    },
    purgeDepot ({ commit }) {
      commit('setInitialValues')
    },
    async savePassword ({ commit }, password) {
      let parametrization = await SodiumWrapper.generateArgon2Parametrization()
      let {authDigest, encryptionKey} =
        await SodiumWrapper.computeAuthDigestAndEncryptionKey(
          parametrization, password)
      commit('setParametrization', parametrization)
      commit('setAuthDigest', authDigest)
      commit('setEncryptionKey', encryptionKey)
    },
    async verifyPassword ({ state }, password) {
      let candidate = await SodiumWrapper.computeAuthDigest(
        state.parametrization, password)
      return state.authDigest === candidate
    },
    async saveUserKeys ({ commit, state }, { userKeys }) {
      commit('setUserKeys', await SodiumWrapper.encryptMessage(
        state.encryptionKey, JSON.stringify(userKeys)))
    },
    async getUserKeys ({ state }) {
      return JSON.parse(
        await SodiumWrapper.decryptMessage(state.encryptionKey, state.userKeys))
    }
  }
}
