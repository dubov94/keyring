import { getAdministrationApi } from '@/api/api_di'
import { cancel, exception, failure, indicator, isActionSuccess, errorToMessage, success } from '@/redux/flow_signal'
import { RootAction } from '@/redux/root_action'
import { RootState } from '@/redux/root_reducer'
import { Epic } from 'redux-observable'
import { asapScheduler, concat, EMPTY, forkJoin, from, of } from 'rxjs'
import { filter, withLatestFrom, switchMap, catchError, defaultIfEmpty, concatMap } from 'rxjs/operators'
import { isActionOf } from 'typesafe-actions'
import {
  AccountDeletionFlowIndicator,
  accountDeletionReset,
  accountDeletionSignal,
  acquireMailToken,
  changeMasterKey,
  changeUsername,
  deleteAccount,
  remoteCredentialsMismatchLocal,
  logOut,
  MailTokenAcquisitionFlowIndicator,
  mailTokenAcquisitionReset,
  mailTokenAcquisitionSignal,
  MailTokenReleaseFlowIndicator,
  mailTokenReleaseReset,
  mailTokenReleaseSignal,
  MasterKeyChangeFlowIndicator,
  masterKeyChangeReset,
  masterKeyChangeSignal,
  releaseMailToken,
  UsernameChangeFlowIndicator,
  usernameChangeReset,
  usernameChangeSignal
} from './actions'
import {
  ServiceReleaseMailTokenResponse,
  ServiceReleaseMailTokenResponseError,
  ServiceAcquireMailTokenResponse,
  ServiceAcquireMailTokenResponseError,
  ServiceChangeMasterKeyResponse,
  ServiceChangeMasterKeyResponseError,
  ServiceChangeUsernameResponse,
  ServiceChangeUsernameResponseError,
  ServiceDeleteAccountResponse,
  ServiceDeleteAccountResponseError
} from '@/api/definitions'
import { SESSION_TOKEN_HEADER_NAME } from '@/headers'
import { getSodiumClient } from '@/sodium_client'
import { Password } from '@/redux/entities'
import { createDisplayExceptionsEpic } from '@/redux/exceptions'

export const logOutEpic: Epic<RootAction, RootAction, RootState> = (action$) => action$.pipe(
  filter(isActionOf(logOut)),
  concatMap(() => {
    asapScheduler.schedule(() => {
      location.assign('/')
    })
    return EMPTY
  })
)

export const releaseMailTokenEpic: Epic<RootAction, RootAction, RootState> = (action$, state$) => action$.pipe(
  filter(isActionOf([releaseMailToken, mailTokenReleaseReset])),
  withLatestFrom(state$),
  switchMap(([action, state]) => {
    if (isActionOf(releaseMailToken, action)) {
      return concat(
        of(mailTokenReleaseSignal(indicator(MailTokenReleaseFlowIndicator.WORKING))),
        from(getAdministrationApi().releaseMailToken({
          code: action.payload.code
        }, {
          headers: {
            [SESSION_TOKEN_HEADER_NAME]: state.user.account.sessionKey
          }
        })).pipe(switchMap((response: ServiceReleaseMailTokenResponse) => {
          switch (response.error) {
            case ServiceReleaseMailTokenResponseError.NONE:
              return of(mailTokenReleaseSignal(success({})))
            default:
              return of(mailTokenReleaseSignal(failure(response.error!)))
          }
        }))
      ).pipe(
        catchError((error) => of(mailTokenReleaseSignal(exception(errorToMessage(error)))))
      )
    } else if (isActionOf(mailTokenReleaseReset, action)) {
      return of(mailTokenReleaseSignal(cancel()))
    }
    return EMPTY
  })
)

export const displayMailTokenReleaseExceptionsEpic = createDisplayExceptionsEpic(mailTokenReleaseSignal)

