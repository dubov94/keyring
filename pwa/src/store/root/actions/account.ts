import { ActionTree } from 'vuex'
import { RootState, Session } from '@/store/state'
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
import { ADMINISTRATION_API_TOKEN } from '@/api/tokens'

export enum Type {
  CHANGE_MASTER_KEY = 'changeMasterKey',
  CHANGE_USERNAME = 'changeUsername',
  DELETE_ACCOUNT = 'deleteAccount',
  FETCH_RECENT_SESSIONS = 'fetchRecentSessions',
  CLEAR_RECENT_SESSIONS = 'clearRecentSessions',
}

export const AccountActions: ActionTree<RootState, RootState> = {
  async [Type.CHANGE_MASTER_KEY] (
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
      await container.resolve<AdministrationApi>(ADMINISTRATION_API_TOKEN).changeMasterKey({
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
  async [Type.CHANGE_USERNAME] (
    { commit, getters, state },
    { username, password }: { username: string; password: string }
  ): Promise<ServiceChangeUsernameResponseError> {
    if (state.parametrization === null) {
      throw new Error('`RootState.parametrization` is null')
    }
    if (state.sessionKey === null) {
      throw new Error('`RootState.sessionKey` is null')
    }
    const { error } =
      await container.resolve<AdministrationApi>(ADMINISTRATION_API_TOKEN).changeUsername({
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
  async [Type.DELETE_ACCOUNT] ({ state }, { password }: { password: string }): Promise<ServiceDeleteAccountResponseError> {
    if (state.parametrization === null) {
      throw new Error('`RootState.parametrization` is null')
    }
    if (state.sessionKey === null) {
      throw new Error('`RootState.sessionKey` is null')
    }
    return (
      await container.resolve<AdministrationApi>(ADMINISTRATION_API_TOKEN).deleteAccount({
        digest: (await container.resolve(SodiumClient).computeAuthDigestAndEncryptionKey(
          state.parametrization, password)).authDigest
      }, {
        headers: createSessionHeader(state.sessionKey)
      })
    ).error!
  },
  async [Type.FETCH_RECENT_SESSIONS] ({ commit, state }) {
    if (state.sessionKey === null) {
      throw new Error('`RootState.sessionKey` is null')
    }
    const response: ServiceGetRecentSessionsResponse =
      await container.resolve<AdministrationApi>(ADMINISTRATION_API_TOKEN).getRecentSessions({
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
  [Type.CLEAR_RECENT_SESSIONS] ({ commit }) {
    commit(RootMutation.SET_RECENT_SESSIONS, [])
  }
}
