import { isActionSuccess } from '@/redux/flow_signal'
import { createReducer } from '@reduxjs/toolkit'
import { isActionOf } from 'typesafe-actions'
import { authnViaDepotSignal, registrationSignal } from '../authn/actions'
import { accountDeletionSignal, remoteCredentialsMismatchLocal, usernameChangeSignal } from '../user/account/actions'
import { clearDepot, depotActivationData, newVault, rehydrateDepot } from './actions'
import { monoid } from 'fp-ts'
import { disjunction } from '@/redux/predicates'

type State = {
  username: string | null;
  salt: string | null;
  hash: string | null;
  vault: string | null;
  depotKey: string | null;
  encryptedOtpToken: string | null;
}

const initialState = (): State => ({
  username: null,
  salt: null,
  hash: null,
  vault: null,
  depotKey: null,
  encryptedOtpToken: null
})

const toInitialState = (state: State) => {
  Object.assign(state, initialState())
}

export default createReducer<State>(
  initialState(),
  (builder) => builder
    .addMatcher(isActionOf(rehydrateDepot), (state, action) => {
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
    .addMatcher(isActionOf(clearDepot), toInitialState)
    // As a reducer to ensure we clear the storage before synchronization is
    // cut off.
    .addMatcher(
      monoid.fold(disjunction)([
        isActionSuccess(registrationSignal),
        isActionSuccess(accountDeletionSignal),
        isActionOf(remoteCredentialsMismatchLocal)
      ]),
      toInitialState
    )
)