export const acquireMailTokenEpic: Epic<RootAction, RootAction, RootState> = (action$, state$) => action$.pipe(
  filter(isActionOf([acquireMailToken, mailTokenAcquisitionReset])),
  withLatestFrom(state$),
  switchMap(([action, state]) => {
    if (isActionOf(acquireMailToken, action)) {
      return concat(
        of(mailTokenAcquisitionSignal(indicator(MailTokenAcquisitionFlowIndicator.COMPUTING_MASTER_KEY_DERIVATIVES))),
        from(getSodiumClient().computeAuthDigestAndEncryptionKey(state.user.account.parametrization!, action.payload.password)).pipe(
          switchMap(({ authDigest }) => concat(
            of(mailTokenAcquisitionSignal(indicator(MailTokenAcquisitionFlowIndicator.MAKING_REQUEST))),
            from(getAdministrationApi().acquireMailToken({
              digest: authDigest,
              mail: action.payload.mail
            }, {
              headers: {
                [SESSION_TOKEN_HEADER_NAME]: state.user.account.sessionKey
              }
            })).pipe(switchMap((response: ServiceAcquireMailTokenResponse) => {
              switch (response.error) {
                case ServiceAcquireMailTokenResponseError.NONE:
                  return of(mailTokenAcquisitionSignal(success(action.payload.mail)))
                default:
                  return of(mailTokenAcquisitionSignal(failure(response.error!)))
              }
            }))
          ))
        )
      ).pipe(
        catchError((error) => of(mailTokenAcquisitionSignal(exception(errorToMessage(error)))))
      )
    } else if (isActionOf(mailTokenAcquisitionReset, action)) {
      return of(mailTokenAcquisitionSignal(cancel()))
    }
    return EMPTY
  })
)

export const displayMailTokenAcquisitionExceptionsEpic = createDisplayExceptionsEpic(mailTokenAcquisitionSignal)

export const changeMasterKeyEpic: Epic<RootAction, RootAction, RootState> = (action$, state$) => action$.pipe(
  filter(isActionOf([changeMasterKey, masterKeyChangeReset])),
  withLatestFrom(state$),
  switchMap(([action, state]) => {
    if (isActionOf(changeMasterKey, action)) {
      return concat(
        of(masterKeyChangeSignal(indicator(MasterKeyChangeFlowIndicator.REENCRYPTING))),
        from(getSodiumClient().computeAuthDigestAndEncryptionKey(state.user.account.parametrization!, action.payload.current)).pipe(
          switchMap(({ authDigest }) => from(getSodiumClient().generateNewParametrization()).pipe(
            switchMap((newParametrization) => from(getSodiumClient().computeAuthDigestAndEncryptionKey(newParametrization, action.payload.renewal)).pipe(
              switchMap((newDerivatives) => forkJoin(state.user.keys.userKeys.map(async ({ identifier, value, tags }) => ({
                identifier,
                password: await getSodiumClient().encryptPassword(newDerivatives.encryptionKey, { value, tags })
              }))).pipe(
                defaultIfEmpty(<{ identifier: string; password: Password }[]>[]),
                switchMap((keys) => concat(
                  of(masterKeyChangeSignal(indicator(MasterKeyChangeFlowIndicator.MAKING_REQUEST))),
                  from(getAdministrationApi().changeMasterKey({
                    currentDigest: authDigest,
                    renewal: {
                      salt: newParametrization,
                      digest: newDerivatives.authDigest,
                      keys
                    }
                  }, {
                    headers: {
                      [SESSION_TOKEN_HEADER_NAME]: state.user.account.sessionKey
                    }
                  })).pipe(switchMap((response: ServiceChangeMasterKeyResponse) => {
                    switch (response.error) {
                      case ServiceChangeMasterKeyResponseError.NONE:
                        return of(masterKeyChangeSignal(success({
                          newMasterKey: action.payload.renewal,
                          newParametrization,
                          newEncryptionKey: newDerivatives.encryptionKey,
                          newSessionKey: response.sessionKey!
                        })))
                      default:
                        return of(masterKeyChangeSignal(failure(response.error!)))
                    }
                  }))
                ))
              ))
            ))
          ))
        )
      ).pipe(
        catchError((error) => of(masterKeyChangeSignal(exception(errorToMessage(error)))))
      )
    } else if (isActionOf(masterKeyChangeReset, action)) {
      return of(masterKeyChangeSignal(cancel()))
    }
    return EMPTY
  })
)

