import { RootAction } from '@/redux/root_action'
import { RootState } from '@/redux/root_reducer'
import { concat, EMPTY, forkJoin, from, Observable, of } from 'rxjs'
import { catchError, concatMap, defaultIfEmpty, filter, map, switchMap, withLatestFrom } from 'rxjs/operators'
import { isActionOf, PayloadAction, TypeConstant } from 'typesafe-actions'
import {
  RegistrationFlowIndicator,
  register,
  registrationReset,
  registrationSignal,
  logInViaApi,
  authnViaApiReset,
  authnViaApiSignal,
  AuthnViaApiFlowIndicator,
  logInViaDepot,
  authnViaDepotReset,
  authnViaDepotSignal,
  AuthnViaDepotFlowIndicator,
  AuthnViaDepotFlowError,
  initiateBackgroundAuthn,
  AuthnViaApiSignal,
  backgroundAuthnSignal
} from './actions'
import {
  ServiceRegisterResponse,
  ServiceRegisterResponseError,
  ServiceGetSaltResponse,
  ServiceGetSaltResponseError,
  ServiceLogInResponse,
  ServiceLogInResponseError,
  ServiceIdentifiedKey
} from '@/api/definitions'
import { getSodiumClient } from '@/sodium_client'
import { getAuthenticationApi } from '@/api/api_di'
import { Epic } from 'redux-observable'
import { cancel, exception, failure, indicator, isSignalFailure, errorToMessage, success } from '@/redux/flow_signal'
import { Key } from '@/redux/entities'
import { createDisplayExceptionsEpic } from '@/redux/exceptions'
import { DeepReadonly } from 'ts-essentials'
import { remoteCredentialsMismatchLocal } from '../user/account/actions'

export const registrationEpic: Epic<RootAction, RootAction, RootState> = (action$) => action$.pipe(
  filter(isActionOf([register, registrationReset])),
  switchMap((action) => {
    if (isActionOf(register, action)) {
      return concat(
        of(registrationSignal(indicator(RegistrationFlowIndicator.GENERATING_PARAMETRIZATION))),
        from(getSodiumClient().generateArgon2Parametrization()).pipe(
          switchMap((parametrization) => concat(
            of(registrationSignal(indicator(RegistrationFlowIndicator.COMPUTING_MASTER_KEY_DERIVATIVES))),
            from(getSodiumClient().computeAuthDigestAndEncryptionKey(parametrization, action.payload.password)).pipe(
              switchMap(({ authDigest, encryptionKey }) => concat(
                of(registrationSignal(indicator(RegistrationFlowIndicator.MAKING_REQUEST))),
                from(getAuthenticationApi().register({
                  username: action.payload.username,
                  salt: parametrization,
                  digest: authDigest,
                  mail: action.payload.mail
                })).pipe(
                  switchMap((response: ServiceRegisterResponse) => {
                    switch (response.error) {
                      case ServiceRegisterResponseError.NONE:
                        return of(registrationSignal(success({
                          username: action.payload.username,
                          parametrization,
                          encryptionKey,
                          sessionKey: response.sessionKey!
                        })))
                      default:
                        return of(registrationSignal(failure(response.error!)))
                    }
                  })
                )
              ))
            )
          ))
        )
      ).pipe(
        catchError((error) => of(registrationSignal(exception(errorToMessage(error)))))
      )
    } else if (isActionOf(registrationReset, action)) {
      return of(registrationSignal(cancel()))
    }
    return EMPTY
  })
)

export const displayRegistrationExceptionsEpic = createDisplayExceptionsEpic(registrationSignal)

