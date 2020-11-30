import { Module } from 'vuex'
import {
  RootState,
  ChangeMasterKeyProgress,
  ChangeMasterKeyProgressState,
  ChangeUsernameProgress,
  ChangeUsernameProgressState,
  DeleteAccountProgress,
  DeleteAccountProgressState,
  constructInitialSettingsState,
  SettingsState,
  AcquireMailTokenProgress,
  ReleaseMailTokenProgress,
  AcquireMailTokenProgressState,
  ReleaseMailTokenProgressState,
  Password
} from '@/store/state'
import { createMutation, createGetter } from '@/store/state_rx'
import { switchMap, map, tap, catchError, takeUntil, filter, defaultIfEmpty } from 'rxjs/operators'
import { Subject, of, from, forkJoin } from 'rxjs'
import { SESSION_TOKEN_HEADER_NAME } from '@/constants'
import { getAdministrationApi } from '@/api/api_di'
import { success, indicator, exception, failure, FlowProgressBasicState, stringify } from '@/store/flow'
import {
  ServiceChangeMasterKeyResponse,
  ServiceChangeMasterKeyResponseError,
  ServiceChangeUsernameResponse,
  ServiceChangeUsernameResponseError,
  ServiceDeleteAccountResponse,
  ServiceDeleteAccountResponseError,
  ServiceAcquireMailTokenResponse,
  ServiceAcquireMailTokenResponseError,
  ServiceReleaseMailTokenResponse,
  ServiceReleaseMailTokenResponseError
} from '@/api/definitions'
import { container } from 'tsyringe'
import { SodiumClient } from '@/sodium_client'
import { ResettableAction, ResettableActionType } from '@/store/resettable_action'
import { setSessionKey$, setParametrization$, setEncryptionKey$, userKeys$, parametrization$, sessionKey$, setRequiresMailVerification$ } from '..'
import { setUpDepot$ } from '../../depot'
import { showToast$ } from '../../interface/toast'
import { Router } from '@/router'
import VueI18n from 'vue-i18n'
import { shutDownLocalStorage, StorageManager } from '@/store/storages'
import { reduxGetStore } from '@/store/store_di'
import { sessionSlice } from '../../session'
import { SESSION_STORAGE_MANAGER_TOKEN } from '@/store/storages_di'

export const acquireMailTokenProgress$ = createGetter<AcquireMailTokenProgress>((state) => state.user.settings.mailToken.acquireProgress)
export const releaseMailTokenProgress$ = createGetter<ReleaseMailTokenProgress>((state) => state.user.settings.mailToken.releaseProgress)
export const changeMasterKeyProgress$ = createGetter<ChangeMasterKeyProgress>((state) => state.user.settings.changeMasterKeyProgress)
export const changeUsernameProgress$ = createGetter<ChangeUsernameProgress>((state) => state.user.settings.changeUsernameProgress)
export const deleteAccountProgress$ = createGetter<DeleteAccountProgress>((state) => state.user.settings.deleteAccountProgress)

enum MutationType {
  SET_CHANGE_MASTER_KEY_PROGRESS = 'setChangeMasterKeyProgress',
  SET_CHANGE_USERNAME_PROGRESS = 'setChangeUsernameProgress',
  SET_DELETE_ACCOUNT_PROGRESS = 'setDeleteAccountProgress',
  SET_ACQUIRE_MAIL_TOKEN_PROGRESS = 'setAcquireMailTokenProgress',
  SET_RELEASE_MAIL_TOKEN_PROGRESS = 'setReleaseMailTokenProgress',
}

const NAMESPACE = ['user', 'settings']

const setChangeMasterKeyProgress$ = createMutation<ChangeMasterKeyProgress>(NAMESPACE, MutationType.SET_CHANGE_MASTER_KEY_PROGRESS)
const setChangeUsernameProgress$ = createMutation<ChangeUsernameProgress>(NAMESPACE, MutationType.SET_CHANGE_USERNAME_PROGRESS)
const setDeleteAccountProgress$ = createMutation<DeleteAccountProgress>(NAMESPACE, MutationType.SET_DELETE_ACCOUNT_PROGRESS)
const setAcquireMailTokenProgress$ = createMutation<AcquireMailTokenProgress>(NAMESPACE, MutationType.SET_ACQUIRE_MAIL_TOKEN_PROGRESS)
const setReleaseMailTokenProgress$ = createMutation<ReleaseMailTokenProgress>(NAMESPACE, MutationType.SET_RELEASE_MAIL_TOKEN_PROGRESS)

