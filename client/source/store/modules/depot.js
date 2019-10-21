import SodiumWrapper from '../../sodium.wrapper'

const createInitialState = () => ({
  username: null,
  parametrization: null,
  authDigest: null,
  encryptionKey: null,
  userKeys: null
})

const isPresent = (value) => value !== undefined

const convertUserKeysToVault = (userKeys) => JSON.stringify(userKeys)

export default {
  namespaced: true,
  state: createInitialState(),
  getters: {
    hasLocalData: (state) => state.username !== null
  },
  mutations: {
    setInitialValues (state) {
      Object.assign(state, createInitialState())
    },
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
    }
  },
  actions: {
    purgeDepot ({ commit }) {
      commit('setInitialValues')
    },
    async verifyPassword ({ state }, password) {
      let candidate = (await SodiumWrapper.computeAuthDigestAndEncryptionKey(
        state.parametrization, password)).authDigest
      return state.authDigest === candidate
    },
    async computeEncryptionKey ({ commit, state }, password) {
      commit('setEncryptionKey',
        (await SodiumWrapper.computeAuthDigestAndEncryptionKey(
          state.parametrization, password)).encryptionKey)
    },
    async getUserKeys ({ state }) {
      return JSON.parse(await SodiumWrapper.decryptMessage(
        state.encryptionKey, state.userKeys))
    },
    async maybeUpdateDepot (
      { commit, state, getters }, { password, userKeys }) {
      if (getters.hasLocalData) {
        if (isPresent(password)) {
          if (!isPresent(userKeys)) {
            throw new Error('Expected `userKeys` to be present.')
          }
          let parametrization =
            await SodiumWrapper.generateArgon2Parametrization()
          let {authDigest, encryptionKey} =
            await SodiumWrapper.computeAuthDigestAndEncryptionKey(
              parametrization, password)
          let vault = await SodiumWrapper.encryptMessage(
            encryptionKey, convertUserKeysToVault(userKeys))
          commit('setParametrization', parametrization)
          commit('setAuthDigest', authDigest)
          commit('setEncryptionKey', encryptionKey)
          commit('setUserKeys', vault)
        } else if (isPresent(userKeys)) {
          if (state.encryptionKey === null) {
            throw new Error('Expected `state.encryptionKey` not to be `null`.')
          }
          let vault = await SodiumWrapper.encryptMessage(
            state.encryptionKey, convertUserKeysToVault(userKeys))
          commit('setUserKeys', vault)
        }
      }
    }
  }
}
