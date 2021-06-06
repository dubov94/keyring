import { getAdministrationApi } from '@/api/api_di'
import { SESSION_TOKEN_HEADER_NAME } from '@/headers'
import { exception, indicator, isActionSuccess3, errorToMessage, success, isActionSuccess, isActionSuccess2 } from '@/redux/flow_signal'
import { getSodiumClient } from '@/cryptography/sodium_client'
import { Epic } from 'redux-observable'
import { concat, EMPTY, from, of } from 'rxjs'
import { catchError, concatMap, filter, mergeMap, switchMap, withLatestFrom } from 'rxjs/operators'
import { isActionOf } from 'typesafe-actions'
import {
  create,
  creationSignal,
  delete_,
  deletionSignal,
  OperationIndicator,
  update,
  updationSignal,
  emplace,
  userKeysUpdate
} from './actions'
import { ServiceCreateKeyResponse } from '@/api/definitions'
import { RootAction } from '@/redux/root_action'
import { RootState } from '@/redux/root_reducer'
import { authnViaApiSignal, authnViaDepotSignal, backgroundAuthnSignal } from '../../authn/actions'
import { createDisplayExceptionsEpic } from '@/redux/exceptions'
import { disjunction } from '@/redux/predicates'
import { monoid, either } from 'fp-ts'

export const creationEpic: Epic<RootAction, RootAction, RootState> = (action$, state$) => action$.pipe(
  filter(isActionOf(create)),
  withLatestFrom(state$),
  mergeMap(([action, state]) => concat(
    of(creationSignal(indicator(OperationIndicator.WORKING))),
    from(getSodiumClient().encryptPassword(state.user.account.encryptionKey!, action.payload)).pipe(
      switchMap((password) => from(getAdministrationApi().createKey({
        password
      }, {
        headers: {
          [SESSION_TOKEN_HEADER_NAME]: state.user.account.sessionKey!
        }
      })).pipe(
        switchMap((response: ServiceCreateKeyResponse) => {
          return of(creationSignal(success({
            identifier: response.identifier!,
            value: action.payload.value,
            tags: action.payload.tags
          })))
        })
      ))
    )
  ).pipe(
    catchError((error) => of(creationSignal(exception(errorToMessage(error)))))
  ))
)

export const updationEpic: Epic<RootAction, RootAction, RootState> = (action$, state$) => action$.pipe(
  filter(isActionOf(update)),
  withLatestFrom(state$),
  mergeMap(([action, state]) => concat(
    of(updationSignal(indicator(OperationIndicator.WORKING))),
    from(getSodiumClient().encryptPassword(state.user.account.encryptionKey!, action.payload)).pipe(
      switchMap((password) => from(getAdministrationApi().updateKey({
        key: {
          identifier: action.payload.identifier,
          password
        }
      }, {
        headers: {
          [SESSION_TOKEN_HEADER_NAME]: state.user.account.sessionKey!
        }
      })).pipe(
        switchMap(() => {
          return of(updationSignal(success({
            identifier: action.payload.identifier,
            value: action.payload.value,
            tags: action.payload.tags
          })))
        })
      ))
    )
  ).pipe(
    catchError((error) => of(updationSignal(exception(errorToMessage(error)))))
  ))
)

export const deletionEpic: Epic<RootAction, RootAction, RootState> = (action$, state$) => action$.pipe(
  filter(isActionOf(delete_)),
  withLatestFrom(state$),
  mergeMap(([action, state]) => concat(
    of(deletionSignal(indicator(OperationIndicator.WORKING))),
    from(getAdministrationApi().deleteKey({
      identifier: action.payload
    }, {
      headers: {
        [SESSION_TOKEN_HEADER_NAME]: state.user.account.sessionKey!
      }
    })).pipe(
      switchMap(() => {
        return of(deletionSignal(success(action.payload)))
      })
    )
  ).pipe(
    catchError((error) => of(deletionSignal(exception(errorToMessage(error)))))
  ))
)

export const displayCudExceptionsEpic = createDisplayExceptionsEpic([creationSignal, updationSignal, deletionSignal])

export const inheritKeysFromAuthnDataEpic: Epic<RootAction, RootAction, RootState> = (action$) => action$.pipe(
  concatMap((action) => {
    if (isActionSuccess(authnViaDepotSignal)(action)) {
      return of(emplace(action.payload.data.userKeys))
    }
    if (isActionSuccess2([authnViaApiSignal, backgroundAuthnSignal])(action) &&
        either.isRight(action.payload.data.content)) {
      return of(emplace(action.payload.data.content.right.userKeys))
    }
    return EMPTY
  })
)

export const userKeysUpdateEpic: Epic<RootAction, RootAction, RootState> = (action$, state$) => action$.pipe(
  filter(monoid.fold(disjunction)([isActionOf(emplace), isActionSuccess3([creationSignal, updationSignal, deletionSignal])])),
  withLatestFrom(state$),
  concatMap(([, state]) => of(userKeysUpdate(state.user.keys.userKeys)))
)
