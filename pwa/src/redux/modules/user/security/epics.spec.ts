import { cancel, exception, indicator, success } from '@/redux/flow_signal'
import { RootAction } from '@/redux/root_action'
import { reducer, RootState } from '@/redux/root_reducer'
import { EpicTracker, epicReactionSequence, setUpEpicChannels } from '@/redux/testing'
import { createStore, Store } from '@reduxjs/toolkit'
import { expect } from 'chai'
import { deepEqual, instance, mock, when } from 'ts-mockito'
import { registrationSignal } from '../../authn/actions'
import {
  disableAnalysis,
  duplicateGroupsSearchSignal,
  enableAnalysis,
  ExposedUserKeyIdsSearchFlowIndicator,
  exposedUserKeyIdsSearchSignal,
  fetchRecentSessions,
  RecentSessionsRetrievalFlowIndicator,
  recentSessionsRetrievalSignal
} from './actions'
import {
  displayExposedUserKeyIdsSearchExceptionsEpic,
  displayRecentSessionsRetrivalExceptionsEpic,
  duplicateGroupsSearchEpic,
  exposedUserKeyIdsSearchEpic,
  fetchRecentSessionsEpic
} from './epics'
import {
  AdministrationApi,
  ServiceGetRecentSessionsResponse
} from '@/api/definitions'
import { SESSION_TOKEN_HEADER_NAME } from '@/headers'
import { container } from 'tsyringe'
import { ADMINISTRATION_API_TOKEN } from '@/api/api_di'
import { showToast } from '../../ui/toast/actions'
import { creationSignal, deletionSignal, emplace, updationSignal } from '../keys/actions'
import { asapScheduler } from 'rxjs'
import { PwnedService, PWNED_SERVICE_TOKEN } from '@/pwned_service'

describe('fetchRecentSessionsEpic', () => {
  it('emits fetching sequence', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(registrationSignal(success({
      username: 'username',
      parametrization: 'parametrization',
      encryptionKey: 'encryptionKey',
      sessionKey: 'sessionKey'
    })))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)
    const mockAdministrationApi: AdministrationApi = mock(AdministrationApi)
    when(mockAdministrationApi.getRecentSessions(deepEqual({
      headers: { [SESSION_TOKEN_HEADER_NAME]: 'sessionKey' }
    }))).thenResolve(<ServiceGetRecentSessionsResponse>{
      sessions: [{
        creationTimeInMillis: '0',
        ipAddress: '127.0.0.1',
        userAgent: 'agent'
      }]
    })
    container.register<AdministrationApi>(ADMINISTRATION_API_TOKEN, {
      useValue: instance(mockAdministrationApi)
    })

    const epicTracker = new EpicTracker(fetchRecentSessionsEpic(action$, state$, {}))
    actionSubject.next(fetchRecentSessions())
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(epicTracker.getActions()).to.deep.equal([
      recentSessionsRetrievalSignal(indicator(RecentSessionsRetrievalFlowIndicator.WORKING)),
      recentSessionsRetrievalSignal(success([{
        creationTimeInMillis: 0,
        ipAddress: '127.0.0.1',
        userAgent: 'agent',
        geolocation: {}
      }]))
    ])
  })
})

describe('displayRecentSessionsRetrivalExceptionsEpic', () => {
  it('emits toast data', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(displayRecentSessionsRetrivalExceptionsEpic(action$, state$, {}))
    actionSubject.next(recentSessionsRetrievalSignal(exception('exception')))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(epicTracker.getActions()).to.deep.equal([
      showToast({ message: 'exception' })
    ])
  })
})

