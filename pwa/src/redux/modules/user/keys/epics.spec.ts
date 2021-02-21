import { indicator, success } from '@/redux/flow_signal'
import { RootAction } from '@/redux/root_action'
import { reducer, RootState } from '@/redux/root_reducer'
import { EpicTracker, setUpEpicChannels } from '@/redux/testing'
import { SodiumClient } from '@/sodium_client'
import { createStore, Store } from '@reduxjs/toolkit'
import { expect } from 'chai'
import { deepEqual, instance, mock, when } from 'ts-mockito'
import { container } from 'tsyringe'
import { registrationSignal } from '../../authn/actions'
import {
  create,
  creationSignal,
  OperationIndicator
} from './actions'
import { creationEpic } from './epics'
import {
  AdministrationApi,
  ServiceCreateKeyResponse
} from '@/api/definitions'
import { SESSION_TOKEN_HEADER_NAME } from '@/headers'
import { ADMINISTRATION_API_TOKEN } from '@/api/api_di'

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
    when(mockSodiumClient.encryptPassword('encryptionKey', deepEqual({
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
