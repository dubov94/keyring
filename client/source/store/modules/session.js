export default {
  namespaced: true,
  state: {
    username: null,
    lastRoute: null
  },
  getters: {
    hasUsername: (state) => state.username !== null
  },
  mutations: {
    setUsername (state, value) {
      state.username = value
    },
    setLastRoute (state, value) {
      state.lastRoute = value
    }
  }
}
