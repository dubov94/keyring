import { AnyAction, configureStore } from '@reduxjs/toolkit'
import { combineEpics, createEpicMiddleware, Epic } from 'redux-observable'
import { RootAction } from './root_action'
import { reducer, RootState } from './root_reducer'
import { LOCAL_STORAGE_ACCESSOR, SESSION_STORAGE_ACCESSOR } from './storages'
import { rehydrateSession } from './modules/session/actions'
import { rehydrateDepot } from './modules/depot/actions'
import isEqual from 'lodash/isEqual'
import { BehaviorSubject, defer, EMPTY, fromEvent, Subject, timer } from 'rxjs'
import * as authnEpics from './modules/authn/epics'
import * as depotEpics from './modules/depot/epics'
import * as uiToastEpics from './modules/ui/toast/epics'
import * as userAccountEpics from './modules/user/account/epics'
import * as userKeysEpics from './modules/user/keys/epics'
import * as userSecurityEpics from './modules/user/security/epics'
import { concatMapTo, delay, distinctUntilChanged, filter, map, retryWhen, switchMap, takeUntil, tap } from 'rxjs/operators'
import { isActionOf } from 'typesafe-actions'
import { logOut, LogoutTrigger } from './modules/user/account/actions'
import { getAdministrationApi } from '@/api/api_di'
import { SESSION_TOKEN_HEADER_NAME } from '@/headers'

// Stream of actions for use in components.
export const action$ = new Subject<AnyAction>()
const actionsObservableEpic: Epic<RootAction, RootAction, RootState> = (actionsObservable) => actionsObservable.pipe(
  tap(action$),
  concatMapTo(EMPTY)
)

// Store initialization.
const epicMiddleware = createEpicMiddleware<RootAction, RootAction, RootState>()
export const store = configureStore({
  reducer,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(epicMiddleware)
})
epicMiddleware.run(combineEpics(
  ...Object.values(authnEpics),
  ...Object.values(depotEpics),
  ...Object.values(uiToastEpics),
  ...Object.values(userAccountEpics),
  ...Object.values(userKeysEpics),
  ...Object.values(userSecurityEpics),
  actionsObservableEpic
))

// Stream of states for use in components.
export const state$ = new BehaviorSubject<RootState>(store.getState())
store.subscribe(() => {
  state$.next(store.getState())
})

// Persistance and rehydration.
store.dispatch(rehydrateSession({
  username: SESSION_STORAGE_ACCESSOR.get<string>('username'),
  logoutTrigger: SESSION_STORAGE_ACCESSOR.get<LogoutTrigger>('logout_trigger')
}))
state$.pipe(
  map((state) => ({
    username: state.session.username,
    logoutTrigger: state.session.logoutTrigger
  })),
  distinctUntilChanged(isEqual),
  takeUntil(action$.pipe(filter(isActionOf(logOut))))
).subscribe(({ username, logoutTrigger }) => {
  SESSION_STORAGE_ACCESSOR.set('username', username)
  SESSION_STORAGE_ACCESSOR.set('logout_trigger', logoutTrigger)
})

store.dispatch(rehydrateDepot({
  username: LOCAL_STORAGE_ACCESSOR.get<string>('depot.username'),
  salt: LOCAL_STORAGE_ACCESSOR.get<string>('depot.salt'),
  hash: LOCAL_STORAGE_ACCESSOR.get<string>('depot.hash'),
  vault: LOCAL_STORAGE_ACCESSOR.get<string>('depot.vault'),
  encryptedOtpToken: LOCAL_STORAGE_ACCESSOR.get<string>('depot.encrypted_otp_token')
}))
state$.pipe(
  map((state) => ({
    username: state.depot.username,
    salt: state.depot.salt,
    hash: state.depot.hash,
    vault: state.depot.vault,
    encryptedOtpToken: state.depot.encryptedOtpToken
  })),
  distinctUntilChanged(isEqual),
  takeUntil(action$.pipe(filter(isActionOf(logOut))))
).subscribe(({ username, salt, hash, vault, encryptedOtpToken }) => {
  LOCAL_STORAGE_ACCESSOR.set('depot.username', username)
  LOCAL_STORAGE_ACCESSOR.set('depot.salt', salt)
  LOCAL_STORAGE_ACCESSOR.set('depot.hash', hash)
  LOCAL_STORAGE_ACCESSOR.set('depot.vault', vault)
  LOCAL_STORAGE_ACCESSOR.set('depot.encrypted_otp_token', encryptedOtpToken)
})

// Session maintenance.
const SESSION_LIFETIME_IN_MILLIS = 10 * 60 * 1000

fromEvent(document, 'visibilitychange').pipe(switchMap(() => {
  if (document.visibilityState !== 'visible') {
    // https://stackoverflow.com/q/6346849
    return timer(SESSION_LIFETIME_IN_MILLIS)
  }
  return EMPTY
})).subscribe(() => {
  if (state$.getValue().user.account.isAuthenticated) {
    store.dispatch(logOut(LogoutTrigger.SESSION_EXPIRATION))
  }
})

state$.pipe(
  map((state) => state.user.account.sessionKey),
  distinctUntilChanged(isEqual),
  switchMap((sessionKey) => {
    const halfLifetime = SESSION_LIFETIME_IN_MILLIS / 2
    return sessionKey === null ? EMPTY : timer(halfLifetime, halfLifetime).pipe(
      switchMap(() => defer(() => getAdministrationApi().keepAlive({}, {
        headers: {
          [SESSION_TOKEN_HEADER_NAME]: sessionKey
        }
      })).pipe(retryWhen(errors => errors.pipe(delay(3 * 1000)))))
    )
  })
).subscribe()
