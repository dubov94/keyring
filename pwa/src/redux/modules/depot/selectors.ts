import { function as fn, option } from 'fp-ts'
import { DeepReadonly } from 'ts-essentials'
import { StandardError } from '@/redux/flow_signal'
import { data, RemoteData } from '@/redux/remote_data'
import { RootState } from '@/redux/root_reducer'
import { WebAuthn, WebAuthnFlowIndicator } from './actions'

export const isDepotActive = (state: RootState): boolean => state.depot.persisted
export const depotUsername = (state: RootState): string | null => state.depot.credentials?.username
export type WebAuthnData = RemoteData<WebAuthnFlowIndicator, DeepReadonly<WebAuthn | null>, StandardError<never>>
export const webAuthnData = (state: RootState): WebAuthnData => state.depot.webAuthnData

type Snapshot = {
  userId: string | null;
  username: string | null;
  salt: string | null;
  hash: string | null;
  vault: string | null;
  encryptedOtpToken: string | null;
  webAuthnCredentialId: string | null;
  webAuthnSalt: string | null;
  webAuthnEncryptedLocalDerivatives: string | null;
  webAuthnEncryptedRemoteDerivatives: string | null;
}

const emptyState = (): Snapshot => ({
  userId: null,
  username: null,
  salt: null,
  hash: null,
  vault: null,
  encryptedOtpToken: null,
  webAuthnCredentialId: null,
  webAuthnSalt: null,
  webAuthnEncryptedLocalDerivatives: null,
  webAuthnEncryptedRemoteDerivatives: null
})

export const snapshot = (state: RootState): Snapshot => {
  const { depot } = state
  if (!depot.persisted) {
    return emptyState()
  }
  const { credentials } = state.depot
  if (credentials === null) {
    return emptyState()
  }
  const webAuthnData = fn.pipe(
    depot.webAuthnData,
    data,
    option.getOrElse<WebAuthn | null>(() => null)
  )
  return {
    userId: depot.userId,
    username: credentials.username,
    salt: credentials.salt,
    hash: credentials.hash,
    vault: depot.vault,
    encryptedOtpToken: depot.encryptedOtpToken,
    webAuthnCredentialId: webAuthnData?.credentialId ?? null,
    webAuthnSalt: webAuthnData?.salt ?? null,
    webAuthnEncryptedLocalDerivatives: depot.webAuthnEncryptedLocalDerivatives,
    webAuthnEncryptedRemoteDerivatives: depot.webAuthnEncryptedRemoteDerivatives
  }
}
