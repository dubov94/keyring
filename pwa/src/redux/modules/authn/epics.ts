import { RootAction, RootState } from '@/redux/conjunction'
import { exception, failure, FlowProgressBasicState, indicator, stringify, success } from '@/store/flow'
import { depotBit$ } from '@/store/root/modules/depot'
import { RegistrationProgressState } from '@/store/state'
import { concat, EMPTY, from, of } from 'rxjs'
import { catchError, filter, switchMap } from 'rxjs/operators'
import { isActionOf } from 'typesafe-actions'
import { register, setRegistrationProgress } from './actions'
import {
  ServiceRegisterResponse,
  ServiceRegisterResponseError
} from '@/api/definitions'
import { setEncryptionKey$, setIsAuthenticated$, setParametrization$, setRequiresMailVerification$, setSessionKey$, setUserKeys$ } from '@/store/root/modules/user'
import { getRedux } from '@/redux/store_di'
import { Router } from '@/router'
import { setUsername } from '../session/actions'
import { showToast$ } from '@/store/root/modules/interface/toast'
import { getSodiumClient } from '@/sodium_client'
import { getAuthenticationApi } from '@/api/api_di'
import { Epic } from 'redux-observable'

export const registerEpic: Epic<RootAction, RootAction, RootState> = (action$) => action$.pipe(
  filter(isActionOf([register.act, register.reset])),
  switchMap((action) => {
    if (isActionOf(register.act, action)) {
      depotBit$.next(false)
      return concat(
        of(setRegistrationProgress(indicator(RegistrationProgressState.GENERATING_PARAMETRIZATION, undefined))),
        from(getSodiumClient().generateArgon2Parametrization()).pipe(
          switchMap((parametrization) => concat(
            of(setRegistrationProgress(indicator(RegistrationProgressState.COMPUTING_MASTER_KEY_DERIVATIVES, undefined))),
            from(getSodiumClient().computeAuthDigestAndEncryptionKey(parametrization, action.payload.password)).pipe(
              switchMap(({ authDigest, encryptionKey }) => concat(
                of(setRegistrationProgress(indicator(RegistrationProgressState.MAKING_REQUEST, undefined))),
                from(getAuthenticationApi().register({
                  username: action.payload.username,
                  salt: parametrization,
                  digest: authDigest,
                  mail: action.payload.mail
                })).pipe(
                  switchMap((response: ServiceRegisterResponse) => {
                    switch (response.error) {
                      case ServiceRegisterResponseError.NONE:
                        return concat(
                          of(setRegistrationProgress(success(undefined))),
                          of({}).pipe(switchMap(() => {
                            setIsAuthenticated$.next(true)
                            getRedux().dispatch(setUsername(action.payload.username))
                            setParametrization$.next(parametrization)
                            setEncryptionKey$.next(encryptionKey)
                            setSessionKey$.next(response.sessionKey!)
                            setUserKeys$.next([])
                            setRequiresMailVerification$.next(true)
                            Router.push('/mail-verification')
                            return EMPTY
                          }))
                        )
                      default:
                        return of(setRegistrationProgress(failure(response.error!)))
                    }
                  })
                )
              ))
            )
          ))
        )
      ).pipe(
        catchError((error) => concat(
          of(setRegistrationProgress(exception(stringify(error)))),
          of({}).pipe(switchMap(() => {
            showToast$.next({ message: stringify(error) })
            return EMPTY
          }))
        ))
      )
    } else {
      return of(setRegistrationProgress(indicator(FlowProgressBasicState.IDLE, undefined)))
    }
  })
)
