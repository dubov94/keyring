import { MutationTree } from 'vuex'
import {
  Key,
  UserState,
  Password,
  UserKeysProgress,
  UserKeysProgressState
} from '@/store/state'
import { createMutation, createGetter } from '@/store/state_rx'
import { switchMap, retryWhen, delay, map, tap, catchError, takeUntil, filter } from 'rxjs/operators'
import { timer, defer, fromEvent, Subject, of, from, combineLatest, EMPTY } from 'rxjs'
import { SESSION_LIFETIME_IN_MILLIS, HALF_SESSION_IN_MILLIS, SESSION_TOKEN_HEADER_NAME } from '@/constants'
import { getAdministrationApi } from '@/api/api_di'
import { closeEditor$ } from '../interface/editor'
import Vue from 'vue'
import { data, success, indicator, stringify } from '@/store/flow'
import {
  ServiceCreateKeyResponse,
  ServiceUpdateKeyResponse,
  ServiceDeleteKeyResponse
} from '@/api/definitions'
import { container } from 'tsyringe'
import { SodiumClient } from '@/sodium_client'
import { showToast$ } from '../interface/toast'
import { shutDownSessionStorage } from '@/store/storages'

export const createUserKeyHook$ = new Subject<string>()

export const isAuthenticated$ = createGetter<boolean>((state) => state.user.isAuthenticated)
export const userKeys$ = createGetter<Array<Key>>((state) => data(state.user.userKeysProgress, []))
export const userKeysUpdate$ = createGetter<boolean>((state) => Object.keys(UserKeysProgressState).includes(state.user.userKeysProgress.state))
export const sessionKey$ = createGetter<string | null>((state) => state.user.sessionKey)
export const parametrization$ = createGetter<string | null>((state) => state.user.parametrization)
export const canAccessApi$ = createGetter<boolean>((state) => state.user.sessionKey !== null)

const userKeysProgress$ = createGetter<UserKeysProgress>((state) => state.user.userKeysProgress)
const encryptionKey$ = createGetter<string | null>((state) => state.user.encryptionKey)

enum MutationType {
  SET_IS_AUTHENTICATED = 'setIsAuthenticated',
  SET_PARAMETRIZATION = 'setParametrization',
  SET_SESSION_KEY = 'setSessionKey',
  SET_ENCRYPTION_KEY = 'setEncryptionKey',
  SET_USER_KEYS_PROGRESS = 'setUserKeysProgress',
  SET_REQUIRES_MAIL_VERIFICATION = 'setRequiresMailVerification',
}

const NAMESPACE = ['user']

export const setIsAuthenticated$ = createMutation<boolean>(NAMESPACE, MutationType.SET_IS_AUTHENTICATED)
export const setParametrization$ = createMutation<string>(NAMESPACE, MutationType.SET_PARAMETRIZATION)
export const setSessionKey$ = createMutation<string>(NAMESPACE, MutationType.SET_SESSION_KEY)
export const setEncryptionKey$ = createMutation<string>(NAMESPACE, MutationType.SET_ENCRYPTION_KEY)
export const setRequiresMailVerification$ = createMutation<boolean>(NAMESPACE, MutationType.SET_REQUIRES_MAIL_VERIFICATION)

const setUserKeysProgress$ = createMutation<UserKeysProgress>(NAMESPACE, MutationType.SET_USER_KEYS_PROGRESS)

sessionKey$.pipe(
  switchMap(
    (sessionKey) => sessionKey === null ? EMPTY : timer(HALF_SESSION_IN_MILLIS, HALF_SESSION_IN_MILLIS).pipe(
      switchMap(
        () => defer(() => getAdministrationApi().keepAlive({}, {
          headers: {
            [SESSION_TOKEN_HEADER_NAME]: sessionKey
          }
        })).pipe(retryWhen(errors => errors.pipe(delay(3 * 1000))))
      )
    )
  )
).subscribe()

fromEvent(document, 'visibilitychange').pipe(
  switchMap(() => document.visibilityState === 'visible' ? EMPTY : timer(SESSION_LIFETIME_IN_MILLIS))
).subscribe(async () => {
  if (isAuthenticated$.getValue()) {
    // Prevent `beforeunload`.
    closeEditor$.next()
    await Vue.nextTick()
    location.reload()
  }
})

export const logOut$ = new Subject<void>()
logOut$.subscribe(() => {
  shutDownSessionStorage()
  location.assign('/')
})

export const setUserKeys$ = new Subject<Array<Key>>()
setUserKeys$.pipe(
  map((userKeys) => {
    return success(userKeys.sort((left, right) => {
      const [leftTagCount, rightTagCount] = [left.tags.length, right.tags.length]
      for (let tagIndex = 0; tagIndex < leftTagCount && tagIndex < rightTagCount; ++tagIndex) {
        const tagsComparison = String.prototype.localeCompare.call(
          left.tags[tagIndex], right.tags[tagIndex])
        if (tagsComparison !== 0) {
          return tagsComparison
        }
      }
      if (leftTagCount === rightTagCount) {
        return String.prototype.localeCompare.call(left.value, right.value)
      } else {
        return leftTagCount - rightTagCount
      }
    }))
  })
).subscribe(setUserKeysProgress$)

