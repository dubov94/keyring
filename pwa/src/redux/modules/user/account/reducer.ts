import { isActionSuccess, isActionSuccess2, StandardError } from '@/redux/flow_signal'
import { identity, reducer, RemoteData, withNoResult, zero } from '@/redux/remote_data'
import { createReducer } from '@reduxjs/toolkit'
import { isActionOf } from 'typesafe-actions'
import { authnViaApiSignal, authnViaDepotSignal, backgroundAuthnSignal, registrationSignal } from '../../authn/actions'
import {
  AccountDeletionFlowIndicator,
  accountDeletionReset,
  accountDeletionSignal,
  MailTokenAcquisitionFlowIndicator,
  mailTokenAcquisitionReset,
  mailTokenAcquisitionSignal,
  MailTokenReleaseFlowIndicator,
  mailTokenReleaseReset,
  mailTokenReleaseSignal,
  MasterKeyChangeFlowIndicator,
  masterKeyChangeReset,
  masterKeyChangeSignal,
  UsernameChangeFlowIndicator,
  usernameChangeReset,
  usernameChangeSignal
} from './actions'
import {
  ServiceReleaseMailTokenResponseError,
  ServiceAcquireMailTokenResponseError,
  ServiceChangeMasterKeyResponseError,
  ServiceChangeUsernameResponseError,
  ServiceDeleteAccountResponseError
} from '@/api/definitions'

export default createReducer<{
  isAuthenticated: boolean;
  parametrization: string | null;
  encryptionKey: string | null;
  sessionKey: string | null;
  requiresMailVerification: boolean;
  mailTokenRelease: RemoteData<MailTokenReleaseFlowIndicator, {}, StandardError<ServiceReleaseMailTokenResponseError>>;
  mailTokenAcquisition: RemoteData<MailTokenAcquisitionFlowIndicator, string, StandardError<ServiceAcquireMailTokenResponseError>>;
  masterKeyChange: RemoteData<MasterKeyChangeFlowIndicator, {}, StandardError<ServiceChangeMasterKeyResponseError>>;
  usernameChange: RemoteData<UsernameChangeFlowIndicator, {}, StandardError<ServiceChangeUsernameResponseError>>;
  accountDeletion: RemoteData<AccountDeletionFlowIndicator, {}, StandardError<ServiceDeleteAccountResponseError>>;
}>(
  {
    isAuthenticated: false,
    parametrization: null,
    encryptionKey: null,
    sessionKey: null,
    requiresMailVerification: true,
    mailTokenRelease: zero(),
    mailTokenAcquisition: zero(),
    masterKeyChange: zero(),
    usernameChange: zero(),
    accountDeletion: zero()
  },
  (builder) => builder
    .addMatcher(isActionSuccess(registrationSignal), (state, action) => {
      const flowSuccess = action.payload.data
      state.isAuthenticated = true
      state.parametrization = flowSuccess.parametrization
      state.encryptionKey = flowSuccess.encryptionKey
      state.sessionKey = flowSuccess.sessionKey
      state.requiresMailVerification = true
    })
    .addMatcher(isActionSuccess2([authnViaApiSignal, backgroundAuthnSignal]), (state, action) => {
      const flowSuccess = action.payload.data
      state.isAuthenticated = true
      state.parametrization = flowSuccess.parametrization
      state.encryptionKey = flowSuccess.encryptionKey
      state.sessionKey = flowSuccess.sessionKey
      state.requiresMailVerification = flowSuccess.requiresMailVerification
    })
    .addMatcher(isActionSuccess(authnViaDepotSignal), (state) => {
      state.isAuthenticated = true
      state.requiresMailVerification = false
    })
    .addMatcher(isActionOf(mailTokenReleaseSignal), (state, action) => {
      state.mailTokenRelease = reducer(
        identity<MailTokenReleaseFlowIndicator>(),
        () => ({}),
        identity<StandardError<ServiceReleaseMailTokenResponseError>>()
      )(state.mailTokenRelease, action.payload)
    })
    .addMatcher(isActionSuccess(mailTokenReleaseSignal), (state) => {
      state.requiresMailVerification = false
    })
    .addMatcher(isActionOf(mailTokenReleaseReset), (state) => {
      state.mailTokenRelease = withNoResult(state.mailTokenRelease)
    })
    .addMatcher(isActionOf(mailTokenAcquisitionSignal), (state, action) => {
      state.mailTokenAcquisition = reducer(
        identity<MailTokenAcquisitionFlowIndicator>(),
        identity<string>(),
        identity<StandardError<ServiceAcquireMailTokenResponseError>>()
      )(state.mailTokenAcquisition, action.payload)
    })
    .addMatcher(isActionOf(mailTokenAcquisitionReset), (state) => {
      state.mailTokenAcquisition = withNoResult(state.mailTokenAcquisition)
    })
    .addMatcher(isActionOf(masterKeyChangeSignal), (state, action) => {
      state.masterKeyChange = reducer(
        identity<MasterKeyChangeFlowIndicator>(),
        () => ({}),
        identity<StandardError<ServiceChangeMasterKeyResponseError>>()
      )(state.masterKeyChange, action.payload)
    })
    .addMatcher(isActionSuccess(masterKeyChangeSignal), (state, action) => {
      state.parametrization = action.payload.data.newParametrization
      state.encryptionKey = action.payload.data.newEncryptionKey
      state.sessionKey = action.payload.data.newSessionKey
    })
    .addMatcher(isActionOf(masterKeyChangeReset), (state) => {
      state.masterKeyChange = withNoResult(state.masterKeyChange)
    })
    .addMatcher(isActionOf(usernameChangeSignal), (state, action) => {
      state.usernameChange = reducer(
        identity<UsernameChangeFlowIndicator>(),
        () => ({}),
        identity<StandardError<ServiceChangeUsernameResponseError>>()
      )(state.usernameChange, action.payload)
    })
    .addMatcher(isActionOf(usernameChangeReset), (state) => {
      state.usernameChange = withNoResult(state.usernameChange)
    })
    .addMatcher(isActionOf(accountDeletionSignal), (state, action) => {
      state.accountDeletion = reducer(
        identity<AccountDeletionFlowIndicator>(),
        () => ({}),
        identity<StandardError<ServiceDeleteAccountResponseError>>()
      )(state.accountDeletion, action.payload)
    })
    .addMatcher(isActionOf(accountDeletionReset), (state) => {
      state.accountDeletion = withNoResult(state.accountDeletion)
    })
)
