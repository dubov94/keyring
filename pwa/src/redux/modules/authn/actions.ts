import {
  ServiceRegisterResponseError,
  ServiceGetSaltResponseError,
  ServiceLogInResponseError,
  ServiceProvideOtpResponseError,
  ServiceFeaturePrompt
} from '@/api/definitions'
import { FlowSignal, StandardError } from '@/redux/flow_signal'
import { Key } from '@/redux/domain'
import { DeepReadonly } from 'ts-essentials'
import { createAction } from 'typesafe-actions'
import { either, option } from 'fp-ts'
import { MailVerification } from '../user/account/actions'

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
  mailTokenId: string;
}
export const register = createAction('authn/register')<DeepReadonly<{
  username: string;
  password: string;
  mail: string;
  captchaToken: string;
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
export interface AuthnViaApiParams {
  username: string;
  password: string;
  parametrization: string;
  encryptionKey: string;
}
export interface OtpContext {
  authnKey: string;
  attemptsLeft: number;
}
export interface UserData {
  sessionKey: string;
  featurePrompts: ServiceFeaturePrompt[];
  mailVerification: MailVerification;
  mail: string | null;
  userKeys: Key[];
}
export type AuthnViaApiFlowResult = AuthnViaApiParams & {
  content: either.Either<OtpContext, UserData>;
}
export const logInViaApi = createAction('authn/logInViaApi')<DeepReadonly<{
  username: string;
  password: string;
}>>()
export type AuthnViaApiSignal = FlowSignal<AuthnViaApiFlowIndicator, AuthnViaApiFlowResult, StandardError<ServiceGetSaltResponseError | ServiceLogInResponseError>>
export const authnViaApiSignal = createAction('authn/viaApi/signal')<DeepReadonly<AuthnViaApiSignal>>()
export const authnViaApiReset = createAction('authn/viaApi/reset')()

export enum AuthnOtpProvisionFlowIndicator {
  MAKING_REQUEST = 'MAKING_REQUEST',
  DECRYPTING_DATA = 'DECRYPTING_DATA',
}
export const provideOtp = createAction('authn/provideOtp')<DeepReadonly<{
  credentialParams: AuthnViaApiParams;
  authnKey: string;
  otp: string;
  yieldTrustedToken: boolean;
}>>()
interface AuthnOtpProvisionFlowResult {
  credentialParams: AuthnViaApiParams;
  trustedToken: option.Option<string>;
  userData: UserData;
}
export interface AuthnOtpProvisionFlowError {
  error: ServiceProvideOtpResponseError;
  attemptsLeft: number;
}
export type AuthnOtpProvisionSignal = FlowSignal<AuthnOtpProvisionFlowIndicator, AuthnOtpProvisionFlowResult, StandardError<AuthnOtpProvisionFlowError>>
export const authnOtpProvisionSignal = createAction('authn/otpProvision/signal')<DeepReadonly<AuthnOtpProvisionSignal>>()
export const authnOtpProvisionReset = createAction('authn/otpProvision/reset')()

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
  depotKey: string;
  otpToken: string | null;
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
export const backgroundRemoteAuthnSignal = createAction('authn/backgroundRemoteAuthnSignal')<DeepReadonly<AuthnViaApiSignal>>()
export const backgroundOtpProvisionSignal = createAction('authn/backgroundOtpProvisionSignal')<DeepReadonly<AuthnOtpProvisionSignal>>()

export type RemoteAuthnCompletionData = AuthnViaApiParams & UserData & {
  isOtpEnabled: boolean;
  otpToken: string | null;
}
export const remoteAuthnComplete = createAction('authn/remoteAuthnComplete')<DeepReadonly<RemoteAuthnCompletionData>>()

export const backgroundAuthnError = createAction('authn/backgroundAuthnError')()
