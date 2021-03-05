import { RootAction } from '@/redux/root_action'
import { reducer, RootState } from '@/redux/root_reducer'
import { drainEpicActions, EpicTracker, setUpEpicChannels } from '@/redux/testing'
import { SodiumClient } from '@/sodium_client'
import { createStore, Store } from '@reduxjs/toolkit'
import { deepEqual, instance, mock, when } from 'ts-mockito'
import { container } from 'tsyringe'
import {
  AuthenticationApi,
  ServiceRegisterResponse,
  ServiceRegisterResponseError,
  ServiceGetSaltResponse,
  ServiceGetSaltResponseError,
  ServiceLogInResponse,
  ServiceLogInResponseError
} from '@/api/definitions'
import { AUTHENTICATION_API_TOKEN } from '@/api/api_di'
import {
  displayRegistrationExceptionsEpic,
  logInViaApiEpic,
  registrationEpic,
  displayAuthnViaApiExceptionsEpic,
  logInViaDepotEpic,
  displayAuthnViaDepotExceptionsEpic,
  remoteCredentialsMismatchLocalEpic
} from './epics'
import {
  AuthnViaApiFlowIndicator,
  authnViaApiReset,
  authnViaApiSignal,
  AuthnViaDepotFlowError,
  AuthnViaDepotFlowIndicator,
  authnViaDepotReset,
  authnViaDepotSignal,
  backgroundAuthnSignal,
  logInViaApi,
  logInViaDepot,
  register,
  RegistrationFlowIndicator,
  registrationReset,
  registrationSignal
} from './actions'
import { expect } from 'chai'
import { cancel, exception, failure, indicator, success } from '@/redux/flow_signal'
import { showToast } from '../ui/toast/actions'
import { rehydrateDepot } from '../depot/actions'
import { Key } from '@/redux/entities'
import { remoteCredentialsMismatchLocal } from '../user/account/actions'

describe('registrationEpic', () => {
  it('emits registration sequence', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)
    const mockSodiumClient = mock(SodiumClient)
    when(mockSodiumClient.generateNewParametrization()).thenResolve('parametrization')
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

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
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

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
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

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      showToast({ message: 'exception' })
    ])
  })
})

describe('logInViaApiEpic', () => {
  it('emits authentication sequence', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)
    const mockAuthenticationApi: AuthenticationApi = mock(AuthenticationApi)
    when(mockAuthenticationApi.getSalt('username')).thenResolve(<ServiceGetSaltResponse>{
      error: ServiceGetSaltResponseError.NONE,
      salt: 'parametrization'
    })
    when(mockAuthenticationApi.logIn(deepEqual({
      username: 'username',
      digest: 'authDigest'
    }))).thenResolve(<ServiceLogInResponse>{
      error: ServiceLogInResponseError.NONE,
      payload: {
        sessionKey: 'sessionKey',
        requiresMailVerification: false,
        keySet: {
          items: [{
            identifier: 'identifier',
            password: {
              value: '$value',
              tags: ['$tag']
            }
          }]
        }
      }
    })
    container.register<AuthenticationApi>(AUTHENTICATION_API_TOKEN, {
      useValue: instance(mockAuthenticationApi)
    })
    const mockSodiumClient = mock(SodiumClient)
    when(mockSodiumClient.computeAuthDigestAndEncryptionKey('parametrization', 'password')).thenResolve({
      authDigest: 'authDigest',
      encryptionKey: 'encryptionKey'
    })
    when(mockSodiumClient.decryptPassword('encryptionKey', deepEqual({
      value: '$value',
      tags: ['$tag']
    }))).thenResolve({
      value: 'value',
      tags: ['tag']
    })
    container.register(SodiumClient, {
      useValue: instance(mockSodiumClient)
    })

    const epicTracker = new EpicTracker(logInViaApiEpic(action$, state$, {}))
    actionSubject.next(logInViaApi({
      username: 'username',
      password: 'password'
    }))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      authnViaApiSignal(indicator(AuthnViaApiFlowIndicator.RETRIEVING_PARAMETRIZATION)),
      authnViaApiSignal(indicator(AuthnViaApiFlowIndicator.COMPUTING_MASTER_KEY_DERIVATIVES)),
      authnViaApiSignal(indicator(AuthnViaApiFlowIndicator.MAKING_REQUEST)),
      authnViaApiSignal(indicator(AuthnViaApiFlowIndicator.DECRYPTING_DATA)),
      authnViaApiSignal(success({
        username: 'username',
        password: 'password',
        parametrization: 'parametrization',
        encryptionKey: 'encryptionKey',
        sessionKey: 'sessionKey',
        requiresMailVerification: false,
        userKeys: [{
          identifier: 'identifier',
          value: 'value',
          tags: ['tag']
        }]
      }))
    ])
  })

  it('does not get stuck on an empty set of keys', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)
    const mockAuthenticationApi: AuthenticationApi = mock(AuthenticationApi)
    when(mockAuthenticationApi.getSalt('username')).thenResolve(<ServiceGetSaltResponse>{
      error: ServiceGetSaltResponseError.NONE,
      salt: 'parametrization'
    })
    when(mockAuthenticationApi.logIn(deepEqual({
      username: 'username',
      digest: 'authDigest'
    }))).thenResolve(<ServiceLogInResponse>{
      error: ServiceLogInResponseError.NONE,
      payload: {
        sessionKey: 'sessionKey',
        requiresMailVerification: false,
        keySet: { items: [] }
      }
    })
    container.register<AuthenticationApi>(AUTHENTICATION_API_TOKEN, {
      useValue: instance(mockAuthenticationApi)
    })
    const mockSodiumClient = mock(SodiumClient)
    when(mockSodiumClient.computeAuthDigestAndEncryptionKey('parametrization', 'password')).thenResolve({
      authDigest: 'authDigest',
      encryptionKey: 'encryptionKey'
    })
    container.register(SodiumClient, {
      useValue: instance(mockSodiumClient)
    })

    const epicTracker = new EpicTracker(logInViaApiEpic(action$, state$, {}))
    actionSubject.next(logInViaApi({
      username: 'username',
      password: 'password'
    }))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      authnViaApiSignal(indicator(AuthnViaApiFlowIndicator.RETRIEVING_PARAMETRIZATION)),
      authnViaApiSignal(indicator(AuthnViaApiFlowIndicator.COMPUTING_MASTER_KEY_DERIVATIVES)),
      authnViaApiSignal(indicator(AuthnViaApiFlowIndicator.MAKING_REQUEST)),
      authnViaApiSignal(indicator(AuthnViaApiFlowIndicator.DECRYPTING_DATA)),
      authnViaApiSignal(success({
        username: 'username',
        password: 'password',
        parametrization: 'parametrization',
        encryptionKey: 'encryptionKey',
        sessionKey: 'sessionKey',
        requiresMailVerification: false,
        userKeys: []
      }))
    ])
  })

  it('emits authentication cancellation', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(logInViaApiEpic(action$, state$, {}))
    actionSubject.next(authnViaApiReset())
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      authnViaApiSignal(cancel())
    ])
  })
})

