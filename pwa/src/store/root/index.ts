import { createMutation, createGetter } from '../state_rx'
import {
  RootState,
  RegistrationProgress,
  RegistrationProgressState,
  AuthenticationViaApiProgress,
  AuthenticationViaApiProgressState,
  AuthenticationViaDepotProgress,
  AuthenticationViaDepotProgressState,
  AuthenticationViaDepotProgressError,
  Key
} from '../state'
import { MutationTree } from 'vuex'
import { Subject, of, from, asapScheduler, forkJoin } from 'rxjs'
import { ResettableAction, ResettableActionType, act } from '../resettable_action'
import { switchMap, tap, catchError, map, skip, takeUntil, filter, defaultIfEmpty } from 'rxjs/operators'
import { indicator, FlowProgressBasicState, exception, failure, success, stringify } from '../flow'
import { container } from 'tsyringe'
import { SodiumClient } from '@/sodium_client'
import {
  ServiceRegisterResponse,
  ServiceRegisterResponseError,
  ServiceGetSaltResponse,
  ServiceGetSaltResponseError,
  ServiceLogInResponse,
  ServiceLogInResponseError,
  ServiceIdentifiedKey
} from '@/api/definitions'
import { getAuthenticationApi } from '@/api/api_di'
import {
  setParametrization$,
  setEncryptionKey$,
  setSessionKey$,
  setRequiresMailVerification$,
  setIsAuthenticated$,
  setUserKeys$,
  isAuthenticated$, logOut$
} from './modules/user'
import { setSessionUsername$ } from './modules/session'
import { depotEssence$, depotBit$, setUpDepot$ } from './modules/depot'
import { showToast$ } from './modules/interface/toast'
import { Router } from '@/router'

export const registrationProgress$ = createGetter<RegistrationProgress>((state) => state.registrationProgress)
export const authenticationViaApiProgress$ = createGetter<AuthenticationViaApiProgress>((state) => state.authenticationViaApi)
export const authenticationViaDepotProgress$ = createGetter<AuthenticationViaDepotProgress>((state) => state.authenticationViaDepot)

enum MutationType {
  SET_REGISTRATION_PROGRESS = 'setRegistrationProgress',
  SET_AUTHENTICATION_VIA_API_PROGRESS = 'setAuthenticationViaApiProgress',
  SET_AUTHENTICATION_VIA_DEPOT_PROGRESS = 'setAuthenticationViaDepotProgress',
}

const setRegistrationProgress$ = createMutation<RegistrationProgress>(null, MutationType.SET_REGISTRATION_PROGRESS)
const setAuthenticationViaApiProgress$ = createMutation<AuthenticationViaApiProgress>(null, MutationType.SET_AUTHENTICATION_VIA_API_PROGRESS)
const setAuthenticationViaDepotProgress$ = createMutation<AuthenticationViaDepotProgress>(null, MutationType.SET_AUTHENTICATION_VIA_DEPOT_PROGRESS)

export interface RegisterPayload {
  username: string;
  password: string;
  mail: string;
}
export const register$ = new Subject<ResettableAction<RegisterPayload>>()
register$.pipe(switchMap((action) => {
  switch (action.type) {
    case ResettableActionType.ACT:
      depotBit$.next(false)
      return of(action).pipe(
        tap(() => {
          setRegistrationProgress$.next(indicator(RegistrationProgressState.GENERATING_PARAMETRIZATION, undefined))
        }),
        switchMap((action) => from(container.resolve(SodiumClient).generateArgon2Parametrization()).pipe(
          map((parametrization) => ({ action, parametrization }))
        )),
        tap(() => {
          setRegistrationProgress$.next(indicator(RegistrationProgressState.COMPUTING_MASTER_KEY_DERIVATIVES, undefined))
        }),
        switchMap((context) => from(container.resolve(SodiumClient).computeAuthDigestAndEncryptionKey(
          context.parametrization, context.action.password)).pipe(
          map(({ authDigest, encryptionKey }) => ({ ...context, authDigest, encryptionKey }))
        )),
        tap(() => {
          setRegistrationProgress$.next(indicator(RegistrationProgressState.MAKING_REQUEST, undefined))
        }),
        switchMap((context) => from(getAuthenticationApi().register({
          username: context.action.username,
          salt: context.parametrization,
          digest: context.authDigest,
          mail: context.action.mail
        })).pipe(
          map((response: ServiceRegisterResponse) => ({ ...context, response }))
        )),
        tap((context) => {
          switch (context.response.error) {
            case ServiceRegisterResponseError.NONE:
              setRegistrationProgress$.next(success(undefined))
              setIsAuthenticated$.next(true)
              setSessionUsername$.next(context.action.username)
              setParametrization$.next(context.parametrization)
              setEncryptionKey$.next(context.encryptionKey)
              setSessionKey$.next(context.response.sessionKey!)
              setUserKeys$.next([])
              setRequiresMailVerification$.next(true)
              Router.push('/mail-verification')
              break
            default:
              setRegistrationProgress$.next(failure(context.response.error!))
              break
          }
        }),
        catchError((error) => of(error).pipe(tap((error) => {
          setRegistrationProgress$.next(exception(stringify(error)))
          showToast$.next({ message: stringify(error) })
        })))
      )
    case ResettableActionType.RESET:
      return of(action).pipe(
        tap(() => { setRegistrationProgress$.next(indicator(FlowProgressBasicState.IDLE, undefined)) })
      )
  }
})).subscribe()

