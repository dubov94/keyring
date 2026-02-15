import merge from 'lodash/merge'
import { DeepPartial } from 'ts-essentials'
import { ServiceKeyProto } from '@/api/definitions'
import { Key } from '@/redux/domain'
import { RegistrationFlowResult, RemoteAuthnCompletionData, AuthnViaDepotFlowResult } from '@/redux/modules/authn/actions'
import { NIL_KEY_ID } from '@/redux/modules/user/keys/actions'
import { Clique } from '@/redux/modules/user/keys/selectors'
import { defaultMailVerification } from '../modules/user/account/actions'
import { DepotActivationData } from '../modules/depot/actions'

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
  parametrization: 'parametrization',
  encryptionKey: 'encryptionKey',
  sessionKey: 'sessionKey',
  mailTokenId: 'mailTokenId'
}, partial)

export const createRemoteAuthnCompleteResult = (
  partial: DeepPartial<RemoteAuthnCompletionData>
): RemoteAuthnCompletionData => merge({
  username: 'username',
  password: 'password',
  parametrization: 'parametrization',
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
  password: 'password',
  userKeys: [],
  depotKey: 'depotKey',
  otpToken: null
})