describe('duplicateGroupsSearchEpic', () => {
  it('finds duplicates in the initial state', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(emplace([
      { identifier: '0', value: 'value', tags: [] },
      { identifier: '1', value: 'value', tags: [] },
      { identifier: '2', value: 'random', tags: [] }
    ]))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(duplicateGroupsSearchEpic(action$, state$, {}))
    actionSubject.next(enableAnalysis())
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(epicTracker.getActions()).to.deep.equal([
      duplicateGroupsSearchSignal(success([['0', '1']]))
    ])
  })

  it('reruns on creation', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(emplace([{ identifier: '0', value: 'value', tags: [] }]))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(
      duplicateGroupsSearchEpic(action$, state$, {}),
      epicReactionSequence([
        () => {
          asapScheduler.schedule(() => {
            const creationSuccess = creationSignal(success({
              identifier: '1',
              value: 'value',
              tags: []
            }))
            store.dispatch(creationSuccess)
            actionSubject.next(creationSuccess)
          })
        },
        () => { actionSubject.complete() }
      ])
    )
    actionSubject.next(enableAnalysis())
    await epicTracker.waitForCompletion()

    expect(epicTracker.getActions()).to.deep.equal([
      duplicateGroupsSearchSignal(success([])),
      duplicateGroupsSearchSignal(success([['1', '0']]))
    ])
  })

  it('reruns on updation', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(emplace([
      { identifier: '0', value: 'value', tags: [] },
      { identifier: '1', value: 'random', tags: [] }
    ]))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(
      duplicateGroupsSearchEpic(action$, state$, {}),
      epicReactionSequence([
        () => {
          asapScheduler.schedule(() => {
            const updationSuccess = updationSignal(success({
              identifier: '1',
              value: 'value',
              tags: []
            }))
            store.dispatch(updationSuccess)
            actionSubject.next(updationSuccess)
          })
        },
        () => { actionSubject.complete() }
      ])
    )
    actionSubject.next(enableAnalysis())
    await epicTracker.waitForCompletion()

    expect(epicTracker.getActions()).to.deep.equal([
      duplicateGroupsSearchSignal(success([])),
      duplicateGroupsSearchSignal(success([['1', '0']]))
    ])
  })

  it('reruns on deletion', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(emplace([
      { identifier: '0', value: 'value', tags: ['a'] },
      { identifier: '1', value: 'value', tags: ['b'] }
    ]))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(
      duplicateGroupsSearchEpic(action$, state$, {}),
      epicReactionSequence([
        () => {
          asapScheduler.schedule(() => {
            const deletionSuccess = deletionSignal(success('1'))
            store.dispatch(deletionSuccess)
            actionSubject.next(deletionSuccess)
          })
        },
        () => { actionSubject.complete() }
      ])
    )
    actionSubject.next(enableAnalysis())
    await epicTracker.waitForCompletion()

    expect(epicTracker.getActions()).to.deep.equal([
      duplicateGroupsSearchSignal(success([['0', '1']])),
      duplicateGroupsSearchSignal(success([]))
    ])
  })

  it('emits search cancellation', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(duplicateGroupsSearchEpic(action$, state$, {}))
    actionSubject.next(disableAnalysis())
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(epicTracker.getActions()).to.deep.equal([
      duplicateGroupsSearchSignal(cancel())
    ])
  })
})

