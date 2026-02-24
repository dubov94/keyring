import { createReducer } from '@reduxjs/toolkit'
import { monoid, predicate, option, these } from 'fp-ts'
import { castDraft } from 'immer'
import { DeepReadonly } from 'ts-essentials'
import { isActionOf } from 'typesafe-actions'
import { isActionSuccess, isSignalSuccess, StandardError } from '@/redux/flow_signal'
import { authnViaDepotSignal, registrationSignal, remoteAuthnComplete } from '@/redux/modules/authn/actions'
import { accountDeletionSignal, localOtpTokenFailure, remoteCredentialsMismatchLocal, usernameChangeSignal } from '@/redux/modules/user/account/actions'
import { RemoteData, zero, reducer, identity } from '@/redux/remote_data'
import { RootAction } from '@/redux/root_action'
import {
  WebAuthn,
  WebAuthnFlowIndicator,
  clearDepot,
  depotActivationData,
  newEncryptedOtpToken,
  newVault,
  newWebAuthnLocalDerivatives,
  newWebAuthnRemoteDerivatives,
  rehydration,
  toggleDepot,
  webAuthnResult,
  webAuthnSignal
} from './actions'

type Credentials = {
  username: string;
  salt: string;
  hash: string;
}

type State = {
  persisted: boolean;
  userId: string | null;
  credentials: Credentials | null;
  webAuthnData: RemoteData<WebAuthnFlowIndicator, WebAuthn | null, StandardError<never>>;
  webAuthnResult: string | null;
  webAuthnEncryptedLocalDerivatives: string | null;
  webAuthnEncryptedRemoteDerivatives: string | null;
  // For data encryption.
  depotKey: string | null;
  // For passing the 2FA check.
  encryptedOtpToken: string | null;
  vault: string | null;
}

const emptyState = (): State => ({
  persisted: false,
  userId: null,
  credentials: null,
  webAuthnData: zero(),
  webAuthnResult: null,
  webAuthnEncryptedLocalDerivatives: null,
  webAuthnEncryptedRemoteDerivatives: null,
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
      const { username, userId, salt, hash } = action.payload
      state.userId = userId
      state.persisted = username !== null
      state.credentials = { username, salt, hash }
      state.vault = action.payload.vault
      state.encryptedOtpToken = action.payload.encryptedOtpToken
      const {
        webAuthnCredentialId,
        webAuthnSalt,
        webAuthnEncryptedLocalDerivatives,
        webAuthnEncryptedRemoteDerivatives
      } = action.payload
      state.webAuthnData = {
        indicator: option.zero(),
        result: option.of(these.left(webAuthnCredentialId === null ? null : {
          credentialId: webAuthnCredentialId,
          salt: webAuthnSalt
        }))
      }
      state.webAuthnEncryptedLocalDerivatives = webAuthnEncryptedLocalDerivatives
      state.webAuthnEncryptedRemoteDerivatives = webAuthnEncryptedRemoteDerivatives
    })
    .addMatcher(isActionSuccess(registrationSignal), (state, action) => {
      toEmptyState(state)
      const flowSuccess = action.payload.data
      state.userId = flowSuccess.userId
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
      state.userId = action.payload.userId
      if (!action.payload.isOtpEnabled) {
        state.encryptedOtpToken = null
      }
    })
    .addMatcher(isActionSuccess(usernameChangeSignal), (state, action) => {
      if (state.credentials !== null) {
        if (state.credentials.username === action.payload.data.before) {
          state.credentials.username = action.payload.data.update
        }
      }
    })
    .addMatcher(isActionOf(depotActivationData), (state, action) => {
      const { username, salt, hash } = action.payload
      state.credentials = { username, salt, hash }
      state.depotKey = action.payload.depotKey
    })
    .addMatcher(isActionOf(webAuthnSignal), (state, action) => {
      state.webAuthnData = castDraft(reducer(
        identity<WebAuthnFlowIndicator>(),
        identity<DeepReadonly<WebAuthn | null>>(),
        identity<StandardError<never>>()
      )(state.webAuthnData, action.payload))
      if (isSignalSuccess(action.payload)) {
        state.webAuthnEncryptedLocalDerivatives = null
        state.webAuthnEncryptedRemoteDerivatives = null
      }
    })
    .addMatcher(isActionOf(webAuthnResult), (state, action) => {
      state.webAuthnResult = action.payload.result
    })
    .addMatcher(isActionOf(newWebAuthnLocalDerivatives), (state, action) => {
      state.webAuthnEncryptedLocalDerivatives = action.payload
    })
    .addMatcher(isActionOf(newWebAuthnRemoteDerivatives), (state, action) => {
      state.webAuthnEncryptedRemoteDerivatives = action.payload
    })
    .addMatcher(isActionOf(toggleDepot), (state, action) => {
      state.persisted = action.payload
    })
    .addMatcher(isActionOf(clearDepot), toEmptyState)
    // As a reducer (and not an epic) to ensure we clear the storage before
    // synchronization may be cut off via `logOut`.
    .addMatcher(
      monoid.concatAll(predicate.getMonoidAny<RootAction>())([
        isActionSuccess(accountDeletionSignal),
        isActionOf(remoteCredentialsMismatchLocal),
        isActionOf(localOtpTokenFailure)
      ]),
      toEmptyState
    )
)
