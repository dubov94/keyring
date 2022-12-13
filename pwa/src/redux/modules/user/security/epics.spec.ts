import { createStore, Store } from '@reduxjs/toolkit'
import { expect } from 'chai'
import { deepEqual, instance, mock, when } from 'ts-mockito'
import { container } from 'tsyringe'
import { ADMINISTRATION_API_TOKEN } from '@/api/api_di'
import {
  AdministrationApi,
  GetRecentSessionsResponseSessionStatus,
  ServiceGetRecentSessionsResponse
} from '@/api/definitions'
import { PwnedService, PWNED_SERVICE_TOKEN } from '@/cryptography/pwned_service'
import { Color, StrengthTestService, STRENGTH_TEST_SERVICE_TOKEN } from '@/cryptography/strength_test_service'
import { UidService, UID_SERVICE_TOKEN } from '@/cryptography/uid_service'
import { SESSION_TOKEN_HEADER_NAME } from '@/headers'
import { Key, SessionStatus } from '@/redux/domain'
import { cancel, exception, indicator, success } from '@/redux/flow_signal'
import { registrationSignal } from '@/redux/modules/authn/actions'
import { creationSignal, emplace, userKeysUpdate } from '@/redux/modules/user/keys/actions'
import { showToast } from '@/redux/modules/ui/toast/actions'
import { RootAction } from '@/redux/root_action'
import { reducer, RootState } from '@/redux/root_reducer'
import { EpicTracker, setUpEpicChannels, drainEpicActions } from '@/redux/testing'
import { createRegistrationFlowResult, createUserKey } from '@/redux/testing/domain'
import { SequentialFakeUidService } from '@/redux/testing/services'
import {
  disableAnalysis,
  duplicateGroupsSearchSignal,
  enableAnalysis,
  ExposedCliqueIdsSearchFlowIndicator,
  exposedCliqueIdsSearchSignal,
  fetchRecentSessions,
  RecentSessionsRetrievalFlowIndicator,
  recentSessionsRetrievalSignal,
  vulnerableCliquesSearchSignal
} from './actions'
import {
  displayExposedCliqueIdsSearchExceptionsEpic,
  displayRecentSessionsRetrivalExceptionsEpic,
  duplicateGroupsSearchEpic,
  exposedCliqueIdsSearchEpic,
  fetchRecentSessionsEpic,
  vulnerableCliquesSearchEpic
} from './epics'

describe('fetchRecentSessionsEpic', () => {
  it('emits fetching sequence', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(registrationSignal(success(createRegistrationFlowResult({}))))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)
    const mockAdministrationApi: AdministrationApi = mock(AdministrationApi)
    when(mockAdministrationApi.administrationGetRecentSessions(deepEqual({
      headers: { [SESSION_TOKEN_HEADER_NAME]: 'sessionKey' }
    }))).thenResolve(<ServiceGetRecentSessionsResponse>{
      sessions: [{
        creationTimeInMillis: '0',
        ipAddress: '127.0.0.1',
        userAgent: 'agent',
        status: GetRecentSessionsResponseSessionStatus.ACTIVATED
      }]
    })
    container.register<AdministrationApi>(ADMINISTRATION_API_TOKEN, {
      useValue: instance(mockAdministrationApi)
    })

    const epicTracker = new EpicTracker(fetchRecentSessionsEpic(action$, state$, {}))
    actionSubject.next(fetchRecentSessions())
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      recentSessionsRetrievalSignal(indicator(RecentSessionsRetrievalFlowIndicator.WORKING)),
      recentSessionsRetrievalSignal(success([{
        creationTimeInMillis: 0,
        ipAddress: '127.0.0.1',
        userAgent: 'agent',
        geolocation: {},
        status: SessionStatus.ACTIVATED
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

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      showToast({ message: 'exception' })
    ])
  })
})

describe('duplicateGroupsSearchEpic', () => {
  beforeEach(() => {
    container.register<UidService>(UID_SERVICE_TOKEN, {
      useValue: new SequentialFakeUidService()
    })
  })

  it('finds duplicates in the initial state', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(emplace([
      createUserKey({ identifier: '1', value: 'value' }),
      createUserKey({ identifier: '2', value: 'value' }),
      createUserKey({ identifier: '3', value: 'random' })
    ]))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(duplicateGroupsSearchEpic(action$, state$, {}))
    actionSubject.next(enableAnalysis())
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      duplicateGroupsSearchSignal(success([['uid-1', 'uid-2']]))
    ])
  })

  it('reruns on user keys update', async () => {
    const userKeys = [
      createUserKey({ identifier: '1', value: 'value' }),
      createUserKey({ identifier: '2', value: 'value' })
    ]
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(emplace([userKeys[0]]))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(duplicateGroupsSearchEpic(action$, state$, {}))
    actionSubject.next(enableAnalysis())
    expect(await epicTracker.nextEmission()).to.deep.equal(
      duplicateGroupsSearchSignal(success([])))
    store.dispatch(creationSignal(
      success(userKeys[1]), { uid: 'random', clique: 'clique' }))
    actionSubject.next(userKeysUpdate(userKeys))
    expect(await epicTracker.nextEmission()).to.deep.equal(
      duplicateGroupsSearchSignal(success([['clique', 'uid-1']])))
  })

  it('emits search cancellation', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(duplicateGroupsSearchEpic(action$, state$, {}))
    actionSubject.next(disableAnalysis())
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      duplicateGroupsSearchSignal(cancel())
    ])
  })
})

