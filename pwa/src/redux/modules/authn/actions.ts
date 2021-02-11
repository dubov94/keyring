import {
  ServiceRegisterResponseError,
  ServiceGetSaltResponseError,
  ServiceLogInResponseError
} from '@/api/definitions'
import { FlowSignal, StandardError } from '@/redux/flow_signal'
import { Key } from '@/redux/entities'
import { DeepReadonly } from 'ts-essentials'
import { createAction } from 'typesafe-actions'

export enum RegistrationFlowIndicator {
  GENERATING_PARAMETRIZATION = 'GENERATING_PARAMETRIZATION',
  COMPUTING_MASTER_KEY_DERIVATIVES = 'COMPUTING_MASTER_KEY_DERIVATIVES',
  MAKING_REQUEST = 'MAKING_REQUEST',
}
export interface RegistrationFlowResult {
  username: string;
  parametrization: string;
  encryptionKey: string;
  sessionKey: string;
  userKeys: Key[];
}
export const register = createAction('authn/register')<DeepReadonly<{
  username: string;
  password: string;
  mail: string;
}>>()
export const registrationSignal = createAction('authn/registration/signal')<DeepReadonly<
  FlowSignal<RegistrationFlowIndicator, RegistrationFlowResult, StandardError<ServiceRegisterResponseError>>
>>()
export const registrationReset = createAction('authn/registration/reset')()

export enum AuthnViaApiFlowIndicator {
  RETRIEVING_PARAMETRIZATION = 'API_AUTH_RETRIEVING_PARAMETRIZATION',
  COMPUTING_MASTER_KEY_DERIVATIVES = 'API_AUTH_COMPUTING_MASTER_KEY_DERIVATIVES',
  MAKING_REQUEST = 'API_AUTH_MAKING_REQUEST',
  DECRYPTING_DATA = 'API_AUTH_DECRYPTING_DATA',
}
export interface AuthnViaApiFlowResult {
  username: string;
  password: string;
  parametrization: string;
  encryptionKey: string;
  sessionKey: string;
  requiresMailVerification: boolean;
  userKeys: Key[];
}
export const logInViaApi = createAction('authn/logInViaApi')<DeepReadonly<{
  username: string;
  password: string;
}>>()
export type AuthnViaApiSignal = FlowSignal<AuthnViaApiFlowIndicator, AuthnViaApiFlowResult, StandardError<ServiceGetSaltResponseError | ServiceLogInResponseError>>
export const authnViaApiSignal = createAction('authn/viaApi/signal')<DeepReadonly<AuthnViaApiSignal>>()
export const authnViaApiReset = createAction('authn/viaApi/reset')()

export enum AuthnViaDepotFlowIndicator {
  COMPUTING_MASTER_KEY_DERIVATIVES = 'DEPOT_AUTH_COMPUTING_MASTER_KEY_DERIVATIVES',
  DECRYPTING_DATA = 'DEPOT_AUTH_DECRYPTING_DATA',
}
export enum AuthnViaDepotFlowError {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
}
export interface AuthnViaDepotFlowResult {
  username: string;
  password: string;
  userKeys: Key[];
  vaultKey: string;
}
export const logInViaDepot = createAction('authn/logInViaDepot')<DeepReadonly<{
  username: string;
  password: string;
}>>()
export const authnViaDepotSignal = createAction('authn/viaDepot/signal')<DeepReadonly<
  FlowSignal<AuthnViaDepotFlowIndicator, AuthnViaDepotFlowResult, StandardError<AuthnViaDepotFlowError>>
>>()
export const authnViaDepotReset = createAction('authn/viaDepot/reset')()

export const initiateBackgroundAuthn = createAction('authn/initiateBackgroundAuthn')<DeepReadonly<{
  username: string;
  password: string;
}>>()
export const backgroundAuthnSignal = createAction('authn/backgroundAuthnSignal')<DeepReadonly<AuthnViaApiSignal>>()
