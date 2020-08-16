import { ActionTree } from 'vuex'
import { RootState, Key, FullState } from '@/store/state'
import { container } from 'tsyringe'
import { SodiumClient } from '@/sodium_client'
import { Status } from '../status'
import { purgeSessionStorageAndRedirect } from '../../../utilities'
import {
  AuthenticationApi,
  ServiceRegisterResponse,
  ServiceRegisterResponseError,
  ServiceGetSaltResponse,
  ServiceGetSaltResponseError,
  ServiceLogInResponse,
  ServiceLogInResponseError
} from '@/api/definitions'
import { Type as RootMutation } from '../mutations'
import { MutationType as SessionMutation } from '@/store/modules/session'
import { Type as KeysActions } from './keys'
import {
  MutationType as DepotMutation,
  ActionType as DepotAction,
  GetterType as DepotGetter
} from '@/store/modules/depot'
import { AUTHENTICATION_API_TOKEN } from '@/api/tokens'

export enum Type {
  REGISTER = 'register',
  ATTEMPT_ONLINE_AUTHENTICATION = 'attemptOnlineAuthentication',
  LOG_IN = 'logIn',
}

export const AuthenticationActions: ActionTree<RootState, RootState> = {
  async [Type.REGISTER] (
    { commit }, { username, password, mail }: { username: string; password: string; mail: string }
  ): Promise<ServiceRegisterResponseError> {
    const parametrization = await container.resolve(SodiumClient).generateArgon2Parametrization()
    const { authDigest, encryptionKey } =
      await container.resolve(SodiumClient).computeAuthDigestAndEncryptionKey(
        parametrization, password)
    const response: ServiceRegisterResponse =
      await container.resolve<AuthenticationApi>(AUTHENTICATION_API_TOKEN).register({
        username,
        salt: parametrization,
        digest: authDigest,
        mail
      })
    if (response.error === ServiceRegisterResponseError.NONE) {
      commit(RootMutation.SET_PARAMETRIZATION, parametrization)
      commit(RootMutation.SET_ENCRYPTION_KEY, encryptionKey)
      commit(RootMutation.SET_SESSION_KEY, response.sessionKey)
      commit(RootMutation.SET_REQUIRES_MAIL_VERIFICATION, true)
      commit(`session/${SessionMutation.SET_USERNAME}`, username)
      commit(RootMutation.SET_STATUS, Status.ONLINE)
      commit(RootMutation.SET_IS_USER_ACTIVE, true)
    }
    return response.error!
  },
  async [Type.ATTEMPT_ONLINE_AUTHENTICATION] (
    { commit, dispatch, state },
    { username, password, persist }: { username: string; password: string; persist: boolean }
  ): Promise<{ success: boolean; local: boolean; requiresMailVerification?: boolean }> {
    commit(RootMutation.SET_STATUS, Status.CONNECTING)
    const saltResponse: ServiceGetSaltResponse =
      await container.resolve<AuthenticationApi>(AUTHENTICATION_API_TOKEN).getSalt(username)
    if (saltResponse.error === ServiceGetSaltResponseError.NONE) {
      const { salt: parametrization } = saltResponse
      const { authDigest, encryptionKey } =
        await container.resolve(SodiumClient).computeAuthDigestAndEncryptionKey(
          parametrization!, password)
      const authResponse: ServiceLogInResponse =
        await container.resolve<AuthenticationApi>(AUTHENTICATION_API_TOKEN).logIn({
          username,
          digest: authDigest
        })
      if (authResponse.error === ServiceLogInResponseError.NONE) {
        const {
          requiresMailVerification,
          keySet,
          sessionKey
        } = authResponse.payload!
        commit(RootMutation.SET_PARAMETRIZATION, parametrization)
        commit(RootMutation.SET_ENCRYPTION_KEY, encryptionKey)
        await dispatch(KeysActions.ACCEPT_USER_KEYS, {
          userKeys: keySet!.items!.map(({ identifier, password }) => {
            return {
              identifier,
              value: password!.value,
              tags: password!.tags
            } as Key
          }),
          updateDepot: false
        })
        commit(RootMutation.SET_SESSION_KEY, sessionKey)
        if (persist) {
          // Ensures there will be no offline authentication until
          // the account is all set.
          if (!requiresMailVerification) {
            commit(`depot/${DepotMutation.SET_USERNAME}`, username)
            await dispatch(`depot/${DepotAction.MAYBE_UPDATE_DEPOT}`, {
              password,
              userKeys: state.userKeys
            })
          }
        }
        commit(`session/${SessionMutation.SET_USERNAME}`, username)
        commit(RootMutation.SET_REQUIRES_MAIL_VERIFICATION, requiresMailVerification)
        commit(RootMutation.SET_STATUS, Status.ONLINE)
        commit(RootMutation.SET_IS_USER_ACTIVE, true)
        return {
          success: true,
          local: false,
          requiresMailVerification
        }
      }
    }
    commit(RootMutation.SET_STATUS, Status.OFFLINE)
    return { success: false, local: false }
  },
  async [Type.LOG_IN] (
    { commit, dispatch, getters, state },
    { username, password, persist }: { username: string; password: string; persist: boolean }
  ) {
    const fullState = state as FullState
    if (getters[`depot/${DepotGetter.HAS_LOCAL_DATA}`]) {
      if (fullState.depot.username === username) {
        if (await dispatch(`depot/${DepotAction.VERIFY_PASSWORD}`, password)) {
          commit(`session/${SessionMutation.SET_USERNAME}`, username)
          await dispatch(`depot/${DepotAction.COMPUTE_ENCRYPTION_KEY}`, password)
          commit(RootMutation.SET_USER_KEYS, await dispatch(`depot/${DepotAction.GET_USER_KEYS}`))
          commit(RootMutation.SET_STATUS, Status.OFFLINE)
          commit(RootMutation.SET_IS_USER_ACTIVE, true)
          dispatch(
            Type.ATTEMPT_ONLINE_AUTHENTICATION,
            { username, password, persist }
          ).then(async ({ success, requiresMailVerification }: {
            success: boolean;
            requiresMailVerification?: boolean;
          }) => {
            if (!success || requiresMailVerification) {
              await dispatch(`depot/${DepotAction.PURGE_DEPOT}`)
              purgeSessionStorageAndRedirect()
            }
          })
          return { success: true, local: true, requiresMailVerification: false }
        } else {
          return { success: false, local: true }
        }
      } else {
        await dispatch(`depot/${DepotAction.PURGE_DEPOT}`)
      }
    }
    return await dispatch(
      Type.ATTEMPT_ONLINE_AUTHENTICATION, { username, password, persist })
  }
}
