import { exception, FlowError, indicator, StandardError, success } from '@/redux/flow_signal'
import { RootAction } from '@/redux/root_action'
import { reducer, RootState } from '@/redux/root_reducer'
import { EpicTracker, setUpEpicChannels } from '@/redux/testing'
import { SodiumClient } from '@/sodium_client'
import { createStore, Store } from '@reduxjs/toolkit'
import { expect } from 'chai'
import { deepEqual, instance, mock, objectContaining, when } from 'ts-mockito'
import { container } from 'tsyringe'
import {
  authnViaApiSignal,
  authnViaDepotSignal,
  backgroundAuthnSignal,
  registrationSignal
} from '../../authn/actions'
import {
  create,
  creationSignal,
  delete_,
  deletionSignal,
  emplace,
  OperationIndicator,
  update,
  updationSignal
} from './actions'
import {
  creationEpic,
  deletionEpic,
  displayExceptionsEpic,
  inheritKeysFromAuthnDataEpic,
  updationEpic
} from './epics'
import {
  AdministrationApi,
  ServiceCreateKeyResponse,
  ServiceUpdateKeyResponse,
  ServiceDeleteKeyResponse
} from '@/api/definitions'
import { SESSION_TOKEN_HEADER_NAME } from '@/headers'
import { ADMINISTRATION_API_TOKEN } from '@/api/api_di'
import { showToast } from '../../ui/toast/actions'
import { PayloadAction } from 'typesafe-actions'
import { Key } from '@/redux/entities'

describe('creationEpic', () => {
  it('emits creation sequence', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(registrationSignal(success({
      username: 'username',
      parametrization: 'parametrization',
      encryptionKey: 'encryptionKey',
      sessionKey: 'sessionKey'
    })))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)
    const mockSodiumClient = mock(SodiumClient)
    when(mockSodiumClient.encryptPassword('encryptionKey', objectContaining({
      value: 'value',
      tags: ['tag']
    }))).thenResolve({
      value: '$value',
      tags: ['$tag']
    })
    container.register(SodiumClient, {
      useValue: instance(mockSodiumClient)
    })
    const mockAdministrationApi: AdministrationApi = mock(AdministrationApi)
    when(mockAdministrationApi.createKey(
      deepEqual({
        password: {
          value: '$value',
          tags: ['$tag']
        }
      }),
      deepEqual({ headers: { [SESSION_TOKEN_HEADER_NAME]: 'sessionKey' } })
    )).thenResolve(<ServiceCreateKeyResponse>{
      identifier: 'identifier'
    })
    container.register<AdministrationApi>(ADMINISTRATION_API_TOKEN, {
      useValue: instance(mockAdministrationApi)
    })

    const epicTracker = new EpicTracker(creationEpic(action$, state$, {}))
    actionSubject.next(create({
      value: 'value',
      tags: ['tag']
    }))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(epicTracker.getActions()).to.deep.equal([
      creationSignal(indicator(OperationIndicator.WORKING)),
      creationSignal(success({
        identifier: 'identifier',
        value: 'value',
        tags: ['tag']
      }))
    ])
  })
})

describe('updationEpic', () => {
  it('emits updation sequence', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(registrationSignal(success({
      username: 'username',
      parametrization: 'parametrization',
      encryptionKey: 'encryptionKey',
      sessionKey: 'sessionKey'
    })))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)
    const mockSodiumClient = mock(SodiumClient)
    when(mockSodiumClient.encryptPassword('encryptionKey', objectContaining({
      value: 'value',
      tags: ['tag']
    }))).thenResolve({
      value: '$value',
      tags: ['$tag']
    })
    container.register(SodiumClient, {
      useValue: instance(mockSodiumClient)
    })
    const mockAdministrationApi: AdministrationApi = mock(AdministrationApi)
    when(mockAdministrationApi.updateKey(
      deepEqual({
        key: {
          identifier: 'identifier',
          password: {
            value: '$value',
            tags: ['$tag']
          }
        }
      }),
      deepEqual({ headers: { [SESSION_TOKEN_HEADER_NAME]: 'sessionKey' } })
    )).thenResolve(<ServiceUpdateKeyResponse>{})
    container.register<AdministrationApi>(ADMINISTRATION_API_TOKEN, {
      useValue: instance(mockAdministrationApi)
    })

    const epicTracker = new EpicTracker(updationEpic(action$, state$, {}))
    actionSubject.next(update({
      identifier: 'identifier',
      value: 'value',
      tags: ['tag']
    }))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(epicTracker.getActions()).to.deep.equal([
      updationSignal(indicator(OperationIndicator.WORKING)),
      updationSignal(success({
        identifier: 'identifier',
        value: 'value',
        tags: ['tag']
      }))
    ])
  })
})

