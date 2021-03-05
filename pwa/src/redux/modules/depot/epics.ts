import { RootAction } from '@/redux/root_action'
import { RootState } from '@/redux/root_reducer'
import { Epic } from 'redux-observable'
import { filter, map, switchMap, withLatestFrom } from 'rxjs/operators'
import { isActionOf } from 'typesafe-actions'
import { userKeysUpdate } from '../user/keys/actions'
import { monoid } from 'fp-ts'
import { disjunction } from '@/redux/predicates'
import { isActionSuccess } from '@/redux/flow_signal'
import { EMPTY, from, of } from 'rxjs'
import { getSodiumClient } from '@/sodium_client'
import { activateDepot, depotActivationData, newVault } from './actions'
import { masterKeyChangeSignal } from '../user/account/actions'

export const updateVaultEpic: Epic<RootAction, RootAction, RootState> = (action$, state$) => action$.pipe(
  filter(monoid.fold(disjunction)([isActionOf(depotActivationData), isActionOf(userKeysUpdate)])),
  withLatestFrom(state$),
  switchMap(([, state]) => {
    return state.depot.vaultKey !== null ? from(getSodiumClient().encryptMessage(
      state.depot.vaultKey!,
      JSON.stringify(state.user.keys.userKeys)
    )).pipe(
      map((vault) => newVault(vault))
    ) : EMPTY
  })
)

export const activateDepotEpic: Epic<RootAction, RootAction, RootState> = (action$) => action$.pipe(
  filter(isActionOf(activateDepot)),
  switchMap((action) => from(getSodiumClient().generateNewParametrization()).pipe(switchMap((parametrization) => {
    return from(getSodiumClient().computeAuthDigestAndEncryptionKey(parametrization, action.payload.password)).pipe(
      switchMap(({ authDigest, encryptionKey }) => of(depotActivationData({
        username: action.payload.username,
        salt: parametrization,
        hash: authDigest,
        vaultKey: encryptionKey
      })))
    )
  })))
)

export const changeMasterKeyEpic: Epic<RootAction, RootAction, RootState> = (action$, state$) => action$.pipe(
  filter(isActionSuccess(masterKeyChangeSignal)),
  withLatestFrom(state$),
  switchMap(([action, state]) => state.depot.username === null ? EMPTY : of(activateDepot({
    username: state.depot.username,
    password: action.payload.data.newMasterKey
  })))
)