describe('exposedCliqueIdsSearchEpic', () => {
  beforeEach(() => {
    container.register<UidService>(UID_SERVICE_TOKEN, {
      useValue: new SequentialFakeUidService()
    })
  })

  it('finds vulnerabilities in the initial state', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(emplace([
      createUserKey({ identifier: '1', value: 'x' }),
      createUserKey({ identifier: '2', value: 'y' })
    ]))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)
    const mockPwnedService = mock<PwnedService>()
    when(mockPwnedService.checkKey('x')).thenResolve(true)
    when(mockPwnedService.checkKey('y')).thenResolve(false)
    container.register<PwnedService>(PWNED_SERVICE_TOKEN, {
      useValue: instance(mockPwnedService)
    })

    const epicTracker = new EpicTracker(exposedCliqueIdsSearchEpic(action$, state$, {}))
    actionSubject.next(enableAnalysis())
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      exposedCliqueIdsSearchSignal(indicator(ExposedCliqueIdsSearchFlowIndicator.WORKING)),
      exposedCliqueIdsSearchSignal(success(['uid-1']))
    ])
  })

  it('reruns on user keys update', async () => {
    const userKeys: Key[] = [
      createUserKey({ identifier: 'identifier', value: 'value' })
    ]
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)
    const mockPwnedService = mock<PwnedService>()
    when(mockPwnedService.checkKey('value')).thenResolve(true)
    container.register<PwnedService>(PWNED_SERVICE_TOKEN, {
      useValue: instance(mockPwnedService)
    })

    const epicTracker = new EpicTracker(exposedCliqueIdsSearchEpic(action$, state$, {}))
    actionSubject.next(enableAnalysis())
    expect(await epicTracker.nextEmission()).to.deep.equal(
      exposedCliqueIdsSearchSignal(indicator(ExposedCliqueIdsSearchFlowIndicator.WORKING)))
    expect(await epicTracker.nextEmission()).to.deep.equal(
      exposedCliqueIdsSearchSignal(success([])))
    store.dispatch(creationSignal(success(userKeys[0]), { uid: 'random', clique: 'clique' }))
    actionSubject.next(userKeysUpdate(userKeys))
    expect(await epicTracker.nextEmission()).to.deep.equal(
      exposedCliqueIdsSearchSignal(indicator(ExposedCliqueIdsSearchFlowIndicator.WORKING)))
    expect(await epicTracker.nextEmission()).to.deep.equal(
      exposedCliqueIdsSearchSignal(success(['clique'])))
  })

  it('emits search cancellation', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(exposedCliqueIdsSearchEpic(action$, state$, {}))
    actionSubject.next(disableAnalysis())
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      exposedCliqueIdsSearchSignal(cancel())
    ])
  })
})

describe('displayExposedCliqueIdsSearchExceptionsEpic', () => {
  it('emits toast data', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(displayExposedCliqueIdsSearchExceptionsEpic(action$, state$, {}))
    actionSubject.next(exposedCliqueIdsSearchSignal(exception('exception')))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      showToast({ message: 'exception' })
    ])
  })
})

describe('vulnerableCliquesSearchEpic', () => {
  beforeEach(() => {
    container.register<UidService>(UID_SERVICE_TOKEN, {
      useValue: new SequentialFakeUidService()
    })
  })

  it('finds weaknesses in the initial state', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(emplace([
      createUserKey({ identifier: '1', value: 'abc', tags: ['abc'] }),
      createUserKey({ identifier: '2', value: 'secure' })
    ]))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)
    const mockStrengthTestService = mock<StrengthTestService>()
    when(mockStrengthTestService.score('abc', deepEqual(['abc']))).thenReturn({
      value: 0,
      color: Color.RED
    })
    when(mockStrengthTestService.score('secure', deepEqual([]))).thenReturn({
      value: 1,
      color: Color.GREEN
    })
    container.register<StrengthTestService>(STRENGTH_TEST_SERVICE_TOKEN, {
      useValue: instance(mockStrengthTestService)
    })

    const epicTracker = new EpicTracker(vulnerableCliquesSearchEpic(action$, state$, {}))
    actionSubject.next(enableAnalysis())
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      vulnerableCliquesSearchSignal(success([{
        name: 'uid-1',
        score: {
          value: 0,
          color: Color.RED
        }
      }]))
    ])
  })

  it('reruns on user keys update', async () => {
    const userKeys = [
      createUserKey({ identifier: 'identifier', value: 'value' })
    ]
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)
    const mockStrengthTestService = mock<StrengthTestService>()
    when(mockStrengthTestService.score('value', deepEqual([]))).thenReturn({
      value: 0,
      color: Color.RED
    })
    container.register<StrengthTestService>(STRENGTH_TEST_SERVICE_TOKEN, {
      useValue: instance(mockStrengthTestService)
    })

    const epicTracker = new EpicTracker(vulnerableCliquesSearchEpic(action$, state$, {}))
    actionSubject.next(enableAnalysis())
    expect(await epicTracker.nextEmission()).to.deep.equal(
      vulnerableCliquesSearchSignal(success([])))
    store.dispatch(creationSignal(success(userKeys[0]), { uid: 'random', clique: 'clique' }))
    actionSubject.next(userKeysUpdate(userKeys))
    expect(await epicTracker.nextEmission()).to.deep.equal(
      vulnerableCliquesSearchSignal(success([{
        name: 'clique',
        score: { value: 0, color: Color.RED }
      }]))
    )
  })

  it('emits search cancellation', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(vulnerableCliquesSearchEpic(action$, state$, {}))
    actionSubject.next(disableAnalysis())
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      vulnerableCliquesSearchSignal(cancel())
    ])
  })
})