export interface LogInViaApiPayload {
  username: string;
  password: string;
  inBackground: boolean;
}
export const logInViaApi$ = new Subject<ResettableAction<LogInViaApiPayload>>()
logInViaApi$.pipe(switchMap((action) => {
  switch (action.type) {
    case ResettableActionType.ACT:
      return of(action).pipe(
        tap(() => {
          setAuthenticationViaApiProgress$.next(indicator(AuthenticationViaApiProgressState.RETRIEVING_PARAMETRIZATION, undefined))
        }),
        switchMap((action) => from(getAuthenticationApi().getSalt(action.username)).pipe(
          map((response: ServiceGetSaltResponse) => ({ action, getSaltResponse: response }))
        )),
        switchMap((context) => {
          switch (context.getSaltResponse.error) {
            case ServiceGetSaltResponseError.NONE:
              return of(context).pipe(
                tap(() => {
                  setAuthenticationViaApiProgress$.next(
                    indicator(AuthenticationViaApiProgressState.COMPUTING_MASTER_KEY_DERIVATIVES, undefined))
                }),
                switchMap((context) => from(container.resolve(SodiumClient).computeAuthDigestAndEncryptionKey(
                  context.getSaltResponse.salt!, context.action.password)).pipe(
                  map(({ authDigest, encryptionKey }) => ({ ...context, authDigest, encryptionKey }))
                )),
                tap(() => {
                  setAuthenticationViaApiProgress$.next(indicator(AuthenticationViaApiProgressState.MAKING_REQUEST, undefined))
                }),
                switchMap((context) => from(getAuthenticationApi().logIn({ username: context.action.username, digest: context.authDigest })).pipe(
                  map((response: ServiceLogInResponse) => ({ ...context, logInResponse: response }))
                )),
                switchMap((context) => {
                  switch (context.logInResponse.error) {
                    case ServiceLogInResponseError.NONE:
                      return of(context).pipe(
                        tap(() => {
                          setAuthenticationViaApiProgress$.next(indicator(AuthenticationViaApiProgressState.DECRYPTING_DATA, undefined))
                        }),
                        switchMap((context) => forkJoin(context.logInResponse.payload!.keySet!.items!.map(
                          async (item: ServiceIdentifiedKey): Promise<Key> => ({
                            identifier: item.identifier!,
                            ...(await container.resolve(SodiumClient).decryptPassword(context.encryptionKey, {
                              value: item.password!.value!,
                              tags: item.password!.tags!
                            }))
                          })
                        )).pipe(
                          defaultIfEmpty([] as Array<Key>),
                          map((data) => ({ ...context, data }))
                        )),
                        tap((context) => {
                          setAuthenticationViaApiProgress$.next(success(undefined))
                          setIsAuthenticated$.next(true)
                          setSessionUsername$.next(context.action.username)
                          setParametrization$.next(context.getSaltResponse.salt!)
                          setEncryptionKey$.next(context.encryptionKey)
                          setSessionKey$.next(context.logInResponse.payload!.sessionKey!)
                          setUserKeys$.next(context.data)
                          setRequiresMailVerification$.next(context.logInResponse.payload!.requiresMailVerification!)
                          setUpDepot$.next(context.action.password)
                          if (context.logInResponse.payload!.requiresMailVerification!) {
                            Router.push('/mail-verification')
                          } else if (!context.action.inBackground) {
                            Router.push('/dashboard')
                          }
                        })
                      )
                    default:
                      return of(context).pipe(tap((context) => {
                        setAuthenticationViaApiProgress$.next(failure(context.logInResponse.error!))
                        if (action.inBackground && context.logInResponse.error! === ServiceLogInResponseError.INVALIDCREDENTIALS) {
                          depotBit$.next(false)
                          logOut$.next()
                        }
                      }))
                  }
                })
              )
            default:
              return of({ error: context.getSaltResponse.error! }).pipe(
                tap(({ error }) => {
                  setAuthenticationViaApiProgress$.next(failure(error))
                })
              )
          }
        }),
        catchError((error) => of({ error, action }).pipe(tap(({ error, action }) => {
          setAuthenticationViaApiProgress$.next(exception(stringify(error)))
          if (!action.inBackground) {
            showToast$.next({ message: stringify(error) })
          }
        }))),
        takeUntil(isAuthenticated$.pipe(
          skip(1),
          filter((isAuthenticated) => !isAuthenticated),
          tap(() => {
            setAuthenticationViaApiProgress$.next(indicator(FlowProgressBasicState.IDLE, undefined))
          })
        ))
      )
    case ResettableActionType.RESET:
      return of(action).pipe(tap(() => {
        setAuthenticationViaApiProgress$.next(indicator(FlowProgressBasicState.IDLE, undefined))
      }))
  }
})).subscribe()

