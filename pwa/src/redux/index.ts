import { AnyAction, Dispatch, Middleware, configureStore } from '@reduxjs/toolkit'
import { retryBackoff } from 'backoff-rxjs'
import { option } from 'fp-ts'
import isEqual from 'lodash/isEqual'
import { combineEpics, createEpicMiddleware, Epic } from 'redux-observable'
import { BehaviorSubject, defer, EMPTY, Subject, timer, from } from 'rxjs'
import {
  concatMapTo,
  distinctUntilChanged,
  exhaustMap,
  filter,
  map,
  switchMap,
  takeUntil,
  tap,
  pairwise,
  concatMap,
  catchError
} from 'rxjs/operators'
import { isActionOf } from 'typesafe-actions'
import { getAdministrationApi } from '@/api/api_di'
import { getWebAuthn } from '@/cryptography/web_authn'
import { SESSION_TOKEN_HEADER_NAME } from '@/headers'
import { router } from '@/router'
import { injected, terminate } from './actions'
import * as authnEpics from './modules/authn/epics'
import { rehydration as depotRehydration, WebAuthn } from './modules/depot/actions'
import { snapshot as depotSnapshot } from './modules/depot/selectors'
import * as depotEpics from './modules/depot/epics'
import { rehydration as sessionRehydration } from './modules/session/actions'
import * as sessionEpics from './modules/session/epics'
import * as uiToastEpics from './modules/ui/toast/epics'
import { logOut, LogoutTrigger } from './modules/user/account/actions'
import * as userAccountEpics from './modules/user/account/epics'
import * as userKeysEpics from './modules/user/keys/epics'
import * as userSecurityEpics from './modules/user/security/epics'
import { createIdleDetector } from './idle'
import { data } from './remote_data'
import { RootAction } from './root_action'
import { reducer, RootState } from './root_reducer'
import { getLocalStorageAccessor, getSessionStorageAccessor } from './storages'
import { navigateTo } from './modules/ui/toast/actions'

// Stream of actions for use in components.
export const action$ = new Subject<AnyAction>()
const actionsObservableEpic: Epic<RootAction, RootAction, RootState> = (actionsObservable) => actionsObservable.pipe(
  tap(action$),
  concatMapTo(EMPTY)
)

// Store initialization.
const lifecycleReducer: typeof reducer = (state, action) => {
  // https://web.dev/articles/bfcache#update-data-after-restore
  return reducer(isActionOf(terminate, action) ? undefined : state, action)
}
const lifecycleMiddleware: Middleware<Record<string, never>, RootState, Dispatch<RootAction>> = (store) => {
  let isTerminated = false
  return (next: Dispatch<AnyAction>) => (action: AnyAction) => {
    if (isTerminated) {
      // eslint-disable-next-line no-console
      console.warn(`Ignoring ${action.type} after termination`)
      // https://redux.js.org/usage/writing-logic-thunks#returning-values-from-thunks
      return action
    }
    const result = next(action)
    // Mimics https://redux.js.org/api/store#subscribelistener.
    state$.next(store.getState())
    if (isActionOf(logOut, action)) {
      isTerminated = true
      next(terminate())
    }
    return result
  }
}
const epicMiddleware = createEpicMiddleware<RootAction, RootAction, RootState>()
export const store = configureStore({
  reducer: lifecycleReducer,
  middleware: (getDefaultMiddleware) => [
    lifecycleMiddleware,
    ...getDefaultMiddleware(),
    epicMiddleware
  ],
  devTools: !['production'].includes(process.env.NODE_ENV)
})
epicMiddleware.run(combineEpics(
  ...Object.values(authnEpics),
  ...Object.values(depotEpics),
  ...Object.values(sessionEpics),
  ...Object.values(uiToastEpics),
  ...Object.values(userAccountEpics),
  ...Object.values(userKeysEpics),
  ...Object.values(userSecurityEpics),
  actionsObservableEpic
))

// Stream of states for use in components.
export const state$ = new BehaviorSubject<RootState>(store.getState())

// `sessionStorage` rehydration.
action$.pipe(
  filter(isActionOf(injected))
).subscribe(() => {
  const accessor = getSessionStorageAccessor()
  store.dispatch(sessionRehydration({
    username: accessor.get<string>('username'),
    logoutTrigger: accessor.get<LogoutTrigger>('logout_trigger')
  }))
})

