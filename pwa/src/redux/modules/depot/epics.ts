import { RootAction } from '@/redux/root_action'
import { RootState } from '@/redux/root_reducer'
import { Epic } from 'redux-observable'
import { filter, map, switchMap, withLatestFrom } from 'rxjs/operators'
import { isActionOf } from 'typesafe-actions'
import { userKeysUpdate } from '../user/keys/actions'
import { function as fn, monoid, option } from 'fp-ts'
import { disjunction } from '@/redux/predicates'
import { isActionSuccess } from '@/redux/flow_signal'
import { EMPTY, from, Observable, of } from 'rxjs'
import { getSodiumClient } from '@/cryptography/sodium_client'
import { activateDepot, depotActivationData, newEncryptedOtpToken, newVault } from './actions'
import { masterKeyChangeSignal } from '../user/account/actions'
import { authnViaDepotSignal, remoteAuthnComplete } from '../authn/actions'

export const updateVaultEpic: Epic<RootAction, RootAction, RootState> = (action$, state$) => action$.pipe(
  filter(monoid.fold(disjunction)([isActionOf(depotActivationData), isActionOf(userKeysUpdate)])),
  withLatestFrom(state$),
  switchMap(([, state]) => fn.pipe(
    option.fromNullable(state.depot.depotKey),
    option.map((depotKey) => from(getSodiumClient().encryptMessage(
      depotKey,
      JSON.stringify(state.user.keys.userKeys)
    )).pipe(map((vault) => newVault(vault)))),
    option.getOrElse<Observable<RootAction>>(() => EMPTY)
  ))
)

export const updateEncryptedOtpTokenEpic: Epic<RootAction, RootAction, RootState> = (action$, state$) => action$.pipe(
  filter(monoid.fold(disjunction)([isActionOf(depotActivationData), isActionOf(remoteAuthnComplete)])),
  withLatestFrom(state$),
  switchMap(([, state]) => fn.pipe(
    option.fromNullable(state.depot.depotKey),
    option.map((depotKey) => fn.pipe(
      option.fromNullable(state.user.account.otpToken),
      option.map((otpToken) => from(getSodiumClient().encryptMessage(depotKey, otpToken))),
      option.getOrElse<Observable<string | null>>(() => of(null))
    )),
    option.map((observable: Observable<string | null>) => observable.pipe(
      map((value) => newEncryptedOtpToken(value))
    )),
    option.getOrElse<Observable<RootAction>>(() => EMPTY)
  ))
)

export const activateDepotEpic: Epic<RootAction, RootAction, RootState> = (action$) => action$.pipe(
  filter(isActionOf(activateDepot)),
  switchMap((action) => from(getSodiumClient().generateNewParametrization()).pipe(switchMap((parametrization) => {
    return from(getSodiumClient().computeAuthDigestAndEncryptionKey(parametrization, action.payload.password)).pipe(
      switchMap(({ authDigest, encryptionKey }) => of(depotActivationData({
        username: action.payload.username,
        salt: parametrization,
        hash: authDigest,
        depotKey: encryptionKey
      })))
    )
  })))
)

export const masterKeyUpdateEpic: Epic<RootAction, RootAction, RootState> = (action$, state$) => action$.pipe(
  filter(isActionSuccess(masterKeyChangeSignal)),
  withLatestFrom(state$),
  switchMap(([action, state]) => state.depot.username === null ? EMPTY : of(activateDepot({
    username: state.depot.username,
    password: action.payload.data.newMasterKey
  })))
)

export const localRehashEpic: Epic<RootAction, RootAction, RootState> = (action$, state$) => action$.pipe(
  filter(isActionSuccess(authnViaDepotSignal)),
  withLatestFrom(state$),
  switchMap(([action, state]) => {
    const { salt } = state.depot
    if (salt !== null && !getSodiumClient().isParametrizationUpToDate(salt)) {
      const { username, password } = action.payload.data
      return of(activateDepot({ username, password }))
    }
    return EMPTY
  })
)
