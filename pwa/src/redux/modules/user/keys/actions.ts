import { DeepReadonly } from 'ts-essentials'
import { Key, Password } from '@/redux/entities'
import { StandardError, FlowSignal } from '@/redux/flow_signal'
import { createAction } from 'typesafe-actions'

export enum OperationIndicator {
  WORKING = 'WORKING',
}
export const emplace = createAction('user/keys/emplace')<DeepReadonly<Key[]>>()
export const create = createAction('user/keys/create')<DeepReadonly<Password>>()
export const creationSignal = createAction('user/keys/creationSignal')<DeepReadonly<FlowSignal<OperationIndicator, Key, StandardError<{}>>>>()
export const update = createAction('user/keys/update')<DeepReadonly<Key>>()
export const updationSignal = createAction('user/keys/updationSignal')<DeepReadonly<FlowSignal<OperationIndicator, Key, StandardError<{}>>>>()
export const delete_ = createAction('user/keys/delete')<DeepReadonly<string>>()
export const deletionSignal = createAction('user/keys/deletionSignal')<DeepReadonly<FlowSignal<OperationIndicator, string, StandardError<{}>>>>()
