import SodiumWrapper from '../../sodium.wrapper'

export default {
  namespaced: true,
  state: {
    username: null,
    digest: null
  },
  getters: {
    hasLocalData: (state) => state.username !== null
  },
  mutations: {
    setUsername (state, value) {
      state.username = value
    },
    setDigest (state, value) {
      state.digest = value
    }
  },
  actions: {
    saveUsername ({ commit }, username) {
      commit('setUsername', username)
    },
    purgeDepot ({ commit }) {
      commit('setUsername', null)
    },
    async saveDigest ({ commit }, password) {
      let parametrization = await SodiumWrapper.generateArgon2Parametrization()
      let digest = await SodiumWrapper.computeLocalDigest(
        parametrization, password)
      commit('setDigest', digest)
    }
  }
}