const apiAuthn = <T extends TypeConstant>(
  { username, password }: { username: string; password: string },
  signalCreator: (payload: DeepReadonly<AuthnViaApiSignal>) => PayloadAction<T, DeepReadonly<AuthnViaApiSignal>> & RootAction
): Observable<RootAction> => {
  return concat(
    of(signalCreator(indicator(AuthnViaApiFlowIndicator.RETRIEVING_PARAMETRIZATION))),
    from(getAuthenticationApi().getSalt(username)).pipe(
      switchMap((getSaltResponse: ServiceGetSaltResponse) => {
        switch (getSaltResponse.error) {
          case ServiceGetSaltResponseError.NONE:
            return concat(
              of(signalCreator(indicator(AuthnViaApiFlowIndicator.COMPUTING_MASTER_KEY_DERIVATIVES))),
              from(getSodiumClient().computeAuthDigestAndEncryptionKey(getSaltResponse.salt!, password)).pipe(
                switchMap(({ authDigest, encryptionKey }) => concat(
                  of(signalCreator(indicator(AuthnViaApiFlowIndicator.MAKING_REQUEST))),
                  from(getAuthenticationApi().logIn({
                    username: username,
                    digest: authDigest
                  })).pipe(
                    switchMap((logInResponse: ServiceLogInResponse) => {
                      switch (logInResponse.error) {
                        case ServiceLogInResponseError.NONE:
                          return concat(
                            of(signalCreator(indicator(AuthnViaApiFlowIndicator.DECRYPTING_DATA))),
                            forkJoin(logInResponse.payload!.keySet!.items!.map(
                              async (item: ServiceIdentifiedKey): Promise<Key> => ({
                                identifier: item.identifier!,
                                ...(await getSodiumClient().decryptPassword(encryptionKey, {
                                  value: item.password!.value!,
                                  tags: item.password!.tags!
                                }))
                              })
                            )).pipe(
                              defaultIfEmpty(<Key[]>[]),
                              switchMap((userKeys) => of(signalCreator(success({
                                username,
                                password,
                                parametrization: getSaltResponse.salt!,
                                encryptionKey,
                                sessionKey: logInResponse.payload!.sessionKey!,
                                requiresMailVerification: logInResponse.payload!.requiresMailVerification!,
                                userKeys
                              }))))
                            )
                          )
                        default:
                          return of(signalCreator(failure(logInResponse.error!)))
                      }
                    })
                  )
                ))
              )
            )
          default:
            return of(signalCreator(failure(getSaltResponse.error!)))
        }
      })
    )
  ).pipe(
    catchError((error) => of(signalCreator(exception(errorToMessage(error)))))
  )
}

export const logInViaApiEpic: Epic<RootAction, RootAction, RootState> = (action$) => action$.pipe(
  filter(isActionOf([logInViaApi, authnViaApiReset])),
  switchMap((action) => {
    if (isActionOf(logInViaApi, action)) {
      return apiAuthn(action.payload, authnViaApiSignal)
    } else if (isActionOf(authnViaApiReset, action)) {
      return of(authnViaApiSignal(cancel()))
    }
    return EMPTY
  })
)

export const displayAuthnViaApiExceptionsEpic = createDisplayExceptionsEpic(authnViaApiSignal)

export const logInViaDepotEpic: Epic<RootAction, RootAction, RootState> = (action$, state$) => action$.pipe(
  filter(isActionOf([logInViaDepot, authnViaDepotReset])),
  withLatestFrom(state$),
  switchMap(([action, state]) => {
    if (isActionOf(logInViaDepot, action)) {
      if (action.payload.username === state.depot.username) {
        return concat(
          of(authnViaDepotSignal(indicator(AuthnViaDepotFlowIndicator.COMPUTING_MASTER_KEY_DERIVATIVES))),
          from(getSodiumClient().computeAuthDigestAndEncryptionKey(state.depot.salt!, action.payload.password)).pipe(
            switchMap(({ authDigest, encryptionKey }) => {
              if (authDigest === state.depot.hash) {
                return concat(
                  of(authnViaDepotSignal(indicator(AuthnViaDepotFlowIndicator.DECRYPTING_DATA))),
                  from(getSodiumClient().decryptMessage(encryptionKey, state.depot.vault!)).pipe(
                    switchMap((vault) => of(authnViaDepotSignal(success({
                      username: action.payload.username,
                      password: action.payload.password,
                      userKeys: <Key[]>JSON.parse(vault),
                      vaultKey: encryptionKey
                    }))))
                  )
                )
              } else {
                return of(authnViaDepotSignal(failure(AuthnViaDepotFlowError.INVALID_CREDENTIALS)))
              }
            })
          )
        )
      } else {
        return of(authnViaDepotSignal(failure(AuthnViaDepotFlowError.INVALID_CREDENTIALS)))
      }
    } else if (isActionOf(authnViaDepotReset, action)) {
      return of(authnViaDepotSignal(cancel()))
    }
    return EMPTY
  })
)

export const displayAuthnViaDepotExceptionsEpic = createDisplayExceptionsEpic(authnViaDepotSignal)

export const backgroundAuthnEpic: Epic<RootAction, RootAction, RootState> = (action$) => action$.pipe(
  filter(isActionOf(initiateBackgroundAuthn)),
  switchMap((action) => apiAuthn(action.payload, backgroundAuthnSignal))
)

export const remoteCredentialsMismatchLocalEpic: Epic<RootAction, RootAction, RootState> = (action$) => action$.pipe(
  filter(isActionOf(backgroundAuthnSignal)),
  map((action) => action.payload),
  filter(isSignalFailure),
  filter((signal) => signal.error.value === ServiceLogInResponseError.INVALIDCREDENTIALS),
  concatMap(() => of(remoteCredentialsMismatchLocal()))
)
