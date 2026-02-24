import merge from 'lodash/merge'
import { DeepPartial } from 'ts-essentials'
import { ServiceKeyProto } from '@/api/definitions'
import { MasterKeyDerivatives } from '@/cryptography/sodium_client'
import { Key } from '@/redux/domain'
import {
  RegistrationFlowResult,
  RemoteAuthnCompletionData,
  AuthnViaDepotFlowResult,
  AuthnInputKind,
  Password as PasswordInput,
  WebAuthn as WebAuthnInput
} from '@/redux/modules/authn/actions'
import {
  Rehydration as DepotRehydration,
  RehydrationWebAuthn as DepotRehydrationWebAuthn,
  DepotActivationData,
  WebAuthn,
  WebAuthnResult
} from '@/redux/modules/depot/actions'
import { defaultMailVerification, MasterKeyChangeData } from '@/redux/modules/user/account/actions'
import { NIL_KEY_ID } from '@/redux/modules/user/keys/actions'
import { Clique } from '@/redux/modules/user/keys/selectors'

export const createKeyProto = (partial: DeepPartial<ServiceKeyProto>): ServiceKeyProto => merge({
  uid: '',
  password: {
    value: '',
    tags: []
  },
  attrs: {
    isShadow: false,
    parentUid: NIL_KEY_ID,
    isPinned: false
  },
  creationTimeInMillis: ''
}, partial)

export const createUserKey = (partial: DeepPartial<Key>): Key => merge({
  identifier: '',
  attrs: {
    isShadow: false,
    parent: NIL_KEY_ID,
    isPinned: false
  },
  creationTimeInMillis: 0,
  value: '',
  tags: []
}, partial)

export const createRegistrationFlowResult = (
  partial: DeepPartial<RegistrationFlowResult>
): RegistrationFlowResult => merge({
  userId: 'userId',
  username: 'username',
  password: 'password',
  parametrization: 'parametrization',
  authDigest: 'authDigest',
  encryptionKey: 'encryptionKey',
  sessionKey: 'sessionKey',
  mailTokenId: 'mailTokenId'
}, partial)

export const createPasswordInput = (
  password = 'password'
): PasswordInput => ({
  kind: AuthnInputKind.PASSWORD,
  password
})

export const createWebAuthnInput = (
  credentialId = 'credentialId'
): WebAuthnInput => ({
  kind: AuthnInputKind.WEB_AUTHN,
  credentialId
})

export const createRemoteAuthnCompleteResult = (
  partial: DeepPartial<RemoteAuthnCompletionData>
): RemoteAuthnCompletionData => merge({
  username: 'username',
  authnInput: createPasswordInput(),
  parametrization: 'parametrization',
  authDigest: 'authDigest',
  encryptionKey: 'encryptionKey',
  userId: 'userId',
  sessionKey: 'sessionKey',
  featurePrompts: [],
  mailVerification: defaultMailVerification(),
  mail: 'mail@example.com',
  userKeys: [],
  isOtpEnabled: false,
  otpToken: null
}, partial)

export const createClique = (partial: DeepPartial<Clique>): Clique => merge({
  name: '',
  parent: null,
  shadows: [],
  busyness: 0
}, partial)

export const createDepotActivationData = (
  partial: DeepPartial<DepotActivationData>
): DepotActivationData => merge({
  username: 'username',
  salt: 'salt',
  hash: 'hash',
  depotKey: 'depotKey'
}, partial)

export const createAuthnViaDepotFlowResult = (
  partial: DeepPartial<AuthnViaDepotFlowResult>
): AuthnViaDepotFlowResult => merge({
  username: 'username',
  authnInput: createPasswordInput(),
  userKeys: [],
  depotKey: 'depotKey',
  otpToken: null
}, partial)

export const createDepotRehydration = (
  partial: DeepPartial<DepotRehydration>
): DepotRehydration => merge({
  username: 'username',
  userId: 'userId',
  salt: 'salt',
  hash: 'hash',
  vault: 'vault',
  encryptedOtpToken: 'encryptedOtpToken',
  webAuthnCredentialId: null,
  webAuthnSalt: null,
  webAuthnEncryptedLocalDerivatives: null,
  webAuthnEncryptedRemoteDerivatives: null
}, partial)

export const createDepotRehydrationWebAuthn = (
  partial: DeepPartial<DepotRehydrationWebAuthn>
): DepotRehydrationWebAuthn => merge({
  webAuthnCredentialId: 'webAuthnCredentialId',
  webAuthnSalt: 'webAuthnSalt',
  webAuthnEncryptedLocalDerivatives: 'webAuthnEncryptedLocalDerivatives',
  webAuthnEncryptedRemoteDerivatives: 'webAuthnEncryptedRemoteDerivatives'
}, partial)

export const createMasterKeyDerivatives = (
  partial: DeepPartial<MasterKeyDerivatives>
): MasterKeyDerivatives => merge({
  authDigest: 'authDigest',
  encryptionKey: 'encryptionKey'
}, partial)

export const createMasterKeyChangeData = (
  partial: DeepPartial<MasterKeyChangeData>
): MasterKeyChangeData => merge({
  newMasterKey: 'newMasterKey',
  newParametrization: 'newParametrization',
  newAuthDigest: 'newAuthDigest',
  newEncryptionKey: 'newEncryptionKey',
  newSessionKey: 'newSessionKey'
}, partial)

export const createWebAuthnFlowResult = (
  partial: DeepPartial<WebAuthn>
): WebAuthn => merge({
  credentialId: 'credentialId',
  salt: 'salt'
}, partial)

export const createWebAuthnResult = (
  partial: DeepPartial<WebAuthnResult>
): WebAuthnResult => merge({
  result: 'webAuthnResult'
}, partial)
