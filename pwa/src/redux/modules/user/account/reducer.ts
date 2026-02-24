import { createReducer } from '@reduxjs/toolkit'
import { function as fn, option } from 'fp-ts'
import { castDraft } from 'immer'
import { DeepReadonly } from 'ts-essentials'
import { isActionOf } from 'typesafe-actions'
import {
  ServiceReleaseMailTokenResponseError,
  ServiceAcquireMailTokenResponseError,
  ServiceChangeMasterKeyResponseError,
  ServiceChangeUsernameResponseError,
  ServiceDeleteAccountResponseError,
  ServiceAcceptOtpParamsResponseError,
  ServiceResetOtpResponseError,
  ServiceFeaturePrompt
} from '@/api/definitions'
import { isActionSuccess, isActionSuccess2, StandardError } from '@/redux/flow_signal'
import {
  authnViaDepotSignal,
  registrationSignal,
  remoteAuthnComplete
} from '@/redux/modules/authn/actions'
import { identity, reducer, RemoteData, withNoResult, zero } from '@/redux/remote_data'
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
  cancelOtpReset,
  featureAckSignal,
  MailVerification,
  defaultMailVerification,
  MailTokenAcquisitionData
} from './actions'

export default createReducer<{
  isAuthenticated: boolean;
  parametrization: string | null;
  authDigest: string | null;
  encryptionKey: string | null;
  sessionKey: string | null;
  featurePrompts: ServiceFeaturePrompt[];
  mailVerification: MailVerification;
  mail: string | null;
  mailTokenRelease: RemoteData<MailTokenReleaseFlowIndicator, string, StandardError<ServiceReleaseMailTokenResponseError>>;
  mailTokenAcquisition: RemoteData<MailTokenAcquisitionFlowIndicator, MailTokenAcquisitionData, StandardError<ServiceAcquireMailTokenResponseError>>;
  masterKeyChange: RemoteData<MasterKeyChangeFlowIndicator, Record<string, never>, StandardError<ServiceChangeMasterKeyResponseError>>;
  usernameChange: RemoteData<UsernameChangeFlowIndicator, Record<string, never>, StandardError<ServiceChangeUsernameResponseError>>;
  accountDeletion: RemoteData<AccountDeletionFlowIndicator, Record<string, never>, StandardError<ServiceDeleteAccountResponseError>>;
  isOtpEnabled: boolean;
  otpToken: string | null;
  otpParamsGeneration: RemoteData<OtpParamsGenerationFlowIndicator, OtpParams, StandardError<never>>;
  otpParamsAcceptance: RemoteData<OtpParamsAcceptanceFlowIndicator, Record<string, never>, StandardError<ServiceAcceptOtpParamsResponseError>>;
  otpReset: RemoteData<OtpResetFlowIndicator, Record<string, never>, StandardError<ServiceResetOtpResponseError>>;
}>(
  {
    isAuthenticated: false,
    parametrization: null,
    authDigest: null,
    encryptionKey: null,
    sessionKey: null,
    featurePrompts: [],
    mailVerification: {
      required: false,
      tokenId: ''
    },
    mail: null,
    mailTokenRelease: zero(),
    mailTokenAcquisition: zero(),
    masterKeyChange: zero(),
    usernameChange: zero(),
    accountDeletion: zero(),
    isOtpEnabled: false,
    otpToken: null,
    otpParamsGeneration: zero(),
    otpParamsAcceptance: zero(),
    otpReset: zero()
  },
  (builder) => builder
    .addMatcher(isActionSuccess(registrationSignal), (state, action) => {
      const flowSuccess = action.payload.data
      state.isAuthenticated = true
      state.parametrization = flowSuccess.parametrization
      state.authDigest = flowSuccess.authDigest
      state.encryptionKey = flowSuccess.encryptionKey
      state.sessionKey = flowSuccess.sessionKey
      state.mailVerification = { required: true, tokenId: flowSuccess.mailTokenId }
    })
    .addMatcher(isActionOf(remoteAuthnComplete), (state, action) => {
      state.isAuthenticated = true
      state.parametrization = action.payload.parametrization
      state.authDigest = action.payload.authDigest
      state.encryptionKey = action.payload.encryptionKey
      state.sessionKey = action.payload.sessionKey
      state.featurePrompts = castDraft(action.payload.featurePrompts)
      state.mailVerification = action.payload.mailVerification
      state.mail = action.payload.mail
      state.isOtpEnabled = action.payload.isOtpEnabled
      state.otpToken = action.payload.otpToken
    })
    .addMatcher(isActionSuccess(authnViaDepotSignal), (state, action) => {
      state.isAuthenticated = true
      state.mailVerification = defaultMailVerification()
      state.otpToken = action.payload.data.otpToken
    })
    .addMatcher(isActionOf(mailTokenReleaseSignal), (state, action) => {
      state.mailTokenRelease = reducer(
        identity<MailTokenReleaseFlowIndicator>(),
        identity<string>(),
        identity<StandardError<ServiceReleaseMailTokenResponseError>>()
      )(state.mailTokenRelease, action.payload)
    })
    .addMatcher(isActionSuccess(mailTokenReleaseSignal), (state, action) => {
      state.mailVerification = defaultMailVerification()
      state.mail = action.payload.data
    })
    .addMatcher(isActionOf(mailTokenReleaseReset), (state) => {
      state.mailTokenRelease = withNoResult(state.mailTokenRelease)
    })
    .addMatcher(isActionOf(mailTokenAcquisitionSignal), (state, action) => {
      state.mailTokenAcquisition = reducer(
        identity<MailTokenAcquisitionFlowIndicator>(),
        identity<MailTokenAcquisitionData>(),
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
      state.authDigest = action.payload.data.newAuthDigest
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
        identity<StandardError<never>>()
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
    .addMatcher(isActionSuccess(otpParamsAcceptanceSignal), (state, action) => {
      state.isOtpEnabled = true
      state.otpToken = fn.pipe(
        action.payload.data,
        option.map(fn.identity),
        option.getOrElse<string | null>(() => null)
      )
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
      state.otpToken = null
    })
    .addMatcher(isActionOf(cancelOtpReset), (state) => {
      state.otpReset = withNoResult(state.otpReset)
    })
    .addMatcher(isActionSuccess(featureAckSignal), (state, action) => {
      state.featurePrompts = state.featurePrompts.filter(
        (item) => item.featureType !== action.payload.data)
    })
)
