import { either, function as fn, option } from 'fp-ts'
import { Epic } from 'redux-observable'
import { concat, EMPTY, forkJoin, from, iif, Observable, of } from 'rxjs'
import { catchError, concatMap, defaultIfEmpty, filter, map, mapTo, switchMap, withLatestFrom } from 'rxjs/operators'
import { DeepReadonly, DeepPartial } from 'ts-essentials'
import { isActionOf, PayloadAction, TypeConstant } from 'typesafe-actions'
import { getAuthenticationApi } from '@/api/api_di'
import {
  ServiceRegisterResponse,
  ServiceRegisterResponseError,
  ServiceGetSaltResponse,
  ServiceGetSaltResponseError,
  ServiceLogInResponse,
  ServiceLogInResponseError,
  ServiceProvideOtpResponse,
  ServiceProvideOtpResponseError,
  ServiceUserData
} from '@/api/definitions'
import { getSodiumClient } from '@/cryptography/sodium_client'
import { Key } from '@/redux/domain'
import { createDisplayExceptionsEpic } from '@/redux/exceptions'
import {
  cancel,
  exception,
  failure,
  indicator,
  isSignalFailure,
  errorToMessage,
  success,
  isActionSuccess2,
  isActionSuccess,
  isSignalError
} from '@/redux/flow_signal'
import { isDepotActive } from '@/redux/modules/depot/selectors'
import { defaultMailVerification, localOtpTokenFailure, remoteCredentialsMismatchLocal } from '@/redux/modules/user/account/actions'
import { NIL_KEY_ID } from '@/redux/modules/user/keys/actions'
import { fromKeyProto } from '@/redux/modules/user/keys/converters'
import { RootAction } from '@/redux/root_action'
import { RootState } from '@/redux/root_reducer'
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
  backgroundRemoteAuthnSignal,
  remoteAuthnComplete,
  AuthnViaApiParams,
  authnOtpProvisionReset,
  authnOtpProvisionSignal,
  AuthnOtpProvisionSignal,
  provideOtp,
  AuthnOtpProvisionFlowIndicator,
  UserData,
  backgroundOtpProvisionSignal,
  backgroundAuthnError
} from './actions'

