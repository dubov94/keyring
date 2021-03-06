import { StandardError } from '@/redux/flow_signal'
import { RemoteData } from '@/redux/remote_data'
import { RootState } from '@/redux/root_reducer'
import { DeepReadonly } from 'ts-essentials'
import { AuthnViaApiFlowIndicator, AuthnViaDepotFlowError, AuthnViaDepotFlowIndicator, RegistrationFlowIndicator } from './actions'
import {
  ServiceRegisterResponseError,
  ServiceGetSaltResponseError,
  ServiceLogInResponseError
} from '@/api/definitions'

export type Registration = RemoteData<RegistrationFlowIndicator, {}, StandardError<ServiceRegisterResponseError>>
export const registration = (state: RootState): DeepReadonly<Registration> => state.authn.registration
export type AuthnViaApi = RemoteData<AuthnViaApiFlowIndicator, {}, StandardError<ServiceGetSaltResponseError | ServiceLogInResponseError>>
export const authnViaApi = (state: RootState): DeepReadonly<AuthnViaApi> => state.authn.authnViaApi
export type AuthnViaDepot = RemoteData<AuthnViaDepotFlowIndicator, {}, StandardError<AuthnViaDepotFlowError>>
export const authnViaDepot = (state: RootState): DeepReadonly<AuthnViaDepot> => state.authn.authnViaDepot
