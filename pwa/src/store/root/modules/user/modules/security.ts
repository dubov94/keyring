import { Module } from 'vuex'
import {
  RootState,
  SecurityState,
  constructInitialSecurityState,
  RecentSessionsProgress,
  DuplicateGroupsProgress,
  ExposedUserKeyIdsProgress,
  DuplicateGroupsProgressState,
  ExposedUserKeyIdsProgressState,
  RecentSessionsProgressState,
  Session
} from '@/store/state'
import { createMutation, createGetter } from '@/store/state_rx'
import { Subject, of, from, forkJoin, BehaviorSubject } from 'rxjs'
import { switchMap, tap, map, catchError, skip, defaultIfEmpty } from 'rxjs/operators'
import { FlowProgressBasicState, indicator, data, success, exception, stringify } from '@/store/flow'
import { sessionKey$, userKeys$ } from '@/store/root/modules/user'
import { container } from 'tsyringe'
import { PWNED_SERVICE_TOKEN, PwnedService } from '@/pwned_service'
import { ResettableAction, ResettableActionType } from '@/store/resettable_action'
import { getAdministrationApi } from '@/api/api_di'
import { ServiceGetRecentSessionsResponse } from '@/api/definitions'
import { showToast$ } from '../../interface/toast'
import { SESSION_TOKEN_HEADER_NAME } from '@/constants'

export const recentSessions$ = createGetter<RecentSessionsProgress>((state) => state.user.security.recentSessions)
export const duplicateGroups$ = createGetter<DuplicateGroupsProgress>((state) => state.user.security.duplicateGroups)
export const exposedUserKeyIds$ = createGetter<ExposedUserKeyIdsProgress>((state) => state.user.security.exposedUserKeyIds)

enum MutationType {
  SET_RECENT_SESSIONS = 'setRecentSessions',
  SET_DUPLICATE_GROUPS = 'setDuplicateGroups',
  SET_EXPOSED_USER_KEY_IDS = 'setExposedUserKeyIds',
}

const NAMESPACE = ['user', 'security']

const setRecentSessions$ = createMutation<RecentSessionsProgress>(NAMESPACE, MutationType.SET_RECENT_SESSIONS)
const setDuplicateGroups$ = createMutation<DuplicateGroupsProgress>(NAMESPACE, MutationType.SET_DUPLICATE_GROUPS)
const setExposedUserKeyIds$ = createMutation<ExposedUserKeyIdsProgress>(NAMESPACE, MutationType.SET_EXPOSED_USER_KEY_IDS)

export const fetchRecentSessions$ = new Subject<ResettableAction<void>>()
fetchRecentSessions$.pipe(switchMap((action) => {
  switch (action.type) {
    case ResettableActionType.ACT:
      return of(action).pipe(
        tap(() => {
          setRecentSessions$.next(indicator(RecentSessionsProgressState.WORKING, data(recentSessions$.getValue(), [])))
        }),
        switchMap(() => from(getAdministrationApi().getRecentSessions({
          headers: {
            [SESSION_TOKEN_HEADER_NAME]: sessionKey$.getValue()
          }
        })).pipe(
          map((response: ServiceGetRecentSessionsResponse) => response.sessions!.map(
            ({ creationTimeInMillis, ipAddress, userAgent, geolocation }): Session => ({
              // `int64`.
              creationTimeInMillis: Number(creationTimeInMillis!),
              ipAddress: ipAddress!,
              userAgent: userAgent!,
              geolocation: geolocation || {}
            })
          ))
        )),
        tap((sessions) => {
          setRecentSessions$.next(success(sessions))
        }),
        catchError((error) => of(error).pipe(tap((error) => {
          setRecentSessions$.next(exception(stringify(error)))
          showToast$.next({ message: stringify(error) })
        })))
      )
    case ResettableActionType.RESET:
      return of(action).pipe(
        tap(() => {
          setRecentSessions$.next(indicator(FlowProgressBasicState.IDLE, []))
        })
      )
  }
})).subscribe()

export const securityOn$ = new BehaviorSubject<boolean>(false)

securityOn$.pipe(skip(1), switchMap((on) => {
  if (on) {
    return userKeys$.pipe(
      tap(() => {
        setDuplicateGroups$.next(indicator(DuplicateGroupsProgressState.WORKING, data(duplicateGroups$.getValue(), [])))
      }),
      map((keys) => {
        const passwordToIds = new Map<string, Array<string>>()
        keys.forEach(({ identifier, value }) => {
          if (!passwordToIds.has(value)) {
            passwordToIds.set(value, [])
          }
          passwordToIds.get(value)!.push(identifier)
        })
        const duplicateGroups: Array<Array<string>> = []
        for (const group of passwordToIds.values()) {
          if (group.length > 1) {
            duplicateGroups.push(group)
          }
        }
        return { duplicateGroups }
      }),
      tap(({ duplicateGroups }) => {
        setDuplicateGroups$.next(success(duplicateGroups))
      }),
      catchError((error) => of(error).pipe(tap((error) => {
        setDuplicateGroups$.next(exception(stringify(error)))
        showToast$.next({ message: stringify(error) })
      })))
    )
  } else {
    return of(on).pipe(
      tap(() => {
        setDuplicateGroups$.next(indicator(FlowProgressBasicState.IDLE, []))
      })
    )
  }
})).subscribe()

securityOn$.pipe(skip(1), switchMap((on) => {
  if (on) {
    return userKeys$.pipe(
      tap(() => {
        setExposedUserKeyIds$.next(indicator(ExposedUserKeyIdsProgressState.WORKING, data(exposedUserKeyIds$.getValue(), [])))
      }),
      switchMap((keys) => forkJoin(keys.map(async ({ identifier, value }) => ({
        identifier,
        pwned: await container.resolve<PwnedService>(PWNED_SERVICE_TOKEN).checkKey(value)
      }))).pipe(
        defaultIfEmpty([] as Array<{ identifier: string; pwned: boolean }>)
      )),
      map((results) => results.filter(({ pwned }) => pwned).map(({ identifier }) => identifier)),
      tap((exposedUserKeyIds) => {
        setExposedUserKeyIds$.next(success(exposedUserKeyIds))
      }),
      catchError((error) => of(error).pipe(tap((error) => {
        setExposedUserKeyIds$.next(exception(stringify(error)))
        showToast$.next({ message: stringify(error) })
      })))
    )
  } else {
    return of(on).pipe(
      tap(() => {
        setExposedUserKeyIds$.next(indicator(FlowProgressBasicState.IDLE, []))
      })
    )
  }
})).subscribe()

export const Security: Module<SecurityState, RootState> = {
  namespaced: true,
  state: constructInitialSecurityState,
  mutations: {
    [MutationType.SET_RECENT_SESSIONS] (state, value) {
      state.recentSessions = value
    },
    [MutationType.SET_DUPLICATE_GROUPS] (state, value) {
      state.duplicateGroups = value
    },
    [MutationType.SET_EXPOSED_USER_KEY_IDS] (state, value) {
      state.exposedUserKeyIds = value
    }
  }
}