// `sessionStorage` persistence.
action$.pipe(
  filter(isActionOf(injected)),
  switchMap(() => state$.pipe(
    map((state) => ({
      username: state.session.username,
      logoutTrigger: state.session.logoutTrigger
    })),
    distinctUntilChanged(isEqual)
  ))
).subscribe(({ username, logoutTrigger }) => {
  const accessor = getSessionStorageAccessor()
  accessor.set('username', username)
  accessor.set('logout_trigger', logoutTrigger)
})

// `localStorage` rehydration.
action$.pipe(
  filter(isActionOf(injected))
).subscribe(() => {
  const accessor = getLocalStorageAccessor()
  store.dispatch(depotRehydration({
    username: accessor.get<string>('depot.username'),
    userId: accessor.get<string>('depot.user_id'),
    salt: accessor.get<string>('depot.salt'),
    hash: accessor.get<string>('depot.hash'),
    vault: accessor.get<string>('depot.vault'),
    encryptedOtpToken: accessor.get<string>('depot.encrypted_otp_token'),
    webAuthnCredentialId: accessor.get<string>('depot.web_authn.credential_id'),
    webAuthnSalt: accessor.get<string>('depot.web_authn.salt'),
    webAuthnEncryptedLocalDerivatives: accessor.get<string>('depot.web_authn.encrypted_local_derivatives'),
    webAuthnEncryptedRemoteDerivatives: accessor.get<string>('depot.web_authn.encrypted_remote_derivatives')
  }))
})

// `localStorage` persistence.
action$.pipe(
  filter(isActionOf(injected)),
  switchMap(() => state$.pipe(
    map(depotSnapshot),
    distinctUntilChanged(isEqual)
  ))
).subscribe((snapshot) => {
  const accessor = getLocalStorageAccessor()
  accessor.set('depot.username', snapshot.username)
  accessor.set('depot.user_id', snapshot.userId)
  accessor.set('depot.salt', snapshot.salt)
  accessor.set('depot.hash', snapshot.hash)
  accessor.set('depot.vault', snapshot.vault)
  accessor.set('depot.encrypted_otp_token', snapshot.encryptedOtpToken)
  accessor.set('depot.web_authn.credential_id', snapshot.webAuthnCredentialId)
  accessor.set('depot.web_authn.salt', snapshot.webAuthnSalt)
  accessor.set('depot.web_authn.encrypted_local_derivatives', snapshot.webAuthnEncryptedLocalDerivatives)
  accessor.set('depot.web_authn.encrypted_remote_derivatives', snapshot.webAuthnEncryptedRemoteDerivatives)
})

// Session maintenance.
// if_change(session_relative_duration)
const SESSION_RELATIVE_DURATION_MILLIS = 10 * 60 * 1000
// then_change

// https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timers
createIdleDetector(4 * 16).pipe(
  // To avoid dispatching `logOut` multiple times.
  takeUntil(action$.pipe(filter(isActionOf(logOut))))
).subscribe((periodMillis) => {
  if (periodMillis < SESSION_RELATIVE_DURATION_MILLIS) {
    return
  }
  if (state$.getValue().user.account.isAuthenticated) {
    store.dispatch(logOut(LogoutTrigger.SESSION_EXPIRATION))
  }
})

state$.pipe(
  map((state) => state.user.account.sessionKey),
  distinctUntilChanged(isEqual),
  switchMap((sessionKey) => {
    const halfDuration = SESSION_RELATIVE_DURATION_MILLIS / 2
    return sessionKey === null ? EMPTY : timer(halfDuration, halfDuration).pipe(
      exhaustMap(() => defer(() => getAdministrationApi().administrationKeepAlive({}, {
        headers: {
          [SESSION_TOKEN_HEADER_NAME]: sessionKey
        }
      })).pipe(retryBackoff({ initialInterval: 2 * 1000 })))
    )
  })
).subscribe()

state$.pipe(
  map((state) => state.depot.webAuthnData),
  map(data),
  map(option.getOrElse<WebAuthn | null>(() => null)),
  pairwise(),
  concatMap(([previous, current]) => {
    // Assuming `credentialId` cannot change without going through `null` first.
    if (previous !== null && current === null) {
      const { credentialId } = previous
      return from(getWebAuthn().deleteCredential(credentialId)).pipe(
        map(() => credentialId),
        catchError((error) => {
          console.warn(`Failed to delete credential ${credentialId}`, error)
          return EMPTY
        })
      )
    }
    return EMPTY
  })
).subscribe((credentialId) => {
  console.log(`Credential ${credentialId} is deleted`)
})

action$.pipe(
  filter(isActionOf(navigateTo))
).subscribe((action) => {
  router.push(action.payload)
})
