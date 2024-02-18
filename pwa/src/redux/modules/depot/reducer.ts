import { createReducer } from '@reduxjs/toolkit'
import { monoid, predicate } from 'fp-ts'
import { isActionOf } from 'typesafe-actions'
import { isActionSuccess } from '@/redux/flow_signal'
import { authnViaDepotSignal, registrationSignal, remoteAuthnComplete } from '@/redux/modules/authn/actions'
import { accountDeletionSignal, localOtpTokenFailure, remoteCredentialsMismatchLocal, usernameChangeSignal } from '@/redux/modules/user/account/actions'
import { RootAction } from '@/redux/root_action'
import { clearDepot, depotActivationData, newEncryptedOtpToken, newVault, rehydration } from './actions'

type State = {
  username: string | null;
  salt: string | null;
  hash: string | null;
  vault: string | null;
  depotKey: string | null;
  encryptedOtpToken: string | null;
}

const emptyState = (): State => ({
  username: null,
  salt: null,
  hash: null,
  vault: null,
  depotKey: null,
  encryptedOtpToken: null
})

const toEmptyState = (state: State) => {
  Object.assign(state, emptyState())
}

export default createReducer<State>(
  emptyState(),
  (builder) => builder
    .addMatcher(isActionOf(rehydration), (state, action) => {
      state.username = action.payload.username
      state.salt = action.payload.salt
      state.hash = action.payload.hash
      state.vault = action.payload.vault
      state.encryptedOtpToken = action.payload.encryptedOtpToken
    })
    .addMatcher(isActionSuccess(authnViaDepotSignal), (state, action) => {
      state.depotKey = action.payload.data.depotKey
    })
    .addMatcher(isActionOf(newVault), (state, action) => {
      state.vault = action.payload
    })
    .addMatcher(isActionOf(newEncryptedOtpToken), (state, action) => {
      state.encryptedOtpToken = action.payload
    })
    .addMatcher(isActionOf(remoteAuthnComplete), (state, action) => {
      if (!action.payload.isOtpEnabled) {
        state.encryptedOtpToken = null
      }
    })
    .addMatcher(isActionSuccess(usernameChangeSignal), (state, action) => {
      if (state.username === action.payload.data.before) {
        state.username = action.payload.data.update
      }
    })
    .addMatcher(isActionOf(depotActivationData), (state, action) => {
      state.username = action.payload.username
      state.salt = action.payload.salt
      state.hash = action.payload.hash
      state.depotKey = action.payload.depotKey
    })
    .addMatcher(isActionOf(clearDepot), toEmptyState)
    // As a reducer (and not an epic) to ensure we clear the storage before
    // synchronization may be cut off via `logOut`.
    .addMatcher(
      monoid.concatAll(predicate.getMonoidAny<RootAction>())([
        isActionSuccess(registrationSignal),
        isActionSuccess(accountDeletionSignal),
        isActionOf(remoteCredentialsMismatchLocal),
        isActionOf(localOtpTokenFailure)
      ]),
      toEmptyState
    )
)
