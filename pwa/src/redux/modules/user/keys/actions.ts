import { function as fn, option, readonlyArray, string } from 'fp-ts'
import { DeepReadonly } from 'ts-essentials'
import { createAction } from 'typesafe-actions'
import { Key, Password, WithKeyAttrs, WithKeyId } from '@/redux/domain'
import { StandardError, FlowSignal } from '@/redux/flow_signal'
import { Clique, getCliqueRepr, getCliqueRoot } from './selectors'

export const extractPassword = <T extends DeepReadonly<Password>>(object: T): DeepReadonly<Password> => ({
  value: object.value,
  tags: object.tags
})

export enum OperationIndicator {
  WORKING = 'WORKING',
}
export interface OperationMetadata {
  uid: string;
}
export interface WithClique {
  clique: string;
}
export const emplace = createAction('user/keys/emplace')<DeepReadonly<Key[]>>()
export const import_ = createAction('user/keys/import')<DeepReadonly<Password[]>>()
export const importSignal = createAction('user/keys/importSignal')<DeepReadonly<FlowSignal<OperationIndicator, Key[], StandardError<never>>>>()
export const importReset = createAction('user/keys/importReset')()
export const create = createAction('user/keys/create')<
  DeepReadonly<WithKeyAttrs & Password>,
  DeepReadonly<WithClique & OperationMetadata>
>()
export const creationSignal = createAction('user/keys/creationSignal')<
  DeepReadonly<FlowSignal<OperationIndicator, Key, StandardError<never>>>,
  DeepReadonly<WithClique & OperationMetadata>
>()
export const update = createAction('user/keys/update')<DeepReadonly<WithKeyId & Password>, DeepReadonly<OperationMetadata>>()
export const updationSignal = createAction('user/keys/updationSignal')<DeepReadonly<FlowSignal<OperationIndicator, Key, StandardError<never>>>, DeepReadonly<OperationMetadata>>()
export const delete_ = createAction('user/keys/delete')<DeepReadonly<WithKeyId>, DeepReadonly<OperationMetadata>>()
export const deletionSignal = createAction('user/keys/deletionSignal')<DeepReadonly<FlowSignal<OperationIndicator, string, StandardError<never>>>, DeepReadonly<OperationMetadata>>()
export const userKeysUpdate = createAction('user/keys/userKeysUpdate')<DeepReadonly<Key[]>>()

export const CLIQUE_ORDER_ITERATEES: ((clique: DeepReadonly<Clique>) => any)[] = [
  (clique) => clique.shadows.length === 0,
  (clique) => fn.pipe(
    getCliqueRoot(clique),
    option.fold(() => -1, (root) => root.attrs.isPinned ? 0 : 1)
  ),
  (clique) => fn.pipe(
    getCliqueRepr(clique),
    option.fold(
      () => <DeepReadonly<string[]>>[],
      (repr) => fn.pipe(repr.tags, readonlyArray.map(string.toLowerCase))
    )
  )
]
export const newCliqueOrder = createAction('user/keys/newCliqueOrder')<DeepReadonly<string[]>>()
export const cliqueAddition = createAction('user/keys/cliqueAddition')<string>()

export const NIL_KEY_ID = ''
export const electShadow = createAction('user/keys/electShadow')<string, DeepReadonly<OperationMetadata>>()
export interface ShadowElectionSuccess {
  origin: string;
  result: Key;
  obsolete: string[];
}
export const shadowElectionSignal = createAction('user/keys/shadowElectionSignal')<DeepReadonly<
  FlowSignal<OperationIndicator, ShadowElectionSuccess, StandardError<never>>
>, DeepReadonly<OperationMetadata>>()

export const commitShadow = createAction('user/keys/commitShadow')<DeepReadonly<WithClique & Password>>()
export const shadowCommitmentSignal = createAction('user/keys/shadowCommitmentSignal')<DeepReadonly<
  FlowSignal<never, Record<string, never>, string>
>, DeepReadonly<WithClique>>()
export const integrateClique = createAction('user/keys/integrateClique')<DeepReadonly<WithClique>>()
export const cliqueIntegrationSignal = createAction('user/keys/cliqueIntegrationSignal')<DeepReadonly<
  FlowSignal<OperationIndicator, string, StandardError<never>>
>, DeepReadonly<WithClique>>()
export const cancelShadow = createAction('user/keys/cancelShadow')<DeepReadonly<WithClique>>()
export const obliterateClique = createAction('user/keys/obliterateClique')<DeepReadonly<WithClique>>()
export const cliqueObliterationSignal = createAction('user/keys/cliqueObliterationSignal')<DeepReadonly<
  FlowSignal<OperationIndicator, string, StandardError<never>>
>, DeepReadonly<WithClique>>()

export interface WithPinState {
  isPinned: boolean;
}
export const toggleCliquePin = createAction('user/keys/toggleCliquePin')<DeepReadonly<WithClique & WithPinState>>()
export const toggleKeyPin = createAction('user/keys/toggleKeyPin')<
  DeepReadonly<WithKeyId & WithPinState>,
  DeepReadonly<OperationMetadata & WithClique>
>()
export const keyPinTogglingSignal = createAction('user/keys/keyPinTogglingSignal')<DeepReadonly<
  FlowSignal<OperationIndicator, WithKeyId & WithPinState, StandardError<never>>
>, DeepReadonly<OperationMetadata & WithClique>>()

export const acquireCliqueLock = createAction('user/keys/acquireCliqueLock')<string>()
export const releaseCliqueLock = createAction('user/keys/releaseCliqueLock')<string>()

export const export_ = createAction('user/keys/export')<DeepReadonly<{ password: string }>>()
export enum ExportError {
  INVALID_PASSWORD = 'INVALID_PASSWORD',
}
export const exportSignal = createAction('user/keys/exportSignal')<DeepReadonly<
  FlowSignal<OperationIndicator, DeepReadonly<Clique[]>, StandardError<ExportError>
>>>()