export const registrationEpic: Epic<RootAction, RootAction, RootState> = (action$) => action$.pipe(
  filter(isActionOf([register, registrationReset])),
  switchMap((action) => {
    if (isActionOf(register, action)) {
      return concat(
        of(registrationSignal(indicator(RegistrationFlowIndicator.GENERATING_PARAMETRIZATION))),
        from(getSodiumClient().generateNewParametrization()).pipe(
          switchMap((parametrization) => concat(
            of(registrationSignal(indicator(RegistrationFlowIndicator.COMPUTING_MASTER_KEY_DERIVATIVES))),
            from(getSodiumClient().computeAuthDigestAndEncryptionKey(parametrization, action.payload.password)).pipe(
              switchMap(({ authDigest, encryptionKey }) => concat(
                of(registrationSignal(indicator(RegistrationFlowIndicator.MAKING_REQUEST))),
                from(getAuthenticationApi().authenticationRegister({
                  username: action.payload.username,
                  salt: parametrization,
                  digest: authDigest,
                  mail: action.payload.mail,
                  captchaToken: action.payload.captchaToken
                })).pipe(
                  switchMap((response: ServiceRegisterResponse) => {
                    switch (response.error) {
                      case ServiceRegisterResponseError.NONE:
                        return of(registrationSignal(success({
                          username: action.payload.username,
                          parametrization,
                          encryptionKey,
                          sessionKey: response.sessionKey!,
                          mailTokenId: response.mailTokenId!
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

const decodeUserData = (encryptionKey: string, userData: ServiceUserData): Observable<UserData> => {
  return forkJoin(userData.userKeys!.map(
    fromKeyProto(encryptionKey)
  )).pipe(
    defaultIfEmpty(<Key[]>[]),
    switchMap((userKeys) => {
      const mv = userData.mailVerification
      return of({
        sessionKey: userData.sessionKey!,
        featurePrompts: userData.featurePrompts!,
        mailVerification: mv ? {
          required: mv.required!,
          tokenId: mv.tokenId!
        } : defaultMailVerification(),
        mail: userData.mail || null,
        userKeys
      })
    })
  )
}

const apiAuthn = <T extends TypeConstant>(
  signalCreator: (payload: DeepReadonly<AuthnViaApiSignal>) => PayloadAction<T, DeepReadonly<AuthnViaApiSignal>> & RootAction,
  { username, password }: { username: string; password: string }
): Observable<RootAction> => {
  return concat(
    of(signalCreator(indicator(AuthnViaApiFlowIndicator.RETRIEVING_PARAMETRIZATION))),
    from(getAuthenticationApi().authenticationGetSalt(username)).pipe(
      switchMap((getSaltResponse: ServiceGetSaltResponse) => {
        switch (getSaltResponse.error) {
          case ServiceGetSaltResponseError.NONE:
            return concat(
              of(signalCreator(indicator(AuthnViaApiFlowIndicator.COMPUTING_MASTER_KEY_DERIVATIVES))),
              from(getSodiumClient().computeAuthDigestAndEncryptionKey(getSaltResponse.salt!, password)).pipe(
                switchMap(({ authDigest, encryptionKey }) => concat(
                  of(signalCreator(indicator(AuthnViaApiFlowIndicator.MAKING_REQUEST))),
                  from(getAuthenticationApi().authenticationLogIn({
                    username: username,
                    digest: authDigest
                  })).pipe(
                    switchMap((logInResponse: ServiceLogInResponse) => {
                      switch (logInResponse.error) {
                        case ServiceLogInResponseError.NONE: {
                          const params: AuthnViaApiParams = {
                            username,
                            password,
                            parametrization: getSaltResponse.salt!,
                            encryptionKey
                          }
                          if (logInResponse.userData === null) {
                            return of(signalCreator(success({
                              ...params,
                              content: either.left({
                                authnKey: logInResponse.otpContext!.authnKey!,
                                attemptsLeft: logInResponse.otpContext!.attemptsLeft!
                              })
                            })))
                          }
                          return concat(
                            of(signalCreator(indicator(AuthnViaApiFlowIndicator.DECRYPTING_DATA))),
                            decodeUserData(encryptionKey, logInResponse.userData!).pipe(
                              switchMap((userData) => of(signalCreator(success({
                                ...params,
                                content: either.right(userData)
                              }))))
                            )
                          )
                        }
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
      return apiAuthn(authnViaApiSignal, action.payload)
    } else if (isActionOf(authnViaApiReset, action)) {
      return of(authnViaApiSignal(cancel()))
    }
    return EMPTY
  })
)

export const displayAuthnViaApiExceptionsEpic = createDisplayExceptionsEpic(authnViaApiSignal)

const otpProvision = <T extends TypeConstant>(
  { credentialParams, authnKey, otp, yieldTrustedToken }: {
    credentialParams: AuthnViaApiParams;
    authnKey: string;
    otp: string;
    yieldTrustedToken: boolean;
  },
  signalCreator: (payload: DeepReadonly<AuthnOtpProvisionSignal>) => PayloadAction<T, DeepReadonly<AuthnOtpProvisionSignal>> & RootAction
): Observable<RootAction> => {
  return concat(
    of(signalCreator(indicator(AuthnOtpProvisionFlowIndicator.MAKING_REQUEST))),
    from(getAuthenticationApi().authenticationProvideOtp({ authnKey, otp, yieldTrustedToken })).pipe(
      switchMap((response: ServiceProvideOtpResponse) => {
        switch (response.error) {
          case ServiceProvideOtpResponseError.NONE:
            return concat(
              of(signalCreator(indicator(AuthnOtpProvisionFlowIndicator.DECRYPTING_DATA))),
              decodeUserData(credentialParams.encryptionKey, response.userData!).pipe(
                switchMap((userData) => of(signalCreator(success({
                  credentialParams,
                  trustedToken: option.fromNullable(response.trustedToken),
                  userData
                }))))
              )
            )
          default:
            return of(signalCreator(failure({
              error: response.error!,
              attemptsLeft: response.attemptsLeft!
            })))
        }
      })
    )
  ).pipe(
    catchError((error) => of(signalCreator(exception(errorToMessage(error)))))
  )
}

export const provideOtpEpic: Epic<RootAction, RootAction, RootState> = (action$) => action$.pipe(
  filter(isActionOf([provideOtp, authnOtpProvisionReset])),
  switchMap((action) => {
    if (isActionOf(provideOtp, action)) {
      return otpProvision(action.payload, authnOtpProvisionSignal)
    } else if (isActionOf(authnOtpProvisionReset, action)) {
      return of(authnOtpProvisionSignal(cancel()))
    }
    return EMPTY
  })
)

export const displayAuthnOtpProvisionExceptionsEpic = createDisplayExceptionsEpic(authnOtpProvisionSignal)

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
                  forkJoin([
                    getSodiumClient().decryptMessage(encryptionKey, state.depot.vault!),
                    iif<null, string>(
                      () => state.depot.encryptedOtpToken === null,
                      Promise.resolve((null)),
                      getSodiumClient().decryptMessage(encryptionKey, state.depot.encryptedOtpToken)
                    )
                  ]).pipe(
                    switchMap(([vault, otpToken]) => of(authnViaDepotSignal(success({
                      username: action.payload.username,
                      password: action.payload.password,
                      userKeys: (<DeepPartial<Key>[]>JSON.parse(vault)).map((keyPartial): Key => ({
                        identifier: keyPartial.identifier!,
                        value: keyPartial.value!,
                        tags: keyPartial.tags!,
                        attrs: {
                          isShadow: keyPartial.attrs?.isShadow || false,
                          parent: keyPartial.attrs?.parent || NIL_KEY_ID
                        },
                        creationTimeInMillis: keyPartial.creationTimeInMillis || 0
                      })),
                      depotKey: encryptionKey,
                      otpToken: otpToken
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

export const backgroundRemoteAuthnEpic: Epic<RootAction, RootAction, RootState> = (action$) => action$.pipe(
  filter(isActionOf(initiateBackgroundAuthn)),
  switchMap((action) => apiAuthn(backgroundRemoteAuthnSignal, action.payload))
)

export const backgroundOtpProvisionEpic: Epic<RootAction, RootAction, RootState> = (action$, state$) => action$.pipe(
  filter(isActionSuccess(backgroundRemoteAuthnSignal)),
  withLatestFrom(state$),
  switchMap(([action, state]) => {
    const { data } = action.payload
    return fn.pipe(
      option.getLeft(data.content),
      option.chain((otpContext) => fn.pipe(
        option.fromNullable(state.depot.depotKey),
        option.map((depotKey) => fn.pipe(
          option.fromNullable(state.depot.encryptedOtpToken),
          option.map((encryptedOtpToken) => from(
            getSodiumClient().decryptMessage(depotKey, encryptedOtpToken)
          ).pipe(
            switchMap((otpToken) => otpProvision({
              credentialParams: {
                username: data.username,
                password: data.password,
                parametrization: data.parametrization,
                encryptionKey: data.encryptionKey
              },
              authnKey: otpContext.authnKey,
              otp: otpToken,
              yieldTrustedToken: isDepotActive(state)
            }, backgroundOtpProvisionSignal))
          )),
          option.getOrElse<Observable<RootAction>>(() => of(localOtpTokenFailure()))
        ))
      )),
      option.getOrElse<Observable<RootAction>>(() => EMPTY)
    )
  })
)

export const backgroundAuthnErrorEpic: Epic<RootAction, RootAction, RootState> = (action$) => action$.pipe(
  filter(isActionOf([backgroundRemoteAuthnSignal, backgroundOtpProvisionSignal])),
  switchMap((action) => {
    if (isSignalError(action.payload)) {
      return of(backgroundAuthnError())
    }
    return EMPTY
  })
)

export const remoteCredentialsMismatchLocalEpic: Epic<RootAction, RootAction, RootState> = (action$) => action$.pipe(
  filter(isActionOf(backgroundRemoteAuthnSignal)),
  map((action) => action.payload),
  filter(isSignalFailure),
  filter((signal) => signal.error.value === ServiceLogInResponseError.INVALIDCREDENTIALS),
  mapTo(remoteCredentialsMismatchLocal())
)

export const localOtpTokenFailureEpic: Epic<RootAction, RootAction, RootState> = (action$) => action$.pipe(
  filter(isActionOf(backgroundOtpProvisionSignal)),
  map((action) => action.payload),
  filter(isSignalFailure),
  filter((signal) => signal.error.value.error === ServiceProvideOtpResponseError.INVALIDCODE),
  mapTo(localOtpTokenFailure())
)

export const remoteAuthnCompleteOnCredentialsEpic: Epic<RootAction, RootAction, RootState> = (action$) => action$.pipe(
  filter(isActionSuccess2([authnViaApiSignal, backgroundRemoteAuthnSignal])),
  concatMap((action) => fn.pipe(
    option.of(action.payload.data),
    option.chain((data) => fn.pipe(
      option.getRight(data.content),
      option.map((content) => of(remoteAuthnComplete({
        username: data.username,
        password: data.password,
        parametrization: data.parametrization,
        encryptionKey: data.encryptionKey,
        ...content,
        isOtpEnabled: false,
        otpToken: null
      })))
    )),
    option.getOrElse<Observable<RootAction>>(() => EMPTY)
  ))
)

export const remoteAuthnCompleteOnOtpEpic: Epic<RootAction, RootAction, RootState> = (action$) => action$.pipe(
  filter(isActionSuccess2([authnOtpProvisionSignal, backgroundOtpProvisionSignal])),
  map((action) => remoteAuthnComplete({
    ...action.payload.data.credentialParams,
    ...action.payload.data.userData,
    isOtpEnabled: true,
    otpToken: fn.pipe(
      action.payload.data.trustedToken,
      option.getOrElse<string | null>(() => null)
    )
  }))
)
