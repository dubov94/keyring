import { DeepReadonly } from 'ts-essentials'
import { createAction } from 'typesafe-actions'
import { FlowSignal, StandardError } from '@/redux/flow_signal'

export interface RehydrationCredentials {
  username: string | null;
  userId: string | null;
  salt: string | null;
  hash: string | null;
  vault: string | null;
  encryptedOtpToken: string | null;
}
export interface RehydrationWebAuthn {
  webAuthnCredentialId: string | null;
  webAuthnSalt: string | null;
  webAuthnEncryptedLocalDerivatives: string | null;
  webAuthnEncryptedRemoteDerivatives: string | null;
}
export type Rehydration = RehydrationCredentials & RehydrationWebAuthn
export const rehydration = createAction('depot/rehydration')<DeepReadonly<Rehydration>>()

export const newVault = createAction('depot/newVault')<string>()
export const newEncryptedOtpToken = createAction('depot/newEncryptedOtpToken')<string | null>()
export const newWebAuthnLocalDerivatives = createAction('depot/newWebAuthnLocalDerivatives')<string>()
export const newWebAuthnRemoteDerivatives = createAction('depot/newWebAuthnRemoteDerivatives')<string>()

export const generateDepotKeys = createAction('depot/generateKeys')<DeepReadonly<{
  username: string;
  password: string;
}>>()
export interface DepotActivationData {
  username: string;
  salt: string;
  hash: string;
  depotKey: string;
}
export const depotActivationData = createAction('depot/activationData')<DeepReadonly<DepotActivationData>>()

export const toggleDepot = createAction('depot/toggleDepot')<boolean>()
export const clearDepot = createAction('depot/clear')()

export enum WebAuthnFlowIndicator {
  WORKING = 'WORKING'
}
export type WebAuthn = {
  credentialId: string;
  salt: string;
}
export const toggleWebAuthn = createAction('depot/toggleWebAuthn')<boolean>()
export const webAuthnSignal = createAction('depot/webAuthnSignal')<DeepReadonly<
  FlowSignal<WebAuthnFlowIndicator, WebAuthn | null, StandardError<never>>
>>()
export interface WebAuthnResult {
  result: string;
}
export const webAuthnResult = createAction('depot/webAuthnResult')<DeepReadonly<WebAuthnResult>>()
export const webAuthnRequest = createAction('depot/readWebAuthn')<DeepReadonly<{
  credentialId: string;
}>>()
export const webAuthnInterruption = createAction('depot/webAuthnInterruption')()
