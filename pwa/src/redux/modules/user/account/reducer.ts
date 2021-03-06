import { isActionSuccess, isActionSuccess2, StandardError } from '@/redux/flow_signal'
import { identity, reducer, RemoteData, withNoResult, zero } from '@/redux/remote_data'
import { createReducer } from '@reduxjs/toolkit'
import { isActionOf } from 'typesafe-actions'
import {
  authnViaApiSignal,
  authnViaDepotSignal,
  backgroundAuthnSignal,
  registrationSignal
} from '../../authn/actions'
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
  OtpParamsGenerationFlowIndicator,
  OtpParams,
  remoteRehashSignal,
  UsernameChangeFlowIndicator,
  usernameChangeReset,
  usernameChangeSignal,
  otpParamsGenerationSignal,
  otpParamsGenerationReset,
  OtpParamsAcceptanceFlowIndicator,
  otpParamsAcceptanceSignal,
  otpParamsAcceptanceReset,
  otpResetSignal,
  OtpResetFlowIndicator,
  cancelOtpReset
} from './actions'
import {
  ServiceReleaseMailTokenResponseError,
  ServiceAcquireMailTokenResponseError,
  ServiceChangeMasterKeyResponseError,
  ServiceChangeUsernameResponseError,
  ServiceDeleteAccountResponseError,
  ServiceAcceptOtpParamsResponseError,
  ServiceResetOtpResponseError
} from '@/api/definitions'
import { DeepReadonly } from 'ts-essentials'
import { castDraft } from 'immer'
import { either } from 'fp-ts'

export default createReducer<{
  isAuthenticated: boolean;
  parametrization: string | null;
  encryptionKey: string | null;
  sessionKey: string | null;
  mailVerificationRequired: boolean;
  mail: string | null;
  mailTokenRelease: RemoteData<MailTokenReleaseFlowIndicator, string, StandardError<ServiceReleaseMailTokenResponseError>>;
  mailTokenAcquisition: RemoteData<MailTokenAcquisitionFlowIndicator, string, StandardError<ServiceAcquireMailTokenResponseError>>;
  masterKeyChange: RemoteData<MasterKeyChangeFlowIndicator, {}, StandardError<ServiceChangeMasterKeyResponseError>>;
  usernameChange: RemoteData<UsernameChangeFlowIndicator, {}, StandardError<ServiceChangeUsernameResponseError>>;
  accountDeletion: RemoteData<AccountDeletionFlowIndicator, {}, StandardError<ServiceDeleteAccountResponseError>>;
  isOtpEnabled: boolean;
  otpParamsGeneration: RemoteData<OtpParamsGenerationFlowIndicator, OtpParams, StandardError<{}>>;
  otpParamsAcceptance: RemoteData<OtpParamsAcceptanceFlowIndicator, {}, StandardError<ServiceAcceptOtpParamsResponseError>>;
  otpReset: RemoteData<OtpResetFlowIndicator, {}, StandardError<ServiceResetOtpResponseError>>;
}>(
  {
    isAuthenticated: false,
    parametrization: null,
    encryptionKey: null,
    sessionKey: null,
    mailVerificationRequired: true,
    mail: null,
    mailTokenRelease: zero(),
    mailTokenAcquisition: zero(),
    masterKeyChange: zero(),
    usernameChange: zero(),
    accountDeletion: zero(),
    isOtpEnabled: false,
    otpParamsGeneration: zero(),
    otpParamsAcceptance: zero(),
    otpReset: zero()
  },
  (builder) => builder
    .addMatcher(isActionSuccess(registrationSignal), (state, action) => {
      const flowSuccess = action.payload.data
      state.isAuthenticated = true
      state.parametrization = flowSuccess.parametrization
      state.encryptionKey = flowSuccess.encryptionKey
      state.sessionKey = flowSuccess.sessionKey
      state.mailVerificationRequired = true
    })
    .addMatcher(isActionSuccess2([authnViaApiSignal, backgroundAuthnSignal]), (state, action) => {
      const data = action.payload.data
      if (either.isRight(data.content)) {
        const userData = data.content.right
        state.isAuthenticated = true
        state.parametrization = data.parametrization
        state.encryptionKey = data.encryptionKey
        state.sessionKey = userData.sessionKey
        state.mailVerificationRequired = userData.mailVerificationRequired
        state.mail = userData.mail
      }
    })
    .addMatcher(isActionSuccess(authnViaDepotSignal), (state) => {
      state.isAuthenticated = true
      state.mailVerificationRequired = false
    })
    .addMatcher(isActionOf(mailTokenReleaseSignal), (state, action) => {
      state.mailTokenRelease = reducer(
        identity<MailTokenReleaseFlowIndicator>(),
        identity<string>(),
        identity<StandardError<ServiceReleaseMailTokenResponseError>>()
      )(state.mailTokenRelease, action.payload)
    })
    .addMatcher(isActionSuccess(mailTokenReleaseSignal), (state, action) => {
      state.mailVerificationRequired = false
      state.mail = action.payload.data
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
    .addMatcher(isActionSuccess2([masterKeyChangeSignal, remoteRehashSignal]), (state, action) => {
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
    .addMatcher(isActionOf(otpParamsGenerationSignal), (state, action) => {
      state.otpParamsGeneration = castDraft(reducer(
        identity<OtpParamsGenerationFlowIndicator>(),
        identity<DeepReadonly<OtpParams>>(),
        identity<StandardError<{}>>()
      )(state.otpParamsGeneration, action.payload))
    })
    .addMatcher(isActionOf(otpParamsGenerationReset), (state) => {
      state.otpParamsGeneration = withNoResult(state.otpParamsGeneration)
    })
    .addMatcher(isActionOf(otpParamsAcceptanceSignal), (state, action) => {
      state.otpParamsAcceptance = reducer(
        identity<OtpParamsAcceptanceFlowIndicator>(),
        () => ({}),
        identity<StandardError<ServiceAcceptOtpParamsResponseError>>()
      )(state.otpParamsAcceptance, action.payload)
    })
    .addMatcher(isActionSuccess(otpParamsAcceptanceSignal), (state) => {
      state.isOtpEnabled = true
    })
    .addMatcher(isActionOf(otpParamsAcceptanceReset), (state) => {
      state.otpParamsAcceptance = withNoResult(state.otpParamsAcceptance)
    })
    .addMatcher(isActionOf(otpResetSignal), (state, action) => {
      state.otpReset = reducer(
        identity<OtpResetFlowIndicator>(),
        () => ({}),
        identity<StandardError<ServiceResetOtpResponseError>>()
      )(state.otpReset, action.payload)
    })
    .addMatcher(isActionSuccess(otpResetSignal), (state) => {
      state.isOtpEnabled = false
    })
    .addMatcher(isActionOf(cancelOtpReset), (state) => {
      state.otpReset = withNoResult(state.otpReset)
    })
)
