export default {
  namespaced: true,
  state: {
    username: null
  },
  getters: {
    hasUsername: (state) => state.username !== null
  },
  mutations: {
    setUsername (state, value) {
      state.username = value
    }
  }
}
