import { function as fn, monoid, option, predicate } from 'fp-ts'
import { Epic } from 'redux-observable'
import { EMPTY, from, Observable, of } from 'rxjs'
import { filter, map, switchMap, withLatestFrom } from 'rxjs/operators'
import { isActionOf } from 'typesafe-actions'
import { getSodiumClient } from '@/cryptography/sodium_client'
import { isActionSuccess } from '@/redux/flow_signal'
import { authnViaDepotSignal, remoteAuthnComplete } from '@/redux/modules/authn/actions'
import { masterKeyChangeSignal, otpParamsAcceptanceSignal, otpResetSignal } from '@/redux/modules/user/account/actions'
import { userKeysUpdate } from '@/redux/modules/user/keys/actions'
import { RootAction } from '@/redux/root_action'
import { RootState } from '@/redux/root_reducer'
import { activateDepot, depotActivationData, newEncryptedOtpToken, newVault } from './actions'

export const updateVaultEpic: Epic<RootAction, RootAction, RootState> = (action$, state$) => action$.pipe(
  filter(monoid.concatAll(predicate.getMonoidAny<RootAction>())([
    isActionOf(depotActivationData),
    isActionOf(userKeysUpdate)
  ])),
  withLatestFrom(state$),
  switchMap(([, state]) => fn.pipe(
    option.fromNullable(state.depot.depotKey),
    option.map((depotKey) => from(getSodiumClient().encryptMessage(
      depotKey,
      JSON.stringify(state.user.keys.userKeys.filter((userKey) => !userKey.attrs.isShadow))
    )).pipe(map((vault) => newVault(vault)))),
    option.getOrElse<Observable<RootAction>>(() => EMPTY)
  ))
)

export const updateEncryptedOtpTokenEpic: Epic<RootAction, RootAction, RootState> = (action$, state$) => action$.pipe(
  filter(monoid.concatAll(predicate.getMonoidAny<RootAction>())([
    isActionOf(depotActivationData),
    isActionOf(remoteAuthnComplete),
    isActionSuccess(otpParamsAcceptanceSignal),
    isActionSuccess(otpResetSignal)
  ])),
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
