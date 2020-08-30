import { ActionTree } from 'vuex'
import { RootState, Key, FullState, RegistrationState, RegistrationErrorType } from '@/store/state'
import { container } from 'tsyringe'
import { SodiumClient } from '@/sodium_client'
import { Status } from '../status'
import { purgeSessionStorageAndRedirect } from '../../../utilities'
import {
  ServiceRegisterResponse,
  ServiceRegisterResponseError,
  ServiceGetSaltResponse,
  ServiceGetSaltResponseError,
  ServiceLogInResponse,
  ServiceLogInResponseError
} from '@/api/definitions'
import { Type as RootMutation, setSessionKey$, setRegistrationData$, setParametrization$, setEncryptionKey$, setRequiresMailVerification$, setStatus$, setIsUserActive$ } from '../mutations'
import { MutationType as SessionMutation, setUsername$ } from '@/store/modules/session'
import { Type as KeysActions } from './keys'
import {
  MutationType as DepotMutation,
  ActionType as DepotAction,
  GetterType as DepotGetter
} from '@/store/modules/depot'
import { getAuthenticationApi } from '@/api/injections'
import { Subject, of, from } from 'rxjs'
import { switchMap, map, tap, catchError, delay } from 'rxjs/operators'
import VueRouter from 'vue-router/types'
import router from '@/router'

export enum Type {
  ATTEMPT_ONLINE_AUTHENTICATION = 'attemptOnlineAuthentication',
  LOG_IN = 'logIn',
}

export enum RegisterActionType {
  REGISTER = 'REGISTER',
  RESET = 'RESET',
}

interface RegisterUser {
  type: RegisterActionType.REGISTER;
  username: string;
  password: string;
  mail: string;
}

interface RegisterReset {
  type: RegisterActionType.RESET;
}

export const register$ = new Subject<RegisterUser | RegisterReset>()
register$.pipe(switchMap((action) => {
  switch (action.type) {
    case RegisterActionType.REGISTER:
      return of(action).pipe(
        tap(() => { setRegistrationData$.next({ state: RegistrationState.GENERATING_PARAMETRIZATION }) }),
        switchMap(() => from(container.resolve(SodiumClient).generateArgon2Parametrization()).pipe(
          map((parametrization) => ({ action, parametrization }))
        )),
        tap(() => { setRegistrationData$.next({ state: RegistrationState.COMPUTING_MASTER_KEY_DERIVATIVES }) }),
        switchMap((context) => from(container.resolve(SodiumClient).computeAuthDigestAndEncryptionKey(
          context.parametrization, context.action.password)).pipe(
          map(({ authDigest, encryptionKey }) => Object.assign({}, context, { authDigest, encryptionKey }))
        )),
        tap(() => { setRegistrationData$.next({ state: RegistrationState.MAKING_REQUEST }) }),
        switchMap((context) => from(getAuthenticationApi().register({
          username: context.action.username,
          salt: context.parametrization,
          digest: context.authDigest,
          mail: context.action.mail
        })).pipe(
          map((response: ServiceRegisterResponse) => Object.assign({}, context, { response }))
        )),
        tap((context) => {
          if (context.response.error === ServiceRegisterResponseError.NONE) {
            setRegistrationData$.next({ state: RegistrationState.SUCCESS })
            setParametrization$.next(context.parametrization)
            setEncryptionKey$.next(context.encryptionKey)
            setSessionKey$.next(context.response.sessionKey)
            setRequiresMailVerification$.next(true)
            setUsername$.next(context.action.username)
            setStatus$.next(Status.ONLINE)
            setIsUserActive$.next(true)
            ;(router as VueRouter).push('/mail-verification')
          } else {
            setRegistrationData$.next({
              state: RegistrationState.ERROR,
              error: {
                type: RegistrationErrorType.FAILURE,
                error: context.response.error!
              }
            })
          }
        }),
        catchError((error) => of(error).pipe(tap((error) => {
          setRegistrationData$.next({
            state: RegistrationState.ERROR,
            error: {
              type: RegistrationErrorType.EXCEPTION,
              message: `${error}`
            }
          })
        })))
      )
    case RegisterActionType.RESET:
      return of(action).pipe(
        tap(() => { setRegistrationData$.next({ state: RegistrationState.IDLE }) })
      )
  }
})).subscribe()

export const AuthenticationActions: ActionTree<RootState, RootState> = {
  async [Type.ATTEMPT_ONLINE_AUTHENTICATION] (
    { commit, dispatch, state },
    { username, password, persist }: { username: string; password: string; persist: boolean }
  ): Promise<{ success: boolean; local: boolean; requiresMailVerification?: boolean }> {
    commit(RootMutation.SET_STATUS, Status.CONNECTING)
    const saltResponse: ServiceGetSaltResponse =
      await getAuthenticationApi().getSalt(username)
    if (saltResponse.error === ServiceGetSaltResponseError.NONE) {
      const { salt: parametrization } = saltResponse
      const { authDigest, encryptionKey } =
        await container.resolve(SodiumClient).computeAuthDigestAndEncryptionKey(
          parametrization!, password)
      const authResponse: ServiceLogInResponse =
        await getAuthenticationApi().logIn({
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
        setSessionKey$.next(sessionKey)
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
