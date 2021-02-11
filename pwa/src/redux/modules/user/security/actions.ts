import { Session } from '@/redux/entities'
import { FlowSignal, StandardError } from '@/redux/flow_signal'
import { DeepReadonly } from 'ts-essentials'
import { createAction } from 'typesafe-actions'

export enum RecentSessionsRetrievalFlowIndicator {
  WORKING = 'WORKING'
}
export const fetchRecentSessions = createAction('user/security/fetchRecentSessions')()
export const recentSessionsRetrievalSignal = createAction('user/security/recentSessionsRetrievalSignal')<DeepReadonly<
  FlowSignal<RecentSessionsRetrievalFlowIndicator, Session[], StandardError<void>>
>>()
export const recentSessionsRetrievalReset = createAction('user/security/recentSessionsRetrievalReset')()

export const enableAnalysis = createAction('user/security/enableAnalysis')()
export const disableAnalysis = createAction('user/security/disableAnalysis')()

export const duplicateGroupsSearchSignal = createAction('user/security/duplicateGroupsSearchSignal')<DeepReadonly<
  FlowSignal<void, string[][], void>
>>()

export enum ExposedUserKeyIdsSearchFlowIndicator {
  WORKING = 'WORKING'
}
export const exposedUserKeyIdsSearchSignal = createAction('user/security/exposedUserKeyIdsSearchSignal')<DeepReadonly<
  FlowSignal<ExposedUserKeyIdsSearchFlowIndicator, string[], StandardError<void>>
>>()