export interface LogInViaDepotPayload {
  username: string;
  password: string;
}
export const logInViaDepot$ = new Subject<ResettableAction<LogInViaDepotPayload>>()
logInViaDepot$.pipe(switchMap((action) => {
  switch (action.type) {
    case ResettableActionType.ACT:
      return of({ action, depot: depotEssence$.getValue() }).pipe(
        switchMap((context) => {
          if (context.action.username === context.depot.username) {
            return of(context).pipe(
              tap(() => {
                setAuthenticationViaDepotProgress$.next(indicator(AuthenticationViaDepotProgressState.COMPUTING_MASTER_KEY_DERIVATIVES, undefined))
              }),
              switchMap((context) => from(container.resolve(SodiumClient).computeAuthDigestAndEncryptionKey(
                context.depot.parametrization!, context.action.password)).pipe(
                map(({ authDigest, encryptionKey }) => ({ ...context, authDigest, encryptionKey }))
              )),
              switchMap((context) => {
                if (context.authDigest === context.depot.authDigest) {
                  return of(context).pipe(
                    tap(() => {
                      setAuthenticationViaDepotProgress$.next(indicator(AuthenticationViaDepotProgressState.DECRYPTING_DATA, undefined))
                    }),
                    switchMap((context) => from(container.resolve(SodiumClient).decryptMessage(context.encryptionKey, context.depot.userKeys!)).pipe(
                      map((value) => ({ ...context, userKeys: JSON.parse(value) as Array<Key> }))
                    )),
                    tap((context) => {
                      setAuthenticationViaDepotProgress$.next(success(undefined))
                      setIsAuthenticated$.next(true)
                      setSessionUsername$.next(context.action.username)
                      setUserKeys$.next(context.userKeys)
                      setUpDepot$.next(context.action.password)
                      asapScheduler.schedule(() => {
                        logInViaApi$.next(act({
                          username: context.action.username,
                          password: context.action.password,
                          inBackground: true
                        }))
                      })
                      Router.push('/dashboard')
                    })
                  )
                } else {
                  return of(context).pipe(tap(() => {
                    setAuthenticationViaDepotProgress$.next(failure(AuthenticationViaDepotProgressError.INVALID_CREDENTIALS))
                    showToast$.next({ message: 'Changed the password recently? Toggle \'Remember me\' twice.' })
                  }))
                }
              })
            )
          } else {
            return of(context).pipe(tap(() => {
              setAuthenticationViaDepotProgress$.next(failure(AuthenticationViaDepotProgressError.INVALID_CREDENTIALS))
            }))
          }
        })
      )
    case ResettableActionType.RESET:
      return of(action).pipe(tap(() => {
        setAuthenticationViaDepotProgress$.next(indicator(FlowProgressBasicState.IDLE, undefined))
      }))
  }
})).subscribe()

export const Mutations: MutationTree<RootState> = {
  [MutationType.SET_REGISTRATION_PROGRESS] (state, value) {
    state.registrationProgress = value
  },
  [MutationType.SET_AUTHENTICATION_VIA_API_PROGRESS] (state, value) {
    state.authenticationViaApi = value
  },
  [MutationType.SET_AUTHENTICATION_VIA_DEPOT_PROGRESS] (state, value) {
    state.authenticationViaDepot = value
  }
}
