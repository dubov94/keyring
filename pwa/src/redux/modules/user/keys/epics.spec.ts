import { exception, FlowError, indicator, StandardError, success } from '@/redux/flow_signal'
import { RootAction } from '@/redux/root_action'
import { reducer, RootState } from '@/redux/root_reducer'
import { drainEpicActions, EpicTracker, setUpEpicChannels } from '@/redux/testing'
import { SodiumClient } from '@/cryptography/sodium_client'
import { createStore, Store } from '@reduxjs/toolkit'
import { expect } from 'chai'
import { deepEqual, instance, mock, objectContaining, when } from 'ts-mockito'
import { container } from 'tsyringe'
import {
  authnViaDepotSignal,
  registrationSignal,
  remoteAuthnComplete
} from '../../authn/actions'
import {
  create,
  creationSignal,
  delete_,
  deletionSignal,
  emplace,
  OperationIndicator,
  update,
  updationSignal,
  userKeysUpdate
} from './actions'
import {
  creationEpic,
  deletionEpic,
  displayCudExceptionsEpic,
  inheritKeysFromAuthnDataEpic,
  updationEpic,
  userKeysUpdateEpic
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

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
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

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
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

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      deletionSignal(indicator(OperationIndicator.WORKING)),
      deletionSignal(success('identifier'))
    ])
  })
})

describe('displayCudExceptionsEpic', () => {
  ;(<[PayloadAction<any, FlowError<StandardError<unknown>>>, string][]>[
    [creationSignal(exception('creation')), 'creation'],
    [updationSignal(exception('updation')), 'updation'],
    [deletionSignal(exception('deletion')), 'deletion']
  ]).forEach(([trigger, message]) => {
    it(`emits toast data on ${trigger.type}`, async () => {
      const store: Store<RootState, RootAction> = createStore(reducer)
      const { action$, actionSubject, state$ } = setUpEpicChannels(store)

      const epicTracker = new EpicTracker(displayCudExceptionsEpic(action$, state$, {}))
      actionSubject.next(trigger)
      actionSubject.complete()
      await epicTracker.waitForCompletion()

      expect(await drainEpicActions(epicTracker)).to.deep.equal([showToast({ message })])
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
    remoteAuthnComplete({
      username: 'username',
      password: 'password',
      parametrization: 'parametrization',
      encryptionKey: 'encryptionKey',
      sessionKey: 'sessionKey',
      mailVerificationRequired: false,
      mail: 'mail@example.com',
      userKeys,
      isOtpEnabled: false
    }),
    authnViaDepotSignal(success({
      username: 'username',
      password: 'password',
      userKeys,
      vaultKey: 'vaultKey'
    }))
  ].forEach((trigger) => {
    it(`emits \`emplace\` on ${trigger.type}`, async () => {
      const store: Store<RootState, RootAction> = createStore(reducer)
      const { action$, actionSubject, state$ } = setUpEpicChannels(store)

      const epicTracker = new EpicTracker(inheritKeysFromAuthnDataEpic(action$, state$, {}))
      actionSubject.next(trigger)
      actionSubject.complete()
      await epicTracker.waitForCompletion()

      expect(await drainEpicActions(epicTracker)).to.deep.equal([
        emplace(userKeys)
      ])
    })
  })
})

describe('userKeysUpdateEpic', () => {
  ;[
    emplace([{ identifier: '0', value: 'value', tags: [] }]),
    creationSignal(success({ identifier: '0', value: 'value', tags: [] })),
    updationSignal(success({ identifier: '0', value: 'value', tags: [] })),
    deletionSignal(success('2'))
  ].forEach((trigger) => {
    it(`emits an update on ${trigger.type}`, async () => {
      const userKeys: Key[] = [{
        identifier: '0',
        value: 'value',
        tags: []
      }]
      const store: Store<RootState, RootAction> = createStore(reducer)
      store.dispatch(emplace(userKeys))
      const { action$, actionSubject, state$ } = setUpEpicChannels(store)

      const epicTracker = new EpicTracker(userKeysUpdateEpic(action$, state$, {}))
      actionSubject.next(trigger)
      actionSubject.complete()
      await epicTracker.waitForCompletion()

      expect(await drainEpicActions(epicTracker)).to.deep.equal([userKeysUpdate(userKeys)])
    })
  })
})
