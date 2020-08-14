import { container } from 'tsyringe'
import { Module } from 'vuex'
import { DepotState, RootState, Key } from '@/store/root/state'
import { SodiumClient } from '@/sodium_client'

const createInitialState = (): DepotState => ({
  username: null,
  parametrization: null,
  authDigest: null,
  encryptionKey: null,
  userKeys: null
})

const convertUserKeysToVault = (userKeys: Array<Key>): string => JSON.stringify(userKeys)

export enum GetterType {
  HAS_LOCAL_DATA = 'hasLocalData',
}

export enum MutationType {
  SET_INITIAL_VALUES = 'setInitialValues',
  SET_USERNAME = 'setUsername',
  SET_PARAMETRIZATION = 'setParametrization',
  SET_AUTH_DIGEST = 'setAuthDigest',
  SET_ENCRYPTION_KEY = 'setEncryptionKey',
  SET_USER_KEYS = 'setUserKeys',
}

export enum ActionType {
  PURGE_DEPOT = 'purgeDepot',
  VERIFY_PASSWORD = 'verifyPassword',
  COMPUTE_ENCRYPTION_KEY = 'computeEncryptionKey',
  GET_USER_KEYS = 'getUserKeys',
  MAYBE_UPDATE_DEPOT = 'maybeUpdateDepot',
}

export const Depot: Module<DepotState, RootState> = {
  namespaced: true,
  state: createInitialState,
  getters: {
    [GetterType.HAS_LOCAL_DATA]: (state) => state.username !== null
  },
  mutations: {
    [MutationType.SET_INITIAL_VALUES] (state) {
      Object.assign(state, createInitialState())
    },
    [MutationType.SET_USERNAME] (state, value: string) {
      state.username = value
    },
    [MutationType.SET_PARAMETRIZATION] (state, value: string) {
      state.parametrization = value
    },
    [MutationType.SET_AUTH_DIGEST] (state, value: string) {
      state.authDigest = value
    },
    [MutationType.SET_ENCRYPTION_KEY] (state, value: string) {
      state.encryptionKey = value
    },
    [MutationType.SET_USER_KEYS] (state, value: string) {
      state.userKeys = value
    }
  },
  actions: {
    [ActionType.PURGE_DEPOT] ({ commit }) {
      commit(MutationType.SET_INITIAL_VALUES)
    },
    async [ActionType.VERIFY_PASSWORD] ({ state }, password: string): Promise<boolean> {
      if (state.parametrization === null) {
        throw new Error('`DepotState.parametrization` is null')
      }
      const candidate = (await container.resolve(
        SodiumClient).computeAuthDigestAndEncryptionKey(
          state.parametrization, password)).authDigest
      return state.authDigest === candidate
    },
    async [ActionType.COMPUTE_ENCRYPTION_KEY] ({ commit, state }, password: string): Promise<void> {
      if (state.parametrization === null) {
        throw new Error('`DepotState.parametrization` is null')
      }
      commit(MutationType.SET_ENCRYPTION_KEY,
        (await container.resolve(SodiumClient).computeAuthDigestAndEncryptionKey(
          state.parametrization, password)).encryptionKey)
    },
    async [ActionType.GET_USER_KEYS] ({ state }): Promise<Array<Key>> {
      if (state.encryptionKey === null) {
        throw new Error('`DepotState.encryptionKey` is null')
      }
      if (state.userKeys === null) {
        throw new Error('`DepotState.userKeys` is null')
      }
      return JSON.parse(await container.resolve(SodiumClient).decryptMessage(
        state.encryptionKey, state.userKeys))
    },
    async [ActionType.MAYBE_UPDATE_DEPOT] (
      { commit, state, getters },
      { password, userKeys }: {
        password: string | undefined,
        userKeys: Array<Key> | undefined
      }
    ) {
      const sodiumInterface = container.resolve(SodiumClient)
      if (getters.hasLocalData) {
        if (password !== undefined) {
          if (userKeys === undefined) {
            throw new Error('Expected `userKeys` to be present')
          }
          const parametrization =
            await sodiumInterface.generateArgon2Parametrization()
          const { authDigest, encryptionKey } =
            await sodiumInterface.computeAuthDigestAndEncryptionKey(
              parametrization, password)
          const vault = await sodiumInterface.encryptMessage(
            encryptionKey, convertUserKeysToVault(userKeys))
          commit(MutationType.SET_PARAMETRIZATION, parametrization)
          commit(MutationType.SET_AUTH_DIGEST, authDigest)
          commit(MutationType.SET_ENCRYPTION_KEY, encryptionKey)
          commit(MutationType.SET_USER_KEYS, vault)
        } else if (userKeys !== undefined) {
          if (state.encryptionKey === null) {
            throw new Error('Expected `state.encryptionKey` not to be `null`')
          }
          const vault = await sodiumInterface.encryptMessage(
            state.encryptionKey, convertUserKeysToVault(userKeys))
          commit(MutationType.SET_USER_KEYS, vault)
        }
      }
    }
  }
}