const unableToOperateOnKeys$ = combineLatest([encryptionKey$, sessionKey$]).pipe(
  filter(([encryptionKey, sessionKey]) => encryptionKey === null || sessionKey === null)
)

export const createUserKey$ = new Subject<Password>()
createUserKey$.pipe(switchMap((password) => of({ password }).pipe(
  tap(() => {
    setUserKeysProgress$.next(indicator(UserKeysProgressState.WORKING, data(userKeysProgress$.getValue(), [])))
  }),
  map(({ password }) => ({
    password,
    encryptionKey: encryptionKey$.getValue(),
    sessionKey: sessionKey$.getValue()
  })),
  switchMap((context) => from(container.resolve(SodiumClient).encryptPassword(context.encryptionKey!, context.password)).pipe(
    map((data) => ({ ...context, data }))
  )),
  switchMap((context) => from(getAdministrationApi().createKey({
    password: {
      value: context.data.value,
      tags: context.data.tags
    }
  }, {
    headers: {
      [SESSION_TOKEN_HEADER_NAME]: context.sessionKey
    }
  })).pipe(
    map((response: ServiceCreateKeyResponse) => ({ ...context, identifier: response.identifier! }))
  )),
  tap((context) => {
    setUserKeysProgress$.next(success([{
      identifier: context.identifier,
      value: context.password.value,
      tags: context.password.tags
    }, ...userKeys$.getValue()]))
    closeEditor$.next()
    createUserKeyHook$.next(context.identifier)
  }),
  catchError((error) => of(error).pipe(tap((error) => {
    setUserKeysProgress$.next(success(userKeys$.getValue()))
    showToast$.next({ message: stringify(error) })
  }))),
  takeUntil(unableToOperateOnKeys$)
))).subscribe()

export const deleteUserKey$ = new Subject<string>()
deleteUserKey$.pipe(switchMap((identifier) => of({ identifier }).pipe(
  tap(() => {
    setUserKeysProgress$.next(indicator(UserKeysProgressState.WORKING, data(userKeysProgress$.getValue(), [])))
  }),
  map(({ identifier }) => ({ identifier, sessionKey: sessionKey$.getValue() })),
  switchMap((context) => from(getAdministrationApi().deleteKey({
    identifier: context.identifier
  }, {
    headers: {
      [SESSION_TOKEN_HEADER_NAME]: context.sessionKey
    }
  })).pipe(
    map((response: ServiceDeleteKeyResponse) => ({ ...context, response }))
  )),
  tap((context) => {
    setUserKeysProgress$.next(success(userKeys$.getValue().filter(({ identifier }) => identifier !== context.identifier)))
    closeEditor$.next()
  }),
  catchError((error) => of(error).pipe(tap((error) => {
    setUserKeysProgress$.next(success(userKeys$.getValue()))
    showToast$.next({ message: stringify(error) })
  }))),
  takeUntil(unableToOperateOnKeys$)
))).subscribe()

export const updateUserKey$ = new Subject<Key>()
updateUserKey$.pipe(switchMap((key) => of({ key }).pipe(
  tap(() => {
    setUserKeysProgress$.next(indicator(UserKeysProgressState.WORKING, data(userKeysProgress$.getValue(), [])))
  }),
  map(({ key }) => ({
    key,
    encryptionKey: encryptionKey$.getValue(),
    sessionKey: sessionKey$.getValue()
  })),
  switchMap((context) => from(container.resolve(SodiumClient).encryptPassword(context.encryptionKey!, context.key)).pipe(
    map((data) => ({ ...context, data }))
  )),
  switchMap((context) => from(getAdministrationApi().updateKey({
    key: {
      identifier: context.key.identifier,
      password: {
        value: context.data.value,
        tags: context.data.tags
      }
    }
  }, {
    headers: {
      [SESSION_TOKEN_HEADER_NAME]: context.sessionKey
    }
  })).pipe(
    map((response: ServiceUpdateKeyResponse) => ({ ...context, response }))
  )),
  tap((context) => {
    setUserKeysProgress$.next(success(userKeys$.getValue().map((key) => {
      if (key.identifier === context.key.identifier) {
        return context.key
      } else {
        return key
      }
    })))
    closeEditor$.next()
  }),
  catchError((error) => of(error).pipe(tap((error) => {
    setUserKeysProgress$.next(success(userKeys$.getValue()))
    showToast$.next({ message: stringify(error) })
  }))),
  takeUntil(unableToOperateOnKeys$)
))).subscribe()

export const Mutations: MutationTree<UserState> = {
  [MutationType.SET_IS_AUTHENTICATED] (state, value: boolean) {
    state.isAuthenticated = value
  },
  [MutationType.SET_PARAMETRIZATION] (state, value: string | null) {
    state.parametrization = value
  },
  [MutationType.SET_SESSION_KEY] (state, value: string | null) {
    state.sessionKey = value
  },
  [MutationType.SET_ENCRYPTION_KEY] (state, value: string | null) {
    state.encryptionKey = value
  },
  [MutationType.SET_USER_KEYS_PROGRESS] (state, value: UserKeysProgress) {
    state.userKeysProgress = value
  },
  [MutationType.SET_REQUIRES_MAIL_VERIFICATION] (state, value: boolean) {
    state.requiresMailVerification = value
  }
}
