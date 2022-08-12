import { DeepReadonly } from 'ts-essentials'
import {
  ServiceReleaseMailTokenResponseError,
  ServiceChangeUsernameResponseError,
  ServiceChangeMasterKeyResponseError,
  ServiceAcquireMailTokenResponseError,
  ServiceDeleteAccountResponseError,
  ServiceAcceptOtpParamsResponseError,
  ServiceResetOtpResponseError,
  ServiceFeaturePrompt
} from '@/api/definitions'
import { StandardError } from '@/redux/flow_signal'
import { RemoteData } from '@/redux/remote_data'
import { RootState } from '@/redux/root_reducer'
import {
  AccountDeletionFlowIndicator,
  MailTokenAcquisitionData,
  MailTokenAcquisitionFlowIndicator,
  MailTokenReleaseFlowIndicator,
  MasterKeyChangeFlowIndicator,
  OtpParams,
  OtpParamsAcceptanceFlowIndicator,
  OtpParamsGenerationFlowIndicator,
  OtpResetFlowIndicator,
  UsernameChangeFlowIndicator
} from './actions'

export const isAuthenticated = (state: RootState): boolean => state.user.account.isAuthenticated
export const canAccessApi = (state: RootState): boolean => state.user.account.sessionKey !== null
export const mailVerificationRequired = (state: RootState): boolean => state.user.account.mailVerification.required
export const mailVerificationTokenId = (state: RootState): string => state.user.account.mailVerification.tokenId
export const accountMail = (state: RootState): string | null => state.user.account.mail

export type MailTokenAcquisition = RemoteData<MailTokenAcquisitionFlowIndicator, MailTokenAcquisitionData, StandardError<ServiceAcquireMailTokenResponseError>>
export const mailTokenAcquisition = (state: RootState): DeepReadonly<MailTokenAcquisition> => state.user.account.mailTokenAcquisition

export type MailTokenRelease = RemoteData<MailTokenReleaseFlowIndicator, {}, StandardError<ServiceReleaseMailTokenResponseError>>
export const mailTokenRelease = (state: RootState): DeepReadonly<MailTokenRelease> => state.user.account.mailTokenRelease

export type UsernameChange = RemoteData<UsernameChangeFlowIndicator, {}, StandardError<ServiceChangeUsernameResponseError>>
export const usernameChange = (state: RootState): DeepReadonly<UsernameChange> => state.user.account.usernameChange

export type MasterKeyChange = RemoteData<MasterKeyChangeFlowIndicator, {}, StandardError<ServiceChangeMasterKeyResponseError>>
export const masterKeyChange = (state: RootState): DeepReadonly<MasterKeyChange> => state.user.account.masterKeyChange

export type AccountDeletion = RemoteData<AccountDeletionFlowIndicator, {}, StandardError<ServiceDeleteAccountResponseError>>
export const accountDeletion = (state: RootState): DeepReadonly<AccountDeletion> => state.user.account.accountDeletion

export const isOtpEnabled = (state: RootState): boolean => state.user.account.isOtpEnabled

export type OtpParamsGeneration = RemoteData<OtpParamsGenerationFlowIndicator, OtpParams, StandardError<never>>
export const otpParamsGeneration = (state: RootState): DeepReadonly<OtpParamsGeneration> => state.user.account.otpParamsGeneration

export type OtpParamsAcceptance = RemoteData<OtpParamsAcceptanceFlowIndicator, {}, StandardError<ServiceAcceptOtpParamsResponseError>>
export const otpParamsAcceptance = (state: RootState): DeepReadonly<OtpParamsAcceptance> => state.user.account.otpParamsAcceptance

export type OtpReset = RemoteData<OtpResetFlowIndicator, {}, StandardError<ServiceResetOtpResponseError>>
export const otpReset = (state: RootState): DeepReadonly<OtpReset> => state.user.account.otpReset

export const featurePrompts = (state: RootState): DeepReadonly<ServiceFeaturePrompt[]> => state.user.account.featurePrompts
