import { createReducer } from '@reduxjs/toolkit'
import { castDraft } from 'immer'
import { DeepReadonly } from 'ts-essentials'
import { isActionOf } from 'typesafe-actions'
import { Session } from '@/redux/entities'
import { StandardError } from '@/redux/flow_signal'
import { identity, reducer, RemoteData, withNoResult, zero } from '@/redux/remote_data'
import {
  disableAnalysis,
  duplicateGroupsSearchSignal,
  enableAnalysis,
  ExposedCliqueIdsSearchFlowIndicator,
  exposedCliqueIdsSearchSignal,
  RecentSessionsRetrievalFlowIndicator,
  recentSessionsRetrievalReset,
  recentSessionsRetrievalSignal,
  ScoredClique,
  vulnerableCliquesSearchSignal
} from './actions'

export default createReducer<{
  recentSessions: RemoteData<RecentSessionsRetrievalFlowIndicator, Session[], StandardError<never>>;
  isAnalysisOn: boolean;
  duplicateGroups: RemoteData<never, string[][], never>;
  exposedCliqueIds: RemoteData<ExposedCliqueIdsSearchFlowIndicator, string[], StandardError<never>>;
  vulnerableCliques: RemoteData<never, ScoredClique[], never>;
}>(
  {
    recentSessions: zero(),
    isAnalysisOn: false,
    duplicateGroups: zero(),
    exposedCliqueIds: zero(),
    vulnerableCliques: zero()
  },
  (builder) => builder
    .addMatcher(isActionOf(recentSessionsRetrievalSignal), (state, action) => {
      state.recentSessions = castDraft(reducer(
        identity<RecentSessionsRetrievalFlowIndicator>(),
        identity<DeepReadonly<Session[]>>(),
        identity<StandardError<never>>()
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
        identity<never>(),
        identity<DeepReadonly<string[][]>>(),
        identity<never>()
      )(state.duplicateGroups, action.payload))
    })
    .addMatcher(isActionOf(disableAnalysis), (state) => {
      state.duplicateGroups = withNoResult(state.duplicateGroups)
    })
    .addMatcher(isActionOf(exposedCliqueIdsSearchSignal), (state, action) => {
      state.exposedCliqueIds = castDraft(reducer(
        identity<ExposedCliqueIdsSearchFlowIndicator>(),
        identity<DeepReadonly<string[]>>(),
        identity<StandardError<never>>()
      )(state.exposedCliqueIds, action.payload))
    })
    .addMatcher(isActionOf(disableAnalysis), (state) => {
      state.exposedCliqueIds = withNoResult(state.exposedCliqueIds)
    })
    .addMatcher(isActionOf(vulnerableCliquesSearchSignal), (state, action) => {
      state.vulnerableCliques = castDraft(reducer(
        identity<never>(),
        identity<DeepReadonly<ScoredClique[]>>(),
        identity<never>()
      )(state.vulnerableCliques, action.payload))
    })
    .addMatcher(isActionOf(disableAnalysis), (state) => {
      state.vulnerableCliques = withNoResult(state.vulnerableCliques)
    })
)