describe('displayAuthnViaApiExceptionsEpic', () => {
  it('emits toast data', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(displayAuthnViaApiExceptionsEpic(action$, state$, {}))
    actionSubject.next(authnViaApiSignal(exception('exception')))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      showToast({ message: 'exception' })
    ])
  })
})

describe('logInViaDepotEpic', () => {
  it('emits authentication sequence', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(rehydrateDepot({
      username: 'username',
      salt: 'parametrization',
      hash: 'authDigest',
      vault: 'vault'
    }))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)
    const mockSodiumClient = mock(SodiumClient)
    when(mockSodiumClient.computeAuthDigestAndEncryptionKey('parametrization', 'password')).thenResolve({
      authDigest: 'authDigest',
      encryptionKey: 'vaultKey'
    })
    const userKeys: Key[] = [{
      identifier: 'identifier',
      value: 'value',
      tags: ['tag']
    }]
    when(mockSodiumClient.decryptMessage('vaultKey', 'vault')).thenResolve(JSON.stringify(userKeys))
    container.register(SodiumClient, {
      useValue: instance(mockSodiumClient)
    })

    const epicTracker = new EpicTracker(logInViaDepotEpic(action$, state$, {}))
    actionSubject.next(logInViaDepot({
      username: 'username',
      password: 'password'
    }))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      authnViaDepotSignal(indicator(AuthnViaDepotFlowIndicator.COMPUTING_MASTER_KEY_DERIVATIVES)),
      authnViaDepotSignal(indicator(AuthnViaDepotFlowIndicator.DECRYPTING_DATA)),
      authnViaDepotSignal(success({
        username: 'username',
        password: 'password',
        userKeys: userKeys,
        vaultKey: 'vaultKey'
      }))
    ])
  })

  it('emits failure when usernames do not match', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(rehydrateDepot({
      username: 'username',
      salt: 'parametrization',
      hash: 'authDigest',
      vault: 'vault'
    }))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(logInViaDepotEpic(action$, state$, {}))
    actionSubject.next(logInViaDepot({
      username: 'random',
      password: 'password'
    }))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      authnViaDepotSignal(failure(AuthnViaDepotFlowError.INVALID_CREDENTIALS))
    ])
  })

  it('emits failure when digests do not match', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(rehydrateDepot({
      username: 'username',
      salt: 'parametrization',
      hash: 'authDigest',
      vault: 'vault'
    }))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)
    const mockSodiumClient = mock(SodiumClient)
    when(mockSodiumClient.computeAuthDigestAndEncryptionKey('parametrization', 'password')).thenResolve({
      authDigest: 'random',
      encryptionKey: 'vaultKey'
    })
    container.register(SodiumClient, {
      useValue: instance(mockSodiumClient)
    })

    const epicTracker = new EpicTracker(logInViaDepotEpic(action$, state$, {}))
    actionSubject.next(logInViaDepot({
      username: 'username',
      password: 'password'
    }))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      authnViaDepotSignal(indicator(AuthnViaDepotFlowIndicator.COMPUTING_MASTER_KEY_DERIVATIVES)),
      authnViaDepotSignal(failure(AuthnViaDepotFlowError.INVALID_CREDENTIALS))
    ])
  })

  it('emits authentication cancellation', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(logInViaDepotEpic(action$, state$, {}))
    actionSubject.next(authnViaDepotReset())
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      authnViaDepotSignal(cancel())
    ])
  })
})

describe('displayAuthnViaDepotExceptionsEpic', () => {
  it('emits toast data', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(displayAuthnViaDepotExceptionsEpic(action$, state$, {}))
    actionSubject.next(authnViaDepotSignal(exception('exception')))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      showToast({ message: 'exception' })
    ])
  })
})

describe('remoteCredentialsMismatchLocalEpic', () => {
  it('emits credentials mismatch action', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(remoteCredentialsMismatchLocalEpic(action$, state$, {}))
    actionSubject.next(backgroundAuthnSignal(failure(ServiceLogInResponseError.INVALIDCREDENTIALS)))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      remoteCredentialsMismatchLocal()
    ])
  })
})
