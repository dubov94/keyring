import { StandardError } from '@/redux/flow_signal'
import { RemoteData } from '@/redux/remote_data'
import { RootState } from '@/redux/root_reducer'
import { DeepReadonly } from 'ts-essentials'
import {
  AuthnOtpProvisionFlowError,
  AuthnOtpProvisionFlowIndicator,
  AuthnViaApiFlowIndicator,
  AuthnViaApiFlowResult,
  AuthnViaDepotFlowError,
  AuthnViaDepotFlowIndicator,
  RegistrationFlowIndicator
} from './actions'
import {
  ServiceRegisterResponseError,
  ServiceGetSaltResponseError,
  ServiceLogInResponseError
} from '@/api/definitions'

export type Registration = RemoteData<RegistrationFlowIndicator, Record<string, never>, StandardError<ServiceRegisterResponseError>>
export const registration = (state: RootState): DeepReadonly<Registration> => state.authn.registration
export type AuthnViaApi = RemoteData<AuthnViaApiFlowIndicator, AuthnViaApiFlowResult, StandardError<ServiceGetSaltResponseError | ServiceLogInResponseError>>
export const authnViaApi = (state: RootState): DeepReadonly<AuthnViaApi> => state.authn.authnViaApi
export type AuthnViaDepot = RemoteData<AuthnViaDepotFlowIndicator, Record<string, never>, StandardError<AuthnViaDepotFlowError>>
export const authnViaDepot = (state: RootState): DeepReadonly<AuthnViaDepot> => state.authn.authnViaDepot
export type AuthnOtpProvision = RemoteData<AuthnOtpProvisionFlowIndicator, Record<string, never>, StandardError<AuthnOtpProvisionFlowError>>
export const authnOtpProvision = (state: RootState): DeepReadonly<AuthnOtpProvision> => state.authn.authnOtpProvision

export const backgroundAuthnError = (state: RootState): boolean => state.authn.backgroundAuthnError
