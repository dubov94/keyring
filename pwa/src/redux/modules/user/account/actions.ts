import { option } from 'fp-ts'
import { DeepReadonly } from 'ts-essentials'
import { createAction } from 'typesafe-actions'
import {
  ServiceReleaseMailTokenResponseError,
  ServiceAcquireMailTokenResponseError,
  ServiceChangeMasterKeyResponseError,
  ServiceChangeUsernameResponseError,
  ServiceDeleteAccountResponseError,
  ServiceAcceptOtpParamsResponseError,
  ServiceResetOtpResponseError,
  ServiceFeatureType
} from '@/api/definitions'
import { FlowSignal, StandardError } from '@/redux/flow_signal'

export enum LogoutTrigger {
  USER_REQUEST = 'USER_REQUEST',
  SESSION_EXPIRATION = 'SESSION_EXPIRATION',
  BACKGROUND_AUTHN_FAILURE = 'BACKGROUND_AUTHN_FAILURE'
}
export const logOut = createAction('user/account/logOut')<LogoutTrigger>()

export enum MailTokenReleaseFlowIndicator {
  WORKING = 'WORKING'
}
export const releaseMailToken = createAction('user/account/releaseMailToken')<DeepReadonly<{
  code: string;
}>>()
export const mailTokenReleaseSignal = createAction('user/account/mailTokenReleaseSignal')<DeepReadonly<
  FlowSignal<MailTokenReleaseFlowIndicator, string, StandardError<ServiceReleaseMailTokenResponseError>>
>>()
export const mailTokenReleaseReset = createAction('user/account/mailTokenReleaseReset')()

export enum MailTokenAcquisitionFlowIndicator {
  COMPUTING_MASTER_KEY_DERIVATIVES = 'COMPUTING_MASTER_KEY_DERIVATIVES',
  MAKING_REQUEST = 'MAKING_REQUEST'
}
export const acquireMailToken = createAction('user/account/acquireMailToken')<DeepReadonly<{
  mail: string;
  password: string;
}>>()
export const mailTokenAcquisitionSignal = createAction('user/account/mailTokenAcquisitionSignal')<DeepReadonly<
  FlowSignal<MailTokenAcquisitionFlowIndicator, string, StandardError<ServiceAcquireMailTokenResponseError>>
>>()
export const mailTokenAcquisitionReset = createAction('user/account/mailTokenAcquisitionReset')()

export enum MasterKeyChangeFlowIndicator {
  REENCRYPTING = 'REENCRYPTING',
  MAKING_REQUEST = 'MAKING_REQUEST'
}
export const changeMasterKey = createAction('user/account/changeMasterKey')<DeepReadonly<{
  current: string;
  renewal: string;
}>>()
export interface MasterKeyChangeData {
  newMasterKey: string;
  newParametrization: string;
  newEncryptionKey: string;
  newSessionKey: string;
}
export type MasterKeyChangeSignal = FlowSignal<MasterKeyChangeFlowIndicator, MasterKeyChangeData, StandardError<ServiceChangeMasterKeyResponseError>>
export const masterKeyChangeSignal = createAction('user/account/masterKeyChangeSignal')<DeepReadonly<MasterKeyChangeSignal>>()
export const masterKeyChangeReset = createAction('user/account/masterKeyChangeReset')()

export enum UsernameChangeFlowIndicator {
  COMPUTING_MASTER_KEY_DERIVATIVES = 'COMPUTING_MASTER_KEY_DERIVATIVES',
  MAKING_REQUEST = 'MAKING_REQUEST'
}
export interface UsernameChangeData {
  before: string;
  update: string;
}
export const changeUsername = createAction('user/account/changeUsername')<DeepReadonly<{
  username: string;
  password: string;
}>>()
export const usernameChangeSignal = createAction('user/account/usernameChangeSignal')<DeepReadonly<
  FlowSignal<UsernameChangeFlowIndicator, UsernameChangeData, StandardError<ServiceChangeUsernameResponseError>>
>>()
export const usernameChangeReset = createAction('user/account/usernameChangeReset')()

export enum AccountDeletionFlowIndicator {
  COMPUTING_MASTER_KEY_DERIVATIVES = 'COMPUTING_MASTER_KEY_DERIVATIVES',
  MAKING_REQUEST = 'MAKING_REQUEST'
}
export const deleteAccount = createAction('user/account/deleteAccount')<DeepReadonly<{
  password: string;
}>>()
export const accountDeletionSignal = createAction('user/account/accountDeletionSignal')<DeepReadonly<
  FlowSignal<AccountDeletionFlowIndicator, {}, StandardError<ServiceDeleteAccountResponseError>>
>>()
export const accountDeletionReset = createAction('user/account/accountDeletionReset')()

export const remoteCredentialsMismatchLocal = createAction('user/account/remoteCredentialsMismatchLocal')()
export const localOtpTokenFailure = createAction('user/account/localOtpTokenFailure')()

export const remoteRehashSignal = createAction('user/account/remoteRehashSignal')<DeepReadonly<MasterKeyChangeSignal>>()

export enum OtpParamsGenerationFlowIndicator {
  MAKING_REQUEST = 'MAKING_REQUEST'
}
export interface OtpParams {
  otpParamsId: string;
  sharedSecret: string;
  scratchCodes: string[];
  keyUri: string;
  qrcDataUrl: string;
}
export const generateOtpParams = createAction('user/account/generateOtpParams')()
export const otpParamsGenerationSignal = createAction('user/account/otpParamsGenerationSignal')<DeepReadonly<
  FlowSignal<OtpParamsGenerationFlowIndicator, OtpParams, StandardError<never>>
>>()
export const otpParamsGenerationReset = createAction('user/account/otpParamsGenerationReset')()

export enum OtpParamsAcceptanceFlowIndicator {
  MAKING_REQUEST = 'MAKING_REQUEST'
}
export const acceptOtpParams = createAction('user/account/acceptOtpParams')<DeepReadonly<{
  otpParamsId: string;
  otp: string;
}>>()
export const otpParamsAcceptanceSignal = createAction('user/account/otpParamsAcceptanceSignal')<DeepReadonly<
  FlowSignal<OtpParamsAcceptanceFlowIndicator, option.Option<string>, StandardError<ServiceAcceptOtpParamsResponseError>>
>>()
export const otpParamsAcceptanceReset = createAction('user/account/otpParamsAcceptanceReset')()

export enum OtpResetFlowIndicator {
  MAKING_REQUEST = 'MAKING_REQUEST'
}
export const resetOtp = createAction('user/account/resetOtp')<DeepReadonly<{
  otp: string;
}>>()
export const otpResetSignal = createAction('user/account/otpResetSignal')<DeepReadonly<
  FlowSignal<OtpResetFlowIndicator, {}, StandardError<ServiceResetOtpResponseError>>
>>()
export const cancelOtpReset = createAction('user/account/cancelOtpReset')()

export const ackFeaturePrompt = createAction('user/account/ackFeaturePrompt')<ServiceFeatureType>()
export const featureAckSignal = createAction('user/account/featureAckSignal')<DeepReadonly<
  FlowSignal<never, ServiceFeatureType, StandardError<never>>
>>()
