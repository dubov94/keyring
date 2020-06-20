import { container } from 'tsyringe'
import { SodiumClient } from '@/sodium_client'

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
      const candidate = (await container.resolve(SodiumClient).computeAuthDigestAndEncryptionKey(
        state.parametrization, password)).authDigest
      return state.authDigest === candidate
    },
    async computeEncryptionKey ({ commit, state }, password) {
      commit('setEncryptionKey',
        (await container.resolve(SodiumClient).computeAuthDigestAndEncryptionKey(
          state.parametrization, password)).encryptionKey)
    },
    async getUserKeys ({ state }) {
      return JSON.parse(await container.resolve(SodiumClient).decryptMessage(
        state.encryptionKey, state.userKeys))
    },
    async maybeUpdateDepot (
      { commit, state, getters }, { password, userKeys }) {
      const sodiumInterface = container.resolve(SodiumClient)
      if (getters.hasLocalData) {
        if (isPresent(password)) {
          if (!isPresent(userKeys)) {
            throw new Error('Expected `userKeys` to be present.')
          }
          const parametrization =
            await sodiumInterface.generateArgon2Parametrization()
          const { authDigest, encryptionKey } =
            await sodiumInterface.computeAuthDigestAndEncryptionKey(
              parametrization, password)
          const vault = await sodiumInterface.encryptMessage(
            encryptionKey, convertUserKeysToVault(userKeys))
          commit('setParametrization', parametrization)
          commit('setAuthDigest', authDigest)
          commit('setEncryptionKey', encryptionKey)
          commit('setUserKeys', vault)
        } else if (isPresent(userKeys)) {
          if (state.encryptionKey === null) {
            throw new Error('Expected `state.encryptionKey` not to be `null`.')
          }
          const vault = await sodiumInterface.encryptMessage(
            state.encryptionKey, convertUserKeysToVault(userKeys))
          commit('setUserKeys', vault)
        }
      }
    }
  }
}
