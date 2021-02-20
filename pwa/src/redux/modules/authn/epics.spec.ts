import { RootAction } from '@/redux/root_action'
import { reducer, RootState } from '@/redux/root_reducer'
import { EpicTracker, setUpEpicChannels } from '@/redux/testing'
import { SodiumClient } from '@/sodium_client'
import { createStore, Store } from '@reduxjs/toolkit'
import { deepEqual, instance, mock, when } from 'ts-mockito'
import { container } from 'tsyringe'
import {
  AuthenticationApi,
  ServiceRegisterResponse,
  ServiceRegisterResponseError
} from '@/api/definitions'
import { AUTHENTICATION_API_TOKEN } from '@/api/api_di'
import { displayRegistrationExceptionsEpic, registrationEpic } from './epics'
import {
  register,
  RegistrationFlowIndicator,
  registrationReset,
  registrationSignal
} from './actions'
import { expect } from 'chai'
import { cancel, exception, indicator, success } from '@/redux/flow_signal'
import { showToast } from '../ui/toast/actions'

describe('registrationEpic', () => {
  it('emits registration sequence', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)
    const mockSodiumClient = mock(SodiumClient)
    when(mockSodiumClient.generateArgon2Parametrization()).thenResolve('parametrization')
    when(mockSodiumClient.computeAuthDigestAndEncryptionKey('parametrization', 'password')).thenResolve({
      authDigest: 'authDigest',
      encryptionKey: 'encryptionKey'
    })
    container.register(SodiumClient, {
      useValue: instance(mockSodiumClient)
    })
    const mockAuthenticationApi: AuthenticationApi = mock(AuthenticationApi)
    when(mockAuthenticationApi.register(deepEqual({
      username: 'username',
      salt: 'parametrization',
      digest: 'authDigest',
      mail: 'mail@example.com'
    }))).thenResolve(<ServiceRegisterResponse>{
      error: ServiceRegisterResponseError.NONE,
      sessionKey: 'sessionKey'
    })
    container.register<AuthenticationApi>(AUTHENTICATION_API_TOKEN, {
      useValue: instance(mockAuthenticationApi)
    })

    const epicTracker = new EpicTracker(registrationEpic(action$, state$, {}))
    actionSubject.next(register({
      username: 'username',
      password: 'password',
      mail: 'mail@example.com'
    }))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(epicTracker.getActions()).to.deep.equal([
      registrationSignal(indicator(RegistrationFlowIndicator.GENERATING_PARAMETRIZATION)),
      registrationSignal(indicator(RegistrationFlowIndicator.COMPUTING_MASTER_KEY_DERIVATIVES)),
      registrationSignal(indicator(RegistrationFlowIndicator.MAKING_REQUEST)),
      registrationSignal(success({
        username: 'username',
        parametrization: 'parametrization',
        encryptionKey: 'encryptionKey',
        sessionKey: 'sessionKey'
      }))
    ])
  })

  it('emits registration cancellation', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(registrationEpic(action$, state$, {}))
    actionSubject.next(registrationReset())
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(epicTracker.getActions()).to.deep.equal([
      registrationSignal(cancel())
    ])
  })
})

describe('displayRegistrationExceptionsEpic', () => {
  it('emits toast data', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(displayRegistrationExceptionsEpic(action$, state$, {}))
    actionSubject.next(registrationSignal(exception('exception')))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(epicTracker.getActions()).to.deep.equal([
      showToast({ message: 'exception' })
    ])
  })
})
