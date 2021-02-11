import { createAction } from 'typesafe-actions'
import { DeepReadonly } from 'ts-essentials'
import { FlowSignal, StandardError } from '@/redux/flow_signal'
import {
  ServiceReleaseMailTokenResponseError,
  ServiceAcquireMailTokenResponseError,
  ServiceChangeMasterKeyResponseError,
  ServiceChangeUsernameResponseError,
  ServiceDeleteAccountResponseError
} from '@/api/definitions'

export const logOut = createAction('user/account/logOut')()

export enum MailTokenReleaseFlowIndicator {
  WORKING = 'WORKING'
}
export const releaseMailToken = createAction('user/account/releaseMailToken')<DeepReadonly<{
  code: string;
}>>()
export const mailTokenReleaseSignal = createAction('user/account/mailTokenReleaseSignal')<DeepReadonly<
  FlowSignal<MailTokenReleaseFlowIndicator, {}, StandardError<ServiceReleaseMailTokenResponseError>>
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
export const masterKeyChangeSignal = createAction('user/account/masterKeyChangeSignal')<DeepReadonly<
  FlowSignal<MasterKeyChangeFlowIndicator, MasterKeyChangeData, StandardError<ServiceChangeMasterKeyResponseError>>
>>()
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

export const ejectUser = createAction('user/account/eject')()