export const displayMasterKeyChangeExceptionsEpic = createDisplayExceptionsEpic(masterKeyChangeSignal)

export const changeUsernameEpic: Epic<RootAction, RootAction, RootState> = (action$, state$) => action$.pipe(
  filter(isActionOf([changeUsername, usernameChangeReset])),
  withLatestFrom(state$),
  switchMap(([action, state]) => {
    if (isActionOf(changeUsername, action)) {
      return concat(
        of(usernameChangeSignal(indicator(UsernameChangeFlowIndicator.COMPUTING_MASTER_KEY_DERIVATIVES))),
        from(getSodiumClient().computeAuthDigestAndEncryptionKey(state.user.account.parametrization!, action.payload.password)).pipe(
          switchMap(({ authDigest }) => concat(
            of(usernameChangeSignal(indicator(UsernameChangeFlowIndicator.MAKING_REQUEST))),
            from(getAdministrationApi().changeUsername({
              digest: authDigest,
              username: action.payload.username
            }, {
              headers: {
                [SESSION_TOKEN_HEADER_NAME]: state.user.account.sessionKey
              }
            })).pipe(switchMap((response: ServiceChangeUsernameResponse) => {
              switch (response.error) {
                case ServiceChangeUsernameResponseError.NONE:
                  return of(usernameChangeSignal(success({
                    before: state.session.username!,
                    update: action.payload.username
                  })))
                default:
                  return of(usernameChangeSignal(failure(response.error!)))
              }
            }))
          ))
        )
      ).pipe(
        catchError((error) => of(usernameChangeSignal(exception(errorToMessage(error)))))
      )
    } else if (isActionOf(usernameChangeReset, action)) {
      return of(usernameChangeSignal(cancel()))
    }
    return EMPTY
  })
)

export const displayUsernameChangeExceptionsEpic = createDisplayExceptionsEpic(usernameChangeSignal)

export const deleteAccountEpic: Epic<RootAction, RootAction, RootState> = (action$, state$) => action$.pipe(
  filter(isActionOf([deleteAccount, accountDeletionReset])),
  withLatestFrom(state$),
  switchMap(([action, state]) => {
    if (isActionOf(deleteAccount, action)) {
      return concat(
        of(accountDeletionSignal(indicator(AccountDeletionFlowIndicator.COMPUTING_MASTER_KEY_DERIVATIVES))),
        from(getSodiumClient().computeAuthDigestAndEncryptionKey(state.user.account.parametrization!, action.payload.password)).pipe(
          switchMap(({ authDigest }) => concat(
            of(accountDeletionSignal(indicator(AccountDeletionFlowIndicator.MAKING_REQUEST))),
            from(getAdministrationApi().deleteAccount({
              digest: authDigest
            }, {
              headers: {
                [SESSION_TOKEN_HEADER_NAME]: state.user.account.sessionKey
              }
            })).pipe(switchMap((response: ServiceDeleteAccountResponse) => {
              switch (response.error) {
                case ServiceDeleteAccountResponseError.NONE:
                  return of(accountDeletionSignal(success({})))
                default:
                  return of(accountDeletionSignal(failure(response.error!)))
              }
            }))
          ))
        )
      )
    } else if (isActionOf(accountDeletionReset, action)) {
      return of(accountDeletionSignal(cancel()))
    }
    return EMPTY
  })
)

export const displayAccountDeletionExceptionsEpic = createDisplayExceptionsEpic(accountDeletionSignal)

export const logOutOnDeletionSuccessEpic: Epic<RootAction, RootAction, RootState> = (action$) => action$.pipe(
  filter(isActionSuccess(accountDeletionSignal)),
  concatMap(() => of(logOut()))
)

export const logOutOnCredentialsMismatchEpic: Epic<RootAction, RootAction, RootState> = (action$) => action$.pipe(
  filter(isActionOf(remoteCredentialsMismatchLocal)),
  concatMap(() => of(logOut()))
)
