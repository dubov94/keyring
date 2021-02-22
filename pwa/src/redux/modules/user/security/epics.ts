import { getAdministrationApi } from '@/api/api_di'
import { SESSION_TOKEN_HEADER_NAME } from '@/headers'
import { cancel, exception, indicator, stringify, success } from '@/redux/flow_signal'
import { RootAction } from '@/redux/root_action'
import { RootState } from '@/redux/root_reducer'
import { Epic } from 'redux-observable'
import { concat, EMPTY, forkJoin, from, Observable, of } from 'rxjs'
import { catchError, defaultIfEmpty, filter, map, switchMap, withLatestFrom } from 'rxjs/operators'
import { isActionOf } from 'typesafe-actions'
import {
  disableAnalysis,
  duplicateGroupsSearchSignal,
  enableAnalysis,
  ExposedUserKeyIdsSearchFlowIndicator,
  exposedUserKeyIdsSearchSignal,
  fetchRecentSessions,
  RecentSessionsRetrievalFlowIndicator,
  recentSessionsRetrievalReset,
  recentSessionsRetrievalSignal
} from './actions'
import {
  GetRecentSessionsResponseSession,
  ServiceGetRecentSessionsResponse
} from '@/api/definitions'
import { Session, Key } from '@/redux/entities'
import { userKeysUpdate } from '../keys/actions'
import { PwnedService, PWNED_SERVICE_TOKEN } from '@/pwned_service'
import { container } from 'tsyringe'
import { function as fn, array, option } from 'fp-ts'
import { DeepReadonly } from 'ts-essentials'
import { createDisplayExceptionsEpic } from '@/redux/exceptions'

const convertMessageToSession = (message: GetRecentSessionsResponseSession): Session => ({
  // `int64`.
  creationTimeInMillis: Number(message.creationTimeInMillis!),
  ipAddress: message.ipAddress!,
  userAgent: message.userAgent!,
  geolocation: message.geolocation || {}
})

export const fetchRecentSessionsEpic: Epic<RootAction, RootAction, RootState> = (action$, state$) => action$.pipe(
  filter(isActionOf([fetchRecentSessions, recentSessionsRetrievalReset])),
  withLatestFrom(state$),
  switchMap(([action, state]) => {
    if (isActionOf(fetchRecentSessions, action)) {
      return concat(
        of(recentSessionsRetrievalSignal(indicator(RecentSessionsRetrievalFlowIndicator.WORKING))),
        from(getAdministrationApi().getRecentSessions({
          headers: {
            [SESSION_TOKEN_HEADER_NAME]: state.user.account.sessionKey
          }
        })).pipe(switchMap((response: ServiceGetRecentSessionsResponse) => of(
          recentSessionsRetrievalSignal(success(response.sessions!.map(convertMessageToSession)))
        )))
      ).pipe(
        catchError((error) => of(recentSessionsRetrievalSignal(exception(stringify(error)))))
      )
    } else if (isActionOf(recentSessionsRetrievalReset, action)) {
      return of(recentSessionsRetrievalSignal(cancel()))
    }
    return EMPTY
  })
)

export const displayRecentSessionsRetrivalExceptionsEpic = createDisplayExceptionsEpic(recentSessionsRetrievalSignal)

const getDuplicateGroups = (userKeys: Key[]): Observable<string[][]> => {
  const passwordToIds = new Map<string, string[]>()
  userKeys.forEach(({ identifier, value }) => {
    if (!passwordToIds.has(value)) {
      passwordToIds.set(value, [])
    }
    passwordToIds.get(value)!.push(identifier)
  })
  const duplicateGroups: string[][] = []
  for (const group of passwordToIds.values()) {
    if (group.length > 1) {
      duplicateGroups.push(group)
    }
  }
  return of(duplicateGroups)
}

export const duplicateGroupsSearchEpic: Epic<RootAction, RootAction, RootState> = (action$, state$) => action$.pipe(
  filter(isActionOf([enableAnalysis, disableAnalysis])),
  switchMap((action) => {
    if (isActionOf(enableAnalysis, action)) {
      const toSignal = (data: Observable<DeepReadonly<string[][]>>) => data.pipe(map(fn.flow(success, duplicateGroupsSearchSignal)))
      return concat(
        toSignal(getDuplicateGroups(state$.value.user.keys.userKeys)),
        action$.pipe(
          filter(isActionOf(userKeysUpdate)),
          withLatestFrom(state$),
          switchMap(([, state]) => toSignal(getDuplicateGroups(state.user.keys.userKeys)))
        )
      )
    } else if (isActionOf(disableAnalysis, action)) {
      return of(duplicateGroupsSearchSignal(cancel()))
    }
    return EMPTY
  })
)

const getExposedUserKeyIds = (userKeys: Key[]): Observable<string[]> => {
  const pwnedService = container.resolve<PwnedService>(PWNED_SERVICE_TOKEN)
  return forkJoin(userKeys.map(async ({ identifier, value }) => ({
    identifier,
    pwned: await pwnedService.checkKey(value)
  }))).pipe(
    defaultIfEmpty(<{ identifier: string; pwned: boolean }[]>[]),
    map(array.filterMap(({ identifier, pwned }) => pwned ? option.of(identifier) : option.zero()))
  )
}

export const exposedUserKeyIdsSearchEpic: Epic<RootAction, RootAction, RootState> = (action$, state$) => action$.pipe(
  filter(isActionOf([enableAnalysis, disableAnalysis])),
  switchMap((action) => {
    if (isActionOf(enableAnalysis, action)) {
      const toSignal = (data: Observable<DeepReadonly<string[]>>) => data.pipe(map(fn.flow(success, exposedUserKeyIdsSearchSignal)))
      const request = (userKeys: Key[]): Observable<RootAction> => concat(
        of(exposedUserKeyIdsSearchSignal(indicator(ExposedUserKeyIdsSearchFlowIndicator.WORKING))),
        toSignal(getExposedUserKeyIds(userKeys))
      )
      return concat(
        request(state$.value.user.keys.userKeys),
        action$.pipe(
          filter(isActionOf(userKeysUpdate)),
          withLatestFrom(state$),
          switchMap(([, state]) => request(state.user.keys.userKeys))
        )
      ).pipe(
        catchError((error) => of(exposedUserKeyIdsSearchSignal(exception(stringify(error)))))
      )
    } else if (isActionOf(disableAnalysis, action)) {
      return of(exposedUserKeyIdsSearchSignal(cancel()))
    }
    return EMPTY
  })
)

export const displayExposedUserKeyIdsSearchExceptionsEpic = createDisplayExceptionsEpic(exposedUserKeyIdsSearchSignal)