const hasNoSessionKey$ = sessionKey$.pipe(filter((sessionKey) => sessionKey === null))

export interface ChangeMasterKeyPayload {
  current: string;
  renewal: string;
}
export const changeMasterKey$ = new Subject<ResettableAction<ChangeMasterKeyPayload>>()
changeMasterKey$.pipe(switchMap((action) => {
  switch (action.type) {
    case ResettableActionType.ACT:
      return of({ action }).pipe(
        map((context) => ({
          ...context,
          curParametrization: parametrization$.getValue(),
          sessionKey: sessionKey$.getValue()
        })),
        tap(() => {
          setChangeMasterKeyProgress$.next(indicator(ChangeMasterKeyProgressState.REENCRYPTING, undefined))
        }),
        switchMap((context) => from(container.resolve(SodiumClient).computeAuthDigestAndEncryptionKey(
          context.curParametrization!, context.action.current)).pipe(
          map(({ authDigest }) => ({ ...context, curDigest: authDigest }))
        )),
        switchMap((context) => from(container.resolve(SodiumClient).generateArgon2Parametrization()).pipe(
          map((newParametrization) => ({ ...context, newParametrization }))
        )),
        switchMap((context) => from(container.resolve(SodiumClient).computeAuthDigestAndEncryptionKey(
          context.newParametrization, context.action.renewal)).pipe(
          map(({ authDigest, encryptionKey }) => ({ ...context, newAuthDigest: authDigest, newEncryptionKey: encryptionKey }))
        )),
        switchMap((context) => forkJoin(userKeys$.getValue().map(async ({ identifier, value, tags }) => ({
          identifier,
          password: await container.resolve(SodiumClient).encryptPassword(context.newEncryptionKey, { value, tags })
        }))).pipe(
          defaultIfEmpty([] as Array<{ identifier: string; password: Password }>),
          map((data) => ({ ...context, data }))
        )),
        tap(() => {
          setChangeMasterKeyProgress$.next(indicator(ChangeMasterKeyProgressState.MAKING_REQUEST, undefined))
        }),
        switchMap((context) => from(getAdministrationApi().changeMasterKey({
          currentDigest: context.curDigest,
          renewal: {
            salt: context.newParametrization,
            digest: context.newAuthDigest,
            keys: context.data
          }
        }, {
          headers: {
            [SESSION_TOKEN_HEADER_NAME]: context.sessionKey
          }
        })).pipe(
          map((response: ServiceChangeMasterKeyResponse) => ({ ...context, response }))
        )),
        tap((context) => {
          switch (context.response.error) {
            case ServiceChangeMasterKeyResponseError.NONE:
              setChangeMasterKeyProgress$.next(success(undefined))
              setSessionKey$.next(context.response.sessionKey)
              setParametrization$.next(context.newParametrization)
              setEncryptionKey$.next(context.newEncryptionKey)
              setUpDepot$.next(context.action.renewal)
              showToast$.next({ message: container.resolve(VueI18n).t('DONE') as string })
              break
            default:
              setChangeMasterKeyProgress$.next(failure(context.response.error!))
              break
          }
        }),
        catchError((error) => of(error).pipe(tap((error) => {
          setChangeMasterKeyProgress$.next(exception(stringify(error)))
          showToast$.next({ message: stringify(error) })
        }))),
        takeUntil(hasNoSessionKey$)
      )
    case ResettableActionType.RESET:
      return of(action).pipe(
        tap(() => { setChangeMasterKeyProgress$.next(indicator(FlowProgressBasicState.IDLE, undefined)) })
      )
  }
})).subscribe()

