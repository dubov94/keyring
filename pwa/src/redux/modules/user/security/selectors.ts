import { DeepReadonly } from 'ts-essentials'
import { Session } from '@/redux/entities'
import { StandardError } from '@/redux/flow_signal'
import { RemoteData } from '@/redux/remote_data'
import { RootState } from '@/redux/root_reducer'
import { ExposedCliqueIdsSearchFlowIndicator, RecentSessionsRetrievalFlowIndicator, ScoredClique } from './actions'

export type RecentSessions = RemoteData<RecentSessionsRetrievalFlowIndicator, Session[], StandardError<never>>
export const recentSessions = (state: RootState): DeepReadonly<RecentSessions> => state.user.security.recentSessions

export type DuplicateGroups = RemoteData<never, string[][], never>
export const duplicateGroups = (state: RootState): DeepReadonly<DuplicateGroups> => state.user.security.duplicateGroups

export type ExposedCliqueIds = RemoteData<ExposedCliqueIdsSearchFlowIndicator, string[], StandardError<never>>
export const exposedCliqueIds = (state: RootState): DeepReadonly<ExposedCliqueIds> => state.user.security.exposedCliqueIds

export type VulnerableCliques = RemoteData<never, ScoredClique[], never>
export const vulnerableCliques = (state: RootState): DeepReadonly<VulnerableCliques> => state.user.security.vulnerableCliques

export const isAnalysisOn = (state: RootState): boolean => state.user.security.isAnalysisOn
