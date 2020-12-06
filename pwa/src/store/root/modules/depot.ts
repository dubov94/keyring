import { Module } from 'vuex'
import { DepotState, RootState, constructInitialDepotState, getDepotEssense, DepotEssence } from '@/store/state'
import { createGetter, createMutation } from '@/store/state_rx'
import { Subject, of, combineLatest, from, BehaviorSubject, EMPTY } from 'rxjs'
import { switchMap, map, tap, filter, takeUntil, skip, takeWhile, distinctUntilChanged } from 'rxjs/operators'
import { userKeys$, isAuthenticated$ } from './user'
import { SodiumClient } from '@/sodium_client'
import { container } from 'tsyringe'
import { getSessionUsername } from '@/redux/modules/session/selectors'
import { apply } from '@/redux/selectors'

export const depotUsername$ = createGetter<string | null>((state) => state.depot.username)
export const depotEssence$ = createGetter<DepotEssence>((state) => getDepotEssense(state.depot))
const encryptionKey$ = createGetter<string | null>((state) => state.depot.encryptionKey)

enum MutationType {
  SET_USERNAME = 'setUsername',
  SET_PARAMETRIZATION = 'setParametrization',
  SET_AUTH_DIGEST = 'setAuthDigest',
  SET_ENCRYPTION_KEY = 'setEncryptionKey',
  SET_USER_KEYS = 'setUserKeys',
}

const NAMESPACE = ['depot']

const setUsername$ = createMutation<string | null>(NAMESPACE, MutationType.SET_USERNAME)
const setParametrization$ = createMutation<string | null>(NAMESPACE, MutationType.SET_PARAMETRIZATION)
const setAuthDigest$ = createMutation<string | null>(NAMESPACE, MutationType.SET_AUTH_DIGEST)
const setEncryptionKey$ = createMutation<string | null>(NAMESPACE, MutationType.SET_ENCRYPTION_KEY)
const setUserKeys$ = createMutation<string | null>(NAMESPACE, MutationType.SET_USER_KEYS)

export const depotBit$ = new BehaviorSubject<boolean>(false)

depotBit$.pipe(
  skip(1),
  filter((on) => !on),
  tap(() => {
    setUsername$.next(null)
    setParametrization$.next(null)
    setAuthDigest$.next(null)
    setEncryptionKey$.next(null)
    setUserKeys$.next(null)
  })
).subscribe()

const isEnabled$ = combineLatest([depotBit$, isAuthenticated$]).pipe(
  skip(1),
  map(([on, isAuthenticated]) => on && isAuthenticated),
  distinctUntilChanged()
)

export const setUpDepot$ = new Subject<string>()
setUpDepot$.pipe(switchMap((masterKey) => of({ masterKey }).pipe(
  takeWhile(() => depotBit$.getValue()),
  switchMap((context) => from(container.resolve(SodiumClient).generateArgon2Parametrization()).pipe(
    map((parametrization) => ({ ...context, parametrization }))
  )),
  switchMap((context) => from(container.resolve(SodiumClient).computeAuthDigestAndEncryptionKey(
    context.parametrization, context.masterKey)).pipe(
    map(({ authDigest, encryptionKey }) => ({ ...context, authDigest, encryptionKey }))
  )),
  tap((context) => {
    setParametrization$.next(context.parametrization)
    setAuthDigest$.next(context.authDigest)
    setEncryptionKey$.next(context.encryptionKey)
  }),
  takeUntil(isEnabled$.pipe(filter((isEnabled) => !isEnabled)))
))).subscribe()

isEnabled$.pipe(
  switchMap((isEnabled) => isEnabled ? apply(getSessionUsername).pipe(
    tap((username) => { setUsername$.next(username) })
  ) : EMPTY)
).subscribe()

combineLatest([encryptionKey$, userKeys$]).pipe(
  skip(1),
  map(([encryptionKey, userKeys]) => ({ encryptionKey, userKeys })),
  switchMap((context) => context.encryptionKey !== null ? of(context).pipe(
    switchMap((context) => from(container.resolve(SodiumClient).encryptMessage(
      context.encryptionKey!, JSON.stringify(context.userKeys))).pipe(
      map((vault) => ({ ...context, vault }))
    )),
    tap((context) => {
      setUserKeys$.next(context.vault)
    })
  ) : of(context).pipe(
    tap(() => {
      setUserKeys$.next(null)
    })
  ))
).subscribe()

export const Depot: Module<DepotState, RootState> = {
  namespaced: true,
  state: constructInitialDepotState,
  mutations: {
    [MutationType.SET_USERNAME] (state, value: string | null) {
      state.username = value
    },
    [MutationType.SET_PARAMETRIZATION] (state, value: string | null) {
      state.parametrization = value
    },
    [MutationType.SET_AUTH_DIGEST] (state, value: string | null) {
      state.authDigest = value
    },
    [MutationType.SET_ENCRYPTION_KEY] (state, value: string | null) {
      state.encryptionKey = value
    },
    [MutationType.SET_USER_KEYS] (state, value: string | null) {
      state.userKeys = value
    }
  }
}
