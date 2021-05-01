import { StandardError } from '@/redux/flow_signal'
import { RemoteData } from '@/redux/remote_data'
import { RootState } from '@/redux/root_reducer'
import { DeepReadonly } from 'ts-essentials'
import {
  AccountDeletionFlowIndicator,
  MailTokenAcquisitionFlowIndicator,
  MailTokenReleaseFlowIndicator,
  MasterKeyChangeFlowIndicator,
  UsernameChangeFlowIndicator
} from './actions'
import {
  ServiceReleaseMailTokenResponseError,
  ServiceChangeUsernameResponseError,
  ServiceChangeMasterKeyResponseError,
  ServiceAcquireMailTokenResponseError,
  ServiceDeleteAccountResponseError
} from '@/api/definitions'

export const isAuthenticated = (state: RootState): boolean => state.user.account.isAuthenticated
export const canAccessApi = (state: RootState): boolean => state.user.account.sessionKey !== null
export const mailVerificationRequired = (state: RootState): boolean => state.user.account.mailVerificationRequired
export const accountMail = (state: RootState): string | null => state.user.account.mail

export type MailTokenAcquisition = RemoteData<MailTokenAcquisitionFlowIndicator, string, StandardError<ServiceAcquireMailTokenResponseError>>
export const mailTokenAcquisition = (state: RootState): DeepReadonly<MailTokenAcquisition> => state.user.account.mailTokenAcquisition

export type MailTokenRelease = RemoteData<MailTokenReleaseFlowIndicator, {}, StandardError<ServiceReleaseMailTokenResponseError>>
export const mailTokenRelease = (state: RootState): DeepReadonly<MailTokenRelease> => state.user.account.mailTokenRelease

export type UsernameChange = RemoteData<UsernameChangeFlowIndicator, {}, StandardError<ServiceChangeUsernameResponseError>>
export const usernameChange = (state: RootState): DeepReadonly<UsernameChange> => state.user.account.usernameChange

export type MasterKeyChange = RemoteData<MasterKeyChangeFlowIndicator, {}, StandardError<ServiceChangeMasterKeyResponseError>>
export const masterKeyChange = (state: RootState): DeepReadonly<MasterKeyChange> => state.user.account.masterKeyChange

export type AccountDeletion = RemoteData<AccountDeletionFlowIndicator, {}, StandardError<ServiceDeleteAccountResponseError>>
export const accountDeletion = (state: RootState): DeepReadonly<AccountDeletion> => state.user.account.accountDeletion
