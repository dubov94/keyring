import merge from 'lodash/merge'
import { DeepPartial } from 'ts-essentials'
import { ServiceKeyProto } from '@/api/definitions'
import { Key } from '@/redux/domain'
import { RegistrationFlowResult } from '@/redux/modules/authn/actions'
import { NIL_KEY_ID } from '@/redux/modules/user/keys/actions'
import { Clique } from '@/redux/modules/user/keys/selectors'

export const createKeyProto = (partial: DeepPartial<ServiceKeyProto>): ServiceKeyProto => merge({
  identifier: '',
  password: {
    value: '',
    tags: []
  },
  attrs: {
    isShadow: false,
    parent: NIL_KEY_ID
  },
  creationTimeInMillis: ''
}, partial)

export const createUserKey = (partial: DeepPartial<Key>): Key => merge({
  identifier: '',
  attrs: { isShadow: false, parent: NIL_KEY_ID },
  creationTimeInMillis: 0,
  value: '',
  tags: []
}, partial)

export const createRegistrationFlowResult = (
  partial: DeepPartial<RegistrationFlowResult>
): RegistrationFlowResult => merge({
  username: 'username',
  parametrization: 'parametrization',
  encryptionKey: 'encryptionKey',
  sessionKey: 'sessionKey'
}, partial)

export const createClique = (partial: DeepPartial<Clique>): Clique => merge({
  name: '',
  parent: null,
  shadows: [],
  busyness: 0
}, partial)
