import { DeepReadonly } from 'ts-essentials'
import { createAction } from 'typesafe-actions'
import { Score } from '@/cryptography/strength_test_service'
import { Session } from '@/redux/domain'
import { FlowSignal, StandardError } from '@/redux/flow_signal'

export enum RecentSessionsRetrievalFlowIndicator {
  WORKING = 'WORKING'
}
export const fetchRecentSessions = createAction('user/security/fetchRecentSessions')()
export const recentSessionsRetrievalSignal = createAction('user/security/recentSessionsRetrievalSignal')<DeepReadonly<
  FlowSignal<RecentSessionsRetrievalFlowIndicator, Session[], StandardError<never>>
>>()
export const recentSessionsRetrievalReset = createAction('user/security/recentSessionsRetrievalReset')()

export const enableAnalysis = createAction('user/security/enableAnalysis')()
export const disableAnalysis = createAction('user/security/disableAnalysis')()

export const duplicateGroupsSearchSignal = createAction('user/security/duplicateGroupsSearchSignal')<DeepReadonly<
  FlowSignal<never, string[][], never>
>>()

export enum ExposedCliqueIdsSearchFlowIndicator {
  WORKING = 'WORKING'
}
export const exposedCliqueIdsSearchSignal = createAction('user/security/exposedCliqueIdsSearchSignal')<DeepReadonly<
  FlowSignal<ExposedCliqueIdsSearchFlowIndicator, string[], StandardError<never>>
>>()

export interface ScoredClique {
  name: string;
  score: Score;
}
export const vulnerableCliquesSearchSignal = createAction('user/security/vulnerableCliquesSearchSignal')<DeepReadonly<
  FlowSignal<never, ScoredClique[], never>
>>()
