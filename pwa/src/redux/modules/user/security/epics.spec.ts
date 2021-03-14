import { cancel, exception, indicator, success } from '@/redux/flow_signal'
import { RootAction } from '@/redux/root_action'
import { reducer, RootState } from '@/redux/root_reducer'
import { EpicTracker, setUpEpicChannels, drainEpicActions } from '@/redux/testing'
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
  recentSessionsRetrievalSignal,
  vulnerableKeysSearchSignal
} from './actions'
import {
  displayExposedUserKeyIdsSearchExceptionsEpic,
  displayRecentSessionsRetrivalExceptionsEpic,
  duplicateGroupsSearchEpic,
  exposedUserKeyIdsSearchEpic,
  fetchRecentSessionsEpic,
  vulnerableKeysSearchEpic
} from './epics'
import {
  AdministrationApi,
  ServiceGetRecentSessionsResponse
} from '@/api/definitions'
import { SESSION_TOKEN_HEADER_NAME } from '@/headers'
import { container } from 'tsyringe'
import { ADMINISTRATION_API_TOKEN } from '@/api/api_di'
import { showToast } from '../../ui/toast/actions'
import { creationSignal, emplace, userKeysUpdate } from '../keys/actions'
import { PwnedService, PWNED_SERVICE_TOKEN } from '@/cryptography/pwned_service'
import { Key } from '@/redux/entities'
import { Color, StrengthTestService, STRENGTH_TEST_SERVICE_TOKEN } from '@/cryptography/strength_test_service'

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

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
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

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
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

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      duplicateGroupsSearchSignal(success([['0', '1']]))
    ])
  })

  it('reruns on user keys update', async () => {
    const userKeys = [
      { identifier: '0', value: 'value', tags: [] },
      { identifier: '1', value: 'value', tags: [] }
    ]
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(emplace([userKeys[0]]))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(duplicateGroupsSearchEpic(action$, state$, {}))
    actionSubject.next(enableAnalysis())
    expect(await epicTracker.nextEmission()).to.deep.equal(
      duplicateGroupsSearchSignal(success([])))
    store.dispatch(creationSignal(success(userKeys[1])))
    actionSubject.next(userKeysUpdate(userKeys))
    expect(await epicTracker.nextEmission()).to.deep.equal(
      duplicateGroupsSearchSignal(success([['1', '0']])))
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

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      exposedUserKeyIdsSearchSignal(indicator(ExposedUserKeyIdsSearchFlowIndicator.WORKING)),
      exposedUserKeyIdsSearchSignal(success(['0']))
    ])
  })

  it('reruns on user keys update', async () => {
    const userKeys: Key[] = [{ identifier: 'identifier', value: 'value', tags: [] }]
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)
    const mockPwnedService = mock<PwnedService>()
    when(mockPwnedService.checkKey('value')).thenResolve(true)
    container.register<PwnedService>(PWNED_SERVICE_TOKEN, {
      useValue: instance(mockPwnedService)
    })

    const epicTracker = new EpicTracker(exposedUserKeyIdsSearchEpic(action$, state$, {}))
    actionSubject.next(enableAnalysis())
    expect(await epicTracker.nextEmission()).to.deep.equal(
      exposedUserKeyIdsSearchSignal(indicator(ExposedUserKeyIdsSearchFlowIndicator.WORKING)))
    expect(await epicTracker.nextEmission()).to.deep.equal(
      exposedUserKeyIdsSearchSignal(success([])))
    store.dispatch(creationSignal(success(userKeys[0])))
    actionSubject.next(userKeysUpdate(userKeys))
    expect(await epicTracker.nextEmission()).to.deep.equal(
      exposedUserKeyIdsSearchSignal(indicator(ExposedUserKeyIdsSearchFlowIndicator.WORKING)))
    expect(await epicTracker.nextEmission()).to.deep.equal(
      exposedUserKeyIdsSearchSignal(success(['identifier'])))
  })

  it('emits search cancellation', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(exposedUserKeyIdsSearchEpic(action$, state$, {}))
    actionSubject.next(disableAnalysis())
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
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

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      showToast({ message: 'exception' })
    ])
  })
})

describe('vulnerableKeysSearchEpic', () => {
  it('finds weaknesses in the initial state', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(emplace([
      { identifier: '0', value: 'abc', tags: ['abc'] },
      { identifier: '1', value: 'secure', tags: [] }
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

    const epicTracker = new EpicTracker(vulnerableKeysSearchEpic(action$, state$, {}))
    actionSubject.next(enableAnalysis())
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      vulnerableKeysSearchSignal(success([{
        identifier: '0',
        score: {
          value: 0,
          color: Color.RED
        }
      }]))
    ])
  })

  it('reruns on user keys update', async () => {
    const userKeys = [{ identifier: 'identifier', value: 'value', tags: [] }]
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

    const epicTracker = new EpicTracker(vulnerableKeysSearchEpic(action$, state$, {}))
    actionSubject.next(enableAnalysis())
    expect(await epicTracker.nextEmission()).to.deep.equal(
      vulnerableKeysSearchSignal(success([])))
    store.dispatch(creationSignal(success(userKeys[0])))
    actionSubject.next(userKeysUpdate(userKeys))
    expect(await epicTracker.nextEmission()).to.deep.equal(
      vulnerableKeysSearchSignal(success([{
        identifier: 'identifier',
        score: { value: 0, color: Color.RED }
      }]))
    )
  })

  it('emits search cancellation', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(vulnerableKeysSearchEpic(action$, state$, {}))
    actionSubject.next(disableAnalysis())
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      vulnerableKeysSearchSignal(cancel())
    ])
  })
})
