export default {
  namespaced: true,
  state: {
    username: null
  },
  mutations: {
    setUsername (state, value) {
      state.username = value
    }
  },
  actions: {
    rememberUsername ({ commit }, username) {
      commit('setUsername', username)
    },
    forgetUsername ({ commit }) {
      commit('setUsername', null)
    }
  }
}
