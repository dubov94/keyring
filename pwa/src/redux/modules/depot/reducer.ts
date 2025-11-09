import { createReducer } from '@reduxjs/toolkit'
import { monoid, predicate } from 'fp-ts'
import { isActionOf } from 'typesafe-actions'
import { isActionSuccess } from '@/redux/flow_signal'
import { authnViaDepotSignal, registrationSignal, remoteAuthnComplete } from '@/redux/modules/authn/actions'
import { accountDeletionSignal, localOtpTokenFailure, remoteCredentialsMismatchLocal, usernameChangeSignal } from '@/redux/modules/user/account/actions'
import { RootAction } from '@/redux/root_action'
import { clearDepot, depotActivationData, newEncryptedOtpToken, newVault, rehydration, toggleDepot } from './actions'

type Credentials = {
  username: string;
  salt: string;
  hash: string;
}

type State = {
  persisted: boolean;
  credentials: Credentials | null;
  // For data encryption.
  depotKey: string | null;
  // For passing the 2FA check.
  encryptedOtpToken: string | null;
  vault: string | null;
}

const emptyState = (): State => ({
  persisted: false,
  credentials: null,
  depotKey: null,
  encryptedOtpToken: null,
  vault: null
})

const toEmptyState = (state: State) => {
  Object.assign(state, emptyState())
}

export default createReducer<State>(
  emptyState(),
  (builder) => builder
    .addMatcher(isActionOf(rehydration), (state, action) => {
      const { username, salt, hash } = action.payload
      state.persisted = username !== null
      state.credentials = { username, salt, hash }
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
      if (state.credentials === null) {
        return
      }
      if (state.credentials.username === action.payload.data.before) {
        state.credentials.username = action.payload.data.update
      }
    })
    .addMatcher(isActionOf(depotActivationData), (state, action) => {
      const { username, salt, hash } = action.payload
      state.credentials = { username, salt, hash }
      state.depotKey = action.payload.depotKey
    })
    .addMatcher(isActionOf(toggleDepot), (state, action) => {
      state.persisted = action.payload
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
