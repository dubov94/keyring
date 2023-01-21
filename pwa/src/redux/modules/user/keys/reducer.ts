import { createReducer } from '@reduxjs/toolkit'
import { option } from 'fp-ts'
import { castDraft } from 'immer'
import { DeepReadonly } from 'ts-essentials'
import { isActionOf } from 'typesafe-actions'
import { Key } from '@/redux/domain'
import { FlowSignalKind, isActionSuccess } from '@/redux/flow_signal'
import {
  acquireCliqueLock,
  cliqueOrder,
  creationSignal,
  deletionSignal,
  emplace,
  cliqueAdjunction,
  NIL_KEY_ID,
  releaseCliqueLock,
  shadowCommitmentSignal,
  shadowElectionSignal,
  updationSignal
} from './actions'
import { getUidService } from '@/cryptography/uid_service'

export default createReducer<{
  userKeys: Key[];
  idToClique: { [key: string]: string };
  busyness: { [key: string]: number };
  // Holds the latest `shadowCommitmentSignal` error for each clique.
  // The idea is that `commitShadow` is followed by `integrateClique`
  // on saving, thus to pick up an error coming from the former
  // we need a separate storage.
  cliqueToSyncError: { [key: string]: option.Option<string> };
  cliquesInOrder: string[];
}>(
  {
    userKeys: [],
    idToClique: {},
    busyness: {},
    // `cliqueToSyncError` is knowingly append-only.
    cliqueToSyncError: {},
    // `cliquesInOrder` is knowingly append-only.
    cliquesInOrder: []
  },
  (builder) => builder
    .addMatcher(isActionOf(emplace), (state, action) => {
      state.userKeys = castDraft(action.payload)
      const rootToMarker: { [key: string]: string } = {}
      for (const item of action.payload) {
        if (item.attrs.parent === NIL_KEY_ID) {
          rootToMarker[item.identifier] = item.identifier in state.idToClique
            ? state.idToClique[item.identifier] : getUidService().v4()
        }
      }
      state.idToClique = {}
      for (const item of action.payload) {
        state.idToClique[item.identifier] = item.identifier in rootToMarker
          ? rootToMarker[item.identifier] : rootToMarker[item.attrs.parent]
      }
    })
    .addMatcher(isActionOf(cliqueOrder), (state, action) => {
      state.cliquesInOrder = castDraft(action.payload)
    })
    .addMatcher(isActionOf(cliqueAdjunction), (state, action) => {
      if (!state.cliquesInOrder.includes(action.payload)) {
        state.cliquesInOrder.unshift(action.payload)
      }
    })
    .addMatcher(isActionSuccess(creationSignal), (state, action) => {
      const userKey = action.payload.data
      state.userKeys = castDraft([userKey, ...state.userKeys])
      state.idToClique[userKey.identifier] = action.meta.clique
    })
    .addMatcher(isActionSuccess(updationSignal), (state, action) => {
      const newKey = action.payload.data
      state.userKeys = castDraft(state.userKeys.map((key) => {
        return key.identifier === newKey.identifier ? newKey : key
      }))
    })
    .addMatcher(isActionSuccess(deletionSignal), (state, action) => {
      const identifier = action.payload.data
      const newUserKeys: Key[] = []
      for (const userKey of state.userKeys) {
        if ([userKey.identifier, userKey.attrs.parent].includes(identifier)) {
          delete state.idToClique[userKey.identifier]
          continue
        }
        newUserKeys.push(userKey)
      }
      state.userKeys = newUserKeys
    })
    .addMatcher(isActionSuccess(shadowElectionSignal), (state, action) => {
      const { origin, result, obsolete } = action.payload.data
      state.idToClique[result.identifier] = state.idToClique[origin]
      const newUserKeys: DeepReadonly<Key>[] = [result]
      for (const userKey of state.userKeys) {
        if (obsolete.includes(userKey.identifier)) {
          delete state.idToClique[userKey.identifier]
          continue
        }
        if (userKey.identifier !== result.identifier) {
          newUserKeys.push(userKey)
        }
      }
      state.userKeys = castDraft(newUserKeys)
    })
    .addMatcher(isActionOf(acquireCliqueLock), (state, action) => {
      if (!(action.payload in state.busyness)) {
        state.busyness[action.payload] = 0
      }
      state.busyness[action.payload] += 1
    })
    .addMatcher(isActionOf(releaseCliqueLock), (state, action) => {
      state.busyness[action.payload] -= 1
      if (state.busyness[action.payload] === 0) {
        delete state.busyness[action.payload]
      }
    })
    .addMatcher(isActionOf(shadowCommitmentSignal), (state, action) => {
      switch (action.payload.kind) {
        case FlowSignalKind.SUCCESS:
          state.cliqueToSyncError[action.meta.clique] = option.none
          break
        case FlowSignalKind.ERROR:
          state.cliqueToSyncError[action.meta.clique] = option.of(action.payload.error)
          break
        default:
          // NOP.
      }
    })
)