describe('exposedUserKeyIdsSearchEpic', () => {
  it('finds vulnerabilities in the initial state', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(emplace([
      { identifier: '0', value: 'x', tags: [] },
      { identifier: '1', value: 'y', tags: [] }
    ]))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)
    const mockPwnedService = mock<PwnedService>()
    when(mockPwnedService.checkKey('x')).thenResolve(true)
    when(mockPwnedService.checkKey('y')).thenResolve(false)
    container.register<PwnedService>(PWNED_SERVICE_TOKEN, {
      useValue: instance(mockPwnedService)
    })

    const epicTracker = new EpicTracker(exposedUserKeyIdsSearchEpic(action$, state$, {}))
    actionSubject.next(enableAnalysis())
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(epicTracker.getActions()).to.deep.equal([
      exposedUserKeyIdsSearchSignal(indicator(ExposedUserKeyIdsSearchFlowIndicator.WORKING)),
      exposedUserKeyIdsSearchSignal(success(['0']))
    ])
  })

  it('reruns on creation', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)
    const mockPwnedService = mock<PwnedService>()
    when(mockPwnedService.checkKey('value')).thenResolve(true)
    container.register<PwnedService>(PWNED_SERVICE_TOKEN, {
      useValue: instance(mockPwnedService)
    })

    const epicTracker = new EpicTracker(
      exposedUserKeyIdsSearchEpic(action$, state$, {}),
      epicReactionSequence([
        () => {},
        () => {
          asapScheduler.schedule(() => {
            const creationSuccess = creationSignal(success({
              identifier: 'identifier',
              value: 'value',
              tags: []
            }))
            store.dispatch(creationSuccess)
            actionSubject.next(creationSuccess)
          })
        },
        () => {},
        () => { actionSubject.complete() }
      ])
    )
    actionSubject.next(enableAnalysis())
    await epicTracker.waitForCompletion()

    expect(epicTracker.getActions()).to.deep.equal([
      exposedUserKeyIdsSearchSignal(indicator(ExposedUserKeyIdsSearchFlowIndicator.WORKING)),
      exposedUserKeyIdsSearchSignal(success([])),
      exposedUserKeyIdsSearchSignal(indicator(ExposedUserKeyIdsSearchFlowIndicator.WORKING)),
      exposedUserKeyIdsSearchSignal(success(['identifier']))
    ])
  })

  it('reruns on updation', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(emplace([{ identifier: 'identifier', value: 'secure', tags: [] }]))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)
    const mockPwnedService = mock<PwnedService>()
    when(mockPwnedService.checkKey('secure')).thenResolve(false)
    when(mockPwnedService.checkKey('simple')).thenResolve(true)
    container.register<PwnedService>(PWNED_SERVICE_TOKEN, {
      useValue: instance(mockPwnedService)
    })

    const epicTracker = new EpicTracker(
      exposedUserKeyIdsSearchEpic(action$, state$, {}),
      epicReactionSequence([
        () => {},
        () => {
          asapScheduler.schedule(() => {
            const updationSuccess = updationSignal(success({
              identifier: 'identifier',
              value: 'simple',
              tags: []
            }))
            store.dispatch(updationSuccess)
            actionSubject.next(updationSuccess)
          })
        },
        () => {},
        () => { actionSubject.complete() }
      ])
    )
    actionSubject.next(enableAnalysis())
    await epicTracker.waitForCompletion()

    expect(epicTracker.getActions()).to.deep.equal([
      exposedUserKeyIdsSearchSignal(indicator(ExposedUserKeyIdsSearchFlowIndicator.WORKING)),
      exposedUserKeyIdsSearchSignal(success([])),
      exposedUserKeyIdsSearchSignal(indicator(ExposedUserKeyIdsSearchFlowIndicator.WORKING)),
      exposedUserKeyIdsSearchSignal(success(['identifier']))
    ])
  })

  it('reruns on deletion', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(emplace([{ identifier: 'identifier', value: 'simple', tags: [] }]))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)
    const mockPwnedService = mock<PwnedService>()
    when(mockPwnedService.checkKey('simple')).thenResolve(true)
    container.register<PwnedService>(PWNED_SERVICE_TOKEN, {
      useValue: instance(mockPwnedService)
    })

    const epicTracker = new EpicTracker(
      exposedUserKeyIdsSearchEpic(action$, state$, {}),
      epicReactionSequence([
        () => {},
        () => {
          asapScheduler.schedule(() => {
            const deletionSuccess = deletionSignal(success('identifier'))
            store.dispatch(deletionSuccess)
            actionSubject.next(deletionSuccess)
          })
        },
        () => {},
        () => { actionSubject.complete() }
      ])
    )
    actionSubject.next(enableAnalysis())
    await epicTracker.waitForCompletion()

    expect(epicTracker.getActions()).to.deep.equal([
      exposedUserKeyIdsSearchSignal(indicator(ExposedUserKeyIdsSearchFlowIndicator.WORKING)),
      exposedUserKeyIdsSearchSignal(success(['identifier'])),
      exposedUserKeyIdsSearchSignal(indicator(ExposedUserKeyIdsSearchFlowIndicator.WORKING)),
      exposedUserKeyIdsSearchSignal(success([]))
    ])
  })

  it('emits search cancellation', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(exposedUserKeyIdsSearchEpic(action$, state$, {}))
    actionSubject.next(disableAnalysis())
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(epicTracker.getActions()).to.deep.equal([
      exposedUserKeyIdsSearchSignal(cancel())
    ])
  })
})

describe('displayExposedUserKeyIdsSearchExceptionsEpic', () => {
  it('emits toast data', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(displayExposedUserKeyIdsSearchExceptionsEpic(action$, state$, {}))
    actionSubject.next(exposedUserKeyIdsSearchSignal(exception('exception')))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(epicTracker.getActions()).to.deep.equal([
      showToast({ message: 'exception' })
    ])
  })
})