export interface ChangeUsernamePayload {
  username: string;
  password: string;
}
export const changeUsername$ = new Subject<ResettableAction<ChangeUsernamePayload>>()
changeUsername$.pipe(switchMap((action) => {
  switch (action.type) {
    case ResettableActionType.ACT:
      return of({ action }).pipe(
        map((context) => ({
          ...context,
          parametrization: parametrization$.getValue(),
          sessionKey: sessionKey$.getValue()
        })),
        tap(() => {
          setChangeUsernameProgress$.next(indicator(ChangeUsernameProgressState.COMPUTING_MASTER_KEY_DERIVATIVES, undefined))
        }),
        switchMap((context) => from(container.resolve(SodiumClient).computeAuthDigestAndEncryptionKey(
          context.parametrization!, context.action.password)).pipe(
          map(({ authDigest }) => ({ ...context, authDigest }))
        )),
        tap(() => { setChangeUsernameProgress$.next(indicator(ChangeUsernameProgressState.MAKING_REQUEST, undefined)) }),
        switchMap((context) => from(getAdministrationApi().changeUsername({
          digest: context.authDigest,
          username: context.action.username
        }, {
          headers: {
            [SESSION_TOKEN_HEADER_NAME]: context.sessionKey
          }
        })).pipe(
          map((response: ServiceChangeUsernameResponse) => ({ ...context, error: response.error }))
        )),
        tap((context) => {
          switch (context.error) {
            case ServiceChangeUsernameResponseError.NONE:
              setChangeUsernameProgress$.next(success(undefined))
              reduxGetStore().dispatch(sessionSlice.actions.setUsername(context.action.username))
              showToast$.next({ message: container.resolve(VueI18n).t('DONE') as string })
              break
            default:
              setChangeUsernameProgress$.next(failure(context.error!))
              break
          }
        }),
        catchError((error) => of(error).pipe(tap((error) => {
          setChangeUsernameProgress$.next(exception(stringify(error)))
          showToast$.next({ message: stringify(error) })
        }))),
        takeUntil(hasNoSessionKey$)
      )
    case ResettableActionType.RESET:
      return of(action).pipe(
        tap(() => { setChangeUsernameProgress$.next(indicator(FlowProgressBasicState.IDLE, undefined)) })
      )
  }
})).subscribe()

export interface DeleteAccountPayload {
  password: string;
}
export const deleteAccount$ = new Subject<ResettableAction<DeleteAccountPayload>>()
deleteAccount$.pipe(switchMap((action) => {
  switch (action.type) {
    case ResettableActionType.ACT:
      return of({ action }).pipe(
        map((context) => ({
          ...context,
          parametrization: parametrization$.getValue(),
          sessionKey: sessionKey$.getValue()
        })),
        tap(() => {
          setDeleteAccountProgress$.next(indicator(DeleteAccountProgressState.COMPUTING_MASTER_KEY_DERIVATIVES, undefined))
        }),
        switchMap((context) => from(container.resolve(SodiumClient).computeAuthDigestAndEncryptionKey(
          context.parametrization!, context.action.password)).pipe(
          map(({ authDigest }) => ({ ...context, authDigest }))
        )),
        tap(() => {
          setDeleteAccountProgress$.next(indicator(DeleteAccountProgressState.MAKING_REQUEST, undefined))
        }),
        switchMap((context) => from(getAdministrationApi().deleteAccount({
          digest: context.authDigest
        }, {
          headers: {
            [SESSION_TOKEN_HEADER_NAME]: context.sessionKey
          }
        })).pipe(
          map((response: ServiceDeleteAccountResponse) => ({ ...context, error: response.error }))
        )),
        tap((context) => {
          switch (context.error) {
            case ServiceDeleteAccountResponseError.NONE:
              setDeleteAccountProgress$.next(success(undefined))
              shutDownLocalStorage()
              container.resolve<StorageManager>(SESSION_STORAGE_MANAGER_TOKEN).destroy()
              location.assign('/')
              break
            default:
              setDeleteAccountProgress$.next(failure(context.error!))
              break
          }
        }),
        catchError((error) => of(error).pipe(tap((error) => {
          setDeleteAccountProgress$.next(exception(stringify(error)))
          showToast$.next({ message: stringify(error) })
        }))),
        takeUntil(hasNoSessionKey$)
      )
    case ResettableActionType.RESET:
      return of(action).pipe(
        tap(() => { setDeleteAccountProgress$.next(indicator(FlowProgressBasicState.IDLE, undefined)) })
      )
  }
})).subscribe()

