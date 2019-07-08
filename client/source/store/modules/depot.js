import SodiumWrapper from '../../sodium.wrapper'

const createInitialState = () => ({
  username: null,
  parametrization: null,
  authDigest: null,
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
    async saveAuthDigest ({ commit }, password) {
      // Regenerate parametrization on every synchronization.
      let parametrization = await SodiumWrapper.generateArgon2Parametrization()
      let authDigest = (await SodiumWrapper.computeAuthDigestAndEncryptionKey(
          parametrization, password)).authDigest
      commit('setParametrization', parametrization)
      commit('setAuthDigest', authDigest)
    },
    async verifyPassword ({ state }, password) {
      let candidate = (await SodiumWrapper.computeAuthDigestAndEncryptionKey(
        state.parametrization, password)).authDigest
      return state.authDigest === candidate
    },
    async saveUserKeys ({ commit }, { encryptionKey, userKeys }) {
      commit('setUserKeys', await SodiumWrapper.encryptMessage(
        encryptionKey, JSON.stringify(userKeys)))
    },
    async getUserKeys ({ state }, { encryptionKey }) {
      return JSON.parse(await SodiumWrapper.decryptMessage(
        encryptionKey, state.userKeys))
    },
    async computeEncryptionKey ({ state }, password) {
      return (await SodiumWrapper.computeAuthDigestAndEncryptionKey(
        state.parametrization, password)).encryptionKey
    }
  }
}
