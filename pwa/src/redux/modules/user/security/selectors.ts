import { Session } from '@/redux/entities'
import { StandardError } from '@/redux/flow_signal'
import { RemoteData } from '@/redux/remote_data'
import { RootState } from '@/redux/root_reducer'
import { DeepReadonly } from 'ts-essentials'
import { ExposedUserKeyIdsSearchFlowIndicator, RecentSessionsRetrievalFlowIndicator, ScoredKey } from './actions'

export type RecentSessions = RemoteData<RecentSessionsRetrievalFlowIndicator, Session[], StandardError<void>>
export const recentSessions = (state: RootState): DeepReadonly<RecentSessions> => state.user.security.recentSessions

export type DuplicateGroups = RemoteData<void, string[][], void>
export const duplicateGroups = (state: RootState): DeepReadonly<DuplicateGroups> => state.user.security.duplicateGroups

export type ExposedUserKeyIds = RemoteData<ExposedUserKeyIdsSearchFlowIndicator, string[], StandardError<void>>
export const exposedUserKeyIds = (state: RootState): DeepReadonly<ExposedUserKeyIds> => state.user.security.exposedUserKeyIds

export type VulnerableKeys = RemoteData<void, ScoredKey[], void>
export const vulnerableKeys = (state: RootState): DeepReadonly<VulnerableKeys> => state.user.security.vulnerableKeys

export const isAnalysisOn = (state: RootState): boolean => state.user.security.isAnalysisOn