export interface AcquireMailTokenPayload {
  mail: string;
  password: string;
}
export const acquireMailToken$ = new Subject<ResettableAction<AcquireMailTokenPayload>>()
acquireMailToken$.pipe(switchMap((action) => {
  switch (action.type) {
    case ResettableActionType.ACT:
      return of({ action }).pipe(
        map((context) => ({
          ...context,
          parametrization: parametrization$.getValue(),
          sessionKey: sessionKey$.getValue()
        })),
        tap(() => {
          setAcquireMailTokenProgress$.next(
            indicator(AcquireMailTokenProgressState.COMPUTING_MASTER_KEY_DERIVATIVES, ''))
        }),
        switchMap((context) => from(container.resolve(SodiumClient).computeAuthDigestAndEncryptionKey(
          context.parametrization!, context.action.password)).pipe(
          map(({ authDigest }) => ({ ...context, authDigest }))
        )),
        tap(() => {
          setAcquireMailTokenProgress$.next(
            indicator(AcquireMailTokenProgressState.MAKING_REQUEST, ''))
        }),
        switchMap((context) => from(getAdministrationApi().acquireMailToken({
          digest: context.authDigest,
          mail: context.action.mail
        }, {
          headers: {
            [SESSION_TOKEN_HEADER_NAME]: context.sessionKey
          }
        })).pipe(
          map((response: ServiceAcquireMailTokenResponse) => ({ ...context, error: response.error }))
        )),
        tap((context) => {
          switch (context.error) {
            case ServiceAcquireMailTokenResponseError.NONE:
              setAcquireMailTokenProgress$.next(success(context.action.mail))
              break
            default:
              setAcquireMailTokenProgress$.next(failure(context.error!))
              break
          }
        }),
        catchError((error) => of(error).pipe(tap((error) => {
          setAcquireMailTokenProgress$.next(exception(stringify(error)))
          showToast$.next({ message: stringify(error) })
        }))),
        takeUntil(hasNoSessionKey$)
      )
    case ResettableActionType.RESET:
      return of(action).pipe(
        tap(() => {
          setAcquireMailTokenProgress$.next(indicator(FlowProgressBasicState.IDLE, ''))
        })
      )
  }
})).subscribe()

export interface ReleaseMailTokenPayload {
  code: string;
  redirect?: boolean;
}
export const releaseMailToken$ = new Subject<ResettableAction<ReleaseMailTokenPayload>>()
releaseMailToken$.pipe(switchMap((action) => {
  switch (action.type) {
    case ResettableActionType.ACT:
      return of({ action }).pipe(
        map((context) => ({ ...context, sessionKey: sessionKey$.getValue() })),
        tap(() => {
          setReleaseMailTokenProgress$.next(indicator(ReleaseMailTokenProgressState.MAKING_REQUEST, undefined))
        }),
        switchMap((context) => from(getAdministrationApi().releaseMailToken({
          code: context.action.code
        }, {
          headers: {
            [SESSION_TOKEN_HEADER_NAME]: context.sessionKey
          }
        })).pipe(
          map((response: ServiceReleaseMailTokenResponse) => ({ ...context, error: response.error }))
        )),
        tap((context) => {
          switch (context.error) {
            case ServiceReleaseMailTokenResponseError.NONE:
              setReleaseMailTokenProgress$.next(success(undefined))
              setRequiresMailVerification$.next(false)
              if (context.action.redirect) {
                Router.push('/dashboard')
              } else {
                showToast$.next({ message: container.resolve(VueI18n).t('DONE') as string })
              }
              break
            default:
              setReleaseMailTokenProgress$.next(failure(context.error!))
              break
          }
        }),
        catchError((error) => of(error).pipe(tap((error) => {
          setReleaseMailTokenProgress$.next(exception(stringify(error)))
          showToast$.next({ message: stringify(error) })
        }))),
        takeUntil(hasNoSessionKey$)
      )
    case ResettableActionType.RESET:
      return of(action).pipe(
        tap(() => {
          setReleaseMailTokenProgress$.next(indicator(FlowProgressBasicState.IDLE, undefined))
        })
      )
  }
})).subscribe()

export const Settings: Module<SettingsState, RootState> = {
  namespaced: true,
  state: constructInitialSettingsState,
  mutations: {
    [MutationType.SET_CHANGE_MASTER_KEY_PROGRESS] (state, value: ChangeMasterKeyProgress) {
      state.changeMasterKeyProgress = value
    },
    [MutationType.SET_CHANGE_USERNAME_PROGRESS] (state, value: ChangeUsernameProgress) {
      state.changeUsernameProgress = value
    },
    [MutationType.SET_DELETE_ACCOUNT_PROGRESS] (state, value: DeleteAccountProgress) {
      state.deleteAccountProgress = value
    },
    [MutationType.SET_ACQUIRE_MAIL_TOKEN_PROGRESS] (state, value: AcquireMailTokenProgress) {
      state.mailToken.acquireProgress = value
    },
    [MutationType.SET_RELEASE_MAIL_TOKEN_PROGRESS] (state, value: ReleaseMailTokenProgress) {
      state.mailToken.releaseProgress = value
    }
  }
}
