import { identity, reducer, RemoteData, withNoResult, zero } from '@/redux/remote_data'
import { createReducer } from '@reduxjs/toolkit'
import { isActionOf } from 'typesafe-actions'
import {
  disableAnalysis,
  duplicateGroupsSearchSignal,
  enableAnalysis,
  ExposedUserKeyIdsSearchFlowIndicator,
  exposedUserKeyIdsSearchSignal,
  RecentSessionsRetrievalFlowIndicator,
  recentSessionsRetrievalReset,
  recentSessionsRetrievalSignal
} from './actions'
import { Session } from '@/redux/entities'
import { StandardError } from '@/redux/flow_signal'
import { DeepReadonly } from 'ts-essentials'
import { castDraft } from 'immer'

export default createReducer<{
  recentSessions: RemoteData<RecentSessionsRetrievalFlowIndicator, Session[], StandardError<void>>;
  isAnalysisOn: boolean;
  duplicateGroups: RemoteData<void, string[][], void>;
  exposedUserKeyIds: RemoteData<ExposedUserKeyIdsSearchFlowIndicator, string[], StandardError<void>>;
}>(
  {
    recentSessions: zero(),
    isAnalysisOn: false,
    duplicateGroups: zero(),
    exposedUserKeyIds: zero()
  },
  (builder) => builder
    .addMatcher(isActionOf(recentSessionsRetrievalSignal), (state, action) => {
      state.recentSessions = castDraft(reducer(
        identity<RecentSessionsRetrievalFlowIndicator>(),
        identity<DeepReadonly<Session[]>>(),
        identity<StandardError<void>>()
      )(state.recentSessions, action.payload))
    })
    .addMatcher(isActionOf(recentSessionsRetrievalReset), (state) => {
      state.recentSessions = withNoResult(state.recentSessions)
    })
    .addMatcher(isActionOf(enableAnalysis), (state) => {
      state.isAnalysisOn = true
    })
    .addMatcher(isActionOf(disableAnalysis), (state) => {
      state.isAnalysisOn = false
    })
    .addMatcher(isActionOf(duplicateGroupsSearchSignal), (state, action) => {
      state.duplicateGroups = castDraft(reducer(
        identity<void>(),
        identity<DeepReadonly<string[][]>>(),
        identity<void>()
      )(state.duplicateGroups, action.payload))
    })
    .addMatcher(isActionOf(disableAnalysis), (state) => {
      state.duplicateGroups = withNoResult(state.duplicateGroups)
    })
    .addMatcher(isActionOf(exposedUserKeyIdsSearchSignal), (state, action) => {
      state.exposedUserKeyIds = castDraft(reducer(
        identity<ExposedUserKeyIdsSearchFlowIndicator>(),
        identity<DeepReadonly<string[]>>(),
        identity<StandardError<void>>()
      )(state.exposedUserKeyIds, action.payload))
    })
    .addMatcher(isActionOf(disableAnalysis), (state) => {
      state.exposedUserKeyIds = withNoResult(state.exposedUserKeyIds)
    })
)
