import { function as fn, readonlyArray, option } from 'fp-ts'
import { Epic } from 'redux-observable'
import { concat, EMPTY, forkJoin, from, Observable, of } from 'rxjs'
import { catchError, defaultIfEmpty, filter, map, switchMap, withLatestFrom } from 'rxjs/operators'
import { DeepReadonly } from 'ts-essentials'
import { container } from 'tsyringe'
import { isActionOf } from 'typesafe-actions'
import { getAdministrationApi } from '@/api/api_di'
import {
  GetRecentSessionsResponseSession,
  ServiceGetRecentSessionsResponse
} from '@/api/definitions'
import { PwnedService, PWNED_SERVICE_TOKEN } from '@/cryptography/pwned_service'
import { Color, StrengthTestService, STRENGTH_TEST_SERVICE_TOKEN } from '@/cryptography/strength_test_service'
import { SESSION_TOKEN_HEADER_NAME } from '@/headers'
import { Session, Password } from '@/redux/domain'
import { createDisplayExceptionsEpic } from '@/redux/exceptions'
import { cancel, exception, indicator, errorToMessage, success } from '@/redux/flow_signal'
import { extractPassword, userKeysUpdate } from '@/redux/modules/user/keys/actions'
import { RootAction } from '@/redux/root_action'
import { RootState } from '@/redux/root_reducer'
import {
  disableAnalysis,
  duplicateGroupsSearchSignal,
  enableAnalysis,
  ExposedCliqueIdsSearchFlowIndicator,
  exposedCliqueIdsSearchSignal,
  fetchRecentSessions,
  RecentSessionsRetrievalFlowIndicator,
  recentSessionsRetrievalReset,
  recentSessionsRetrievalSignal,
  ScoredClique,
  vulnerableCliquesSearchSignal
} from './actions'
import { Clique, cliques, getCliqueRoot } from '../keys/selectors'

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
        catchError((error) => of(recentSessionsRetrievalSignal(exception(errorToMessage(error)))))
      )
    } else if (isActionOf(recentSessionsRetrievalReset, action)) {
      return of(recentSessionsRetrievalSignal(cancel()))
    }
    return EMPTY
  })
)

export const displayRecentSessionsRetrivalExceptionsEpic = createDisplayExceptionsEpic(recentSessionsRetrievalSignal)

const mapCliquesToPasswords = (
  items: DeepReadonly<Clique[]>
): DeepReadonly<{ cliqueId: string; password: Password }[]> => fn.pipe(
  items,
  readonlyArray.filterMap((item) => fn.pipe(
    getCliqueRoot(item),
    option.chain((root) => root.value === '' ? option.none : option.some({
      cliqueId: item.name,
      password: extractPassword(root)
    }))
  ))
)

const getDuplicateGroups = (items: DeepReadonly<Clique[]>): Observable<string[][]> => {
  const passwordToIds = new Map<string, string[]>()
  mapCliquesToPasswords(items).forEach(({ cliqueId, password }) => {
    if (!passwordToIds.has(password.value)) {
      passwordToIds.set(password.value, [])
    }
    passwordToIds.get(password.value)!.push(cliqueId)
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
      const toSignal = (data: Observable<DeepReadonly<string[][]>>) => {
        return data.pipe(map(fn.flow(success, duplicateGroupsSearchSignal)))
      }
      return concat(
        toSignal(getDuplicateGroups(cliques(state$.value))),
        action$.pipe(
          filter(isActionOf(userKeysUpdate)),
          withLatestFrom(state$),
          switchMap(([, state]) => toSignal(getDuplicateGroups(cliques(state))))
        )
      )
    } else if (isActionOf(disableAnalysis, action)) {
      return of(duplicateGroupsSearchSignal(cancel()))
    }
    return EMPTY
  })
)

const getExposedCliqueIds = (items: DeepReadonly<Clique[]>): Observable<DeepReadonly<string[]>> => {
  const pwnedService = container.resolve<PwnedService>(PWNED_SERVICE_TOKEN)
  return forkJoin(mapCliquesToPasswords(items).map(async ({ cliqueId, password }) => ({
    cliqueId,
    pwned: await pwnedService.checkKey(password.value)
  }))).pipe(
    defaultIfEmpty(<{ cliqueId: string; pwned: boolean }[]>[]),
    map(readonlyArray.filterMap(({ cliqueId, pwned }) => pwned ? option.of(cliqueId) : option.zero()))
  )
}

export const exposedCliqueIdsSearchEpic: Epic<RootAction, RootAction, RootState> = (action$, state$) => action$.pipe(
  filter(isActionOf([enableAnalysis, disableAnalysis])),
  switchMap((action) => {
    if (isActionOf(enableAnalysis, action)) {
      const toSignal = (data: Observable<DeepReadonly<string[]>>) => data.pipe(map(fn.flow(success, exposedCliqueIdsSearchSignal)))
      const request = (items: DeepReadonly<Clique[]>): Observable<RootAction> => concat(
        of(exposedCliqueIdsSearchSignal(indicator(ExposedCliqueIdsSearchFlowIndicator.WORKING))),
        toSignal(getExposedCliqueIds(items))
      )
      return concat(
        request(cliques(state$.value)),
        action$.pipe(
          filter(isActionOf(userKeysUpdate)),
          withLatestFrom(state$),
          switchMap(([, state]) => request(cliques(state)))
        )
      ).pipe(
        catchError((error) => of(exposedCliqueIdsSearchSignal(exception(errorToMessage(error)))))
      )
    } else if (isActionOf(disableAnalysis, action)) {
      return of(exposedCliqueIdsSearchSignal(cancel()))
    }
    return EMPTY
  })
)

export const displayExposedCliqueIdsSearchExceptionsEpic = createDisplayExceptionsEpic(exposedCliqueIdsSearchSignal)

const getVulnerableCliques = (items: DeepReadonly<Clique[]>): Observable<DeepReadonly<ScoredClique[]>> => {
  const strengthTestService = container.resolve<StrengthTestService>(STRENGTH_TEST_SERVICE_TOKEN)
  return of(fn.pipe(
    mapCliquesToPasswords(items),
    readonlyArray.map(({ cliqueId, password }) => <ScoredClique>({
      name: cliqueId,
      score: strengthTestService.score(password.value, password.tags as string[])
    })),
    readonlyArray.filter((value) => value.score.color !== Color.GREEN)
  ))
}

export const vulnerableCliquesSearchEpic: Epic<RootAction, RootAction, RootState> = (action$, state$) => action$.pipe(
  filter(isActionOf([enableAnalysis, disableAnalysis])),
  switchMap((action) => {
    if (isActionOf(enableAnalysis, action)) {
      const toSignal = (data: Observable<DeepReadonly<ScoredClique[]>>) => {
        return data.pipe(map(fn.flow(success, vulnerableCliquesSearchSignal)))
      }
      return concat(
        toSignal(getVulnerableCliques(cliques(state$.value))),
        action$.pipe(
          filter(isActionOf(userKeysUpdate)),
          withLatestFrom(state$),
          switchMap(([, state]) => toSignal(getVulnerableCliques(cliques(state))))
        )
      )
    } else if (isActionOf(disableAnalysis, action)) {
      return of(vulnerableCliquesSearchSignal(cancel()))
    }
    return EMPTY
  })
)
