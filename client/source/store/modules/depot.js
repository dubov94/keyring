export default {
  namespaced: true,
  state: {
    username: null
  },
  getters: {
    hasLocalData: (state) => state.username !== null
  },
  mutations: {
    setUsername (state, value) {
      state.username = value
    }
  },
  actions: {
    saveUsername ({ commit }, username) {
      commit('setUsername', username)
    },
    purgeDepot ({ commit }) {
      commit('setUsername', null)
    }
  }
}