describe('deletionEpic', () => {
  it('emits deletion sequence', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(registrationSignal(success({
      username: 'username',
      parametrization: 'parametrization',
      encryptionKey: 'encryptionKey',
      sessionKey: 'sessionKey'
    })))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)
    const mockAdministrationApi: AdministrationApi = mock(AdministrationApi)
    when(mockAdministrationApi.deleteKey(
      deepEqual({ identifier: 'identifier' }),
      deepEqual({ headers: { [SESSION_TOKEN_HEADER_NAME]: 'sessionKey' } })
    )).thenResolve(<ServiceDeleteKeyResponse>{})
    container.register<AdministrationApi>(ADMINISTRATION_API_TOKEN, {
      useValue: instance(mockAdministrationApi)
    })

    const epicTracker = new EpicTracker(deletionEpic(action$, state$, {}))
    actionSubject.next(delete_('identifier'))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(epicTracker.getActions()).to.deep.equal([
      deletionSignal(indicator(OperationIndicator.WORKING)),
      deletionSignal(success('identifier'))
    ])
  })
})

describe('displayExceptionsEpic', () => {
  ;(<[PayloadAction<any, FlowError<StandardError<unknown>>>, string][]>[
    [creationSignal(exception('creation')), 'creation'],
    [updationSignal(exception('updation')), 'updation'],
    [deletionSignal(exception('deletion')), 'deletion']
  ]).forEach(([trigger, message]) => {
    it(`emits toast data on ${trigger.type}`, async () => {
      const store: Store<RootState, RootAction> = createStore(reducer)
      const { action$, actionSubject, state$ } = setUpEpicChannels(store)

      const epicTracker = new EpicTracker(displayExceptionsEpic(action$, state$, {}))
      actionSubject.next(trigger)
      actionSubject.complete()
      await epicTracker.waitForCompletion()

      expect(epicTracker.getActions()).to.deep.equal([showToast({ message })])
    })
  })
})

describe('inheritKeysFromAuthnDataEpic', () => {
  const userKeys: Key[] = [{
    identifier: 'identifier',
    value: 'value',
    tags: ['tag']
  }]
  ;[
    authnViaApiSignal(success({
      username: 'username',
      password: 'password',
      parametrization: 'parametrization',
      encryptionKey: 'encryptionKey',
      sessionKey: 'sessionKey',
      requiresMailVerification: false,
      userKeys
    })),
    authnViaDepotSignal(success({
      username: 'username',
      password: 'password',
      userKeys,
      vaultKey: 'vaultKey'
    })),
    backgroundAuthnSignal(success({
      username: 'username',
      password: 'password',
      parametrization: 'parametrization',
      encryptionKey: 'encryptionKey',
      sessionKey: 'sessionKey',
      requiresMailVerification: false,
      userKeys
    }))
  ].forEach((trigger) => {
    it(`emits \`emplace\` on ${trigger.type}`, async () => {
      const store: Store<RootState, RootAction> = createStore(reducer)
      const { action$, actionSubject, state$ } = setUpEpicChannels(store)

      const epicTracker = new EpicTracker(inheritKeysFromAuthnDataEpic(action$, state$, {}))
      actionSubject.next(trigger)
      actionSubject.complete()
      await epicTracker.waitForCompletion()

      expect(epicTracker.getActions()).to.deep.equal([
        emplace(userKeys)
      ])
    })
  })
})
