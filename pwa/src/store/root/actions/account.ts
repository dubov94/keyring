import { ActionTree } from 'vuex'
import { RootState, Session } from '@/store/root/state'
import { container } from 'tsyringe'
import { SodiumClient } from '@/sodium_client'
import { createSessionHeader } from './utilities'
import {
  AdministrationApi,
  ServiceChangeMasterKeyResponse,
  ServiceChangeMasterKeyResponseError,
  ServiceChangeUsernameResponseError,
  ServiceDeleteAccountResponseError,
  ServiceGetRecentSessionsResponse
} from '@/api/definitions'
import { Type as RootMutation } from '../mutations'
import { ActionType as DepotAction, GetterType as DepotGetter, MutationType as DepotMutation } from '@/store/modules/depot'
import { MutationType as SessionMutation } from '@/store/modules/session'

export const AccountActions: ActionTree<RootState, RootState> = {
  async changeMasterKey (
    { commit, dispatch, state },
    { current, renewal }: { current: string; renewal: string }
  ): Promise<ServiceChangeMasterKeyResponseError> {
    if (state.parametrization === null) {
      throw new Error('`RootState.parametrization` is null')
    }
    if (state.sessionKey === null) {
      throw new Error('`RootState.sessionKey` is null')
    }
    const curDigest = (await container.resolve(SodiumClient).computeAuthDigestAndEncryptionKey(
      state.parametrization, current)).authDigest
    const newParametrization = await container.resolve(SodiumClient).generateArgon2Parametrization()
    const { authDigest, encryptionKey } =
      await container.resolve(SodiumClient).computeAuthDigestAndEncryptionKey(
        newParametrization, renewal)
    const response: ServiceChangeMasterKeyResponse =
      await container.resolve(AdministrationApi).changeMasterKey({
        currentDigest: curDigest,
        renewal: {
          salt: newParametrization,
          digest: authDigest,
          keys: await Promise.all(state.userKeys.map(async (key) => ({
            identifier: key.identifier,
            password: await container.resolve(SodiumClient).encryptPassword(encryptionKey, {
              value: key.value,
              tags: key.tags
            })
          })))
        }
      }, {
        headers: createSessionHeader(state.sessionKey)
      })
    if (response.error === ServiceChangeMasterKeyResponseError.NONE) {
      commit(RootMutation.SET_PARAMETRIZATION, newParametrization)
      commit(RootMutation.SET_ENCRYPTION_KEY, encryptionKey)
      commit(RootMutation.SET_SESSION_KEY, response.sessionKey)
      await dispatch(`depot/${DepotAction.MAYBE_UPDATE_DEPOT}`, {
        password: renewal,
        userKeys: state.userKeys
      })
    }
    return response.error!
  },
  async changeUsername ({ commit, getters, state }, { username, password }): Promise<ServiceChangeUsernameResponseError> {
    if (state.parametrization === null) {
      throw new Error('`RootState.parametrization` is null')
    }
    if (state.sessionKey === null) {
      throw new Error('`RootState.sessionKey` is null')
    }
    const { error } =
      await container.resolve(AdministrationApi).changeUsername({
        digest: (await container.resolve(SodiumClient).computeAuthDigestAndEncryptionKey(
          state.parametrization, password)).authDigest,
        username
      }, {
        headers: createSessionHeader(state.sessionKey)
      })
    if (error === ServiceChangeUsernameResponseError.NONE) {
      if (getters[`depot/${DepotGetter.HAS_LOCAL_DATA}`]) {
        commit(`depot/${DepotMutation.SET_USERNAME}`, username)
      }
      commit(`session/${SessionMutation.SET_USERNAME}`, username)
    }
    return error!
  },
  async deleteAccount ({ state }, { password }): Promise<ServiceDeleteAccountResponseError> {
    if (state.parametrization === null) {
      throw new Error('`RootState.parametrization` is null')
    }
    if (state.sessionKey === null) {
      throw new Error('`RootState.sessionKey` is null')
    }
    return (
      await container.resolve(AdministrationApi).deleteAccount({
        digest: (await container.resolve(SodiumClient).computeAuthDigestAndEncryptionKey(
          state.parametrization, password)).authDigest
      }, {
        headers: createSessionHeader(state.sessionKey)
      })
    ).error!
  },
  async fetchRecentSessions ({ commit, state }) {
    if (state.sessionKey === null) {
      throw new Error('`RootState.sessionKey` is null')
    }
    const response: ServiceGetRecentSessionsResponse =
      await container.resolve(AdministrationApi).getRecentSessions({
        headers: createSessionHeader(state.sessionKey)
      })
    commit(RootMutation.SET_RECENT_SESSIONS, response.sessions!.map(
      ({ creationTimeInMillis, ipAddress, userAgent, geolocation }) => ({
        // `int64`.
        creationTimeInMillis: Number(creationTimeInMillis),
        ipAddress: ipAddress,
        userAgent: userAgent,
        geolocation: geolocation || {}
      } as Session)
    ))
  },
  clearRecentSessions ({ commit }) {
    commit(RootMutation.SET_RECENT_SESSIONS, [])
  }
}
