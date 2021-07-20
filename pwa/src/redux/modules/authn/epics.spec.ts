import { RootAction } from '@/redux/root_action'
import { reducer, RootState } from '@/redux/root_reducer'
import { drainEpicActions, EpicTracker, setUpEpicChannels } from '@/redux/testing'
import { SodiumClient } from '@/cryptography/sodium_client'
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
  ServiceLogInResponseError,
  ServiceProvideOtpResponse,
  ServiceProvideOtpResponseError
} from '@/api/definitions'
import { AUTHENTICATION_API_TOKEN } from '@/api/api_di'
import {
  displayRegistrationExceptionsEpic,
  logInViaApiEpic,
  registrationEpic,
  displayAuthnViaApiExceptionsEpic,
  logInViaDepotEpic,
  displayAuthnViaDepotExceptionsEpic,
  remoteCredentialsMismatchLocalEpic,
  remoteAuthnCompleteOnCredentialsEpic,
  provideOtpEpic,
  displayAuthnOtpProvisionExceptionsEpic
} from './epics'
import {
  AuthnOtpProvisionFlowIndicator,
  authnOtpProvisionReset,
  authnOtpProvisionSignal,
  AuthnViaApiFlowIndicator,
  AuthnViaApiParams,
  authnViaApiReset,
  authnViaApiSignal,
  AuthnViaDepotFlowError,
  AuthnViaDepotFlowIndicator,
  authnViaDepotReset,
  authnViaDepotSignal,
  backgroundAuthnSignal,
  logInViaApi,
  logInViaDepot,
  provideOtp,
  register,
  RegistrationFlowIndicator,
  registrationReset,
  registrationSignal,
  remoteAuthnComplete
} from './actions'
import { expect } from 'chai'
import { cancel, exception, failure, FlowSignal, indicator, StandardError, success } from '@/redux/flow_signal'
import { showToast } from '../ui/toast/actions'
import { rehydrateDepot } from '../depot/actions'
import { Key } from '@/redux/entities'
import { remoteCredentialsMismatchLocal } from '../user/account/actions'
import { either, option } from 'fp-ts'
import { Epic } from 'redux-observable'
import { PayloadAction, TypeConstant } from 'typesafe-actions'

const testEpicCancellation = <T extends TypeConstant, I, S, E>(
  epic: Epic<RootAction, RootAction, RootState>,
  actionCreator: () => RootAction,
  signalCreator: (payload: FlowSignal<I, S, StandardError<E>>) =>
    PayloadAction<T, FlowSignal<I, S, StandardError<E>>> & RootAction
) => async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(epic(action$, state$, {}))
    actionSubject.next(actionCreator())
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      signalCreator(cancel())
    ])
  }

const testEpicException = <T extends TypeConstant, I, S, E>(
  epic: Epic<RootAction, RootAction, RootState>,
  signalCreator: (payload: FlowSignal<I, S, StandardError<E>>) =>
    PayloadAction<T, FlowSignal<I, S, StandardError<E>>> & RootAction
) => async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(epic(action$, state$, {}))
    actionSubject.next(signalCreator(exception('exception')))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      showToast({ message: 'exception' })
    ])
  }

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

  it('emits registration cancellation', testEpicCancellation(registrationEpic, registrationReset, registrationSignal))
})

describe('displayRegistrationExceptionsEpic', () => {
  it('emits toast data', testEpicException(displayRegistrationExceptionsEpic, registrationSignal))
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
      userData: {
        sessionKey: 'sessionKey',
        mailVerificationRequired: false,
        mail: 'mail@example.com',
        userKeys: [{
          identifier: 'identifier',
          password: {
            value: '$value',
            tags: ['$tag']
          }
        }]
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
        content: either.right({
          sessionKey: 'sessionKey',
          mailVerificationRequired: false,
          mail: 'mail@example.com',
          userKeys: [{
            identifier: 'identifier',
            value: 'value',
            tags: ['tag']
          }]
        })
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
      userData: {
        sessionKey: 'sessionKey',
        mailVerificationRequired: false,
        mail: 'mail@example.com',
        userKeys: []
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
        content: either.right({
          sessionKey: 'sessionKey',
          mailVerificationRequired: false,
          mail: 'mail@example.com',
          userKeys: []
        })
      }))
    ])
  })

  it('emits authentication cancellation', testEpicCancellation(logInViaApiEpic, authnViaApiReset, authnViaApiSignal))
})

describe('displayAuthnViaApiExceptionsEpic', () => {
  it('emits toast data', testEpicException(displayAuthnViaApiExceptionsEpic, authnViaApiSignal))
})

describe('provideOtpEpic', () => {
  it('emits provision sequence', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)
    const credentialParams: AuthnViaApiParams = {
      username: 'username',
      password: 'password',
      parametrization: 'parametrization',
      encryptionKey: 'encryptionKey'
    }
    const mockAuthenticationApi: AuthenticationApi = mock(AuthenticationApi)
    when(mockAuthenticationApi.provideOtp(deepEqual({
      authnKey: 'authnKey',
      otp: 'otp',
      yieldTrustedToken: false
    }))).thenResolve(<ServiceProvideOtpResponse>{
      error: ServiceProvideOtpResponseError.NONE,
      userData: {
        sessionKey: 'sessionKey',
        mailVerificationRequired: false,
        mail: 'mail@example.com',
        userKeys: [{
          identifier: 'identifier',
          password: {
            value: '$value',
            tags: ['$tag']
          }
        }]
      }
    })
    container.register<AuthenticationApi>(AUTHENTICATION_API_TOKEN, {
      useValue: instance(mockAuthenticationApi)
    })
    const mockSodiumClient = mock(SodiumClient)
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

    const epicTracker = new EpicTracker(provideOtpEpic(action$, state$, {}))
    actionSubject.next(provideOtp({
      credentialParams,
      authnKey: 'authnKey',
      otp: 'otp',
      yieldTrustedToken: false
    }))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      authnOtpProvisionSignal(indicator(AuthnOtpProvisionFlowIndicator.MAKING_REQUEST)),
      authnOtpProvisionSignal(indicator(AuthnOtpProvisionFlowIndicator.DECRYPTING_DATA)),
      authnOtpProvisionSignal(success({
        credentialParams,
        trustedToken: option.none,
        userData: {
          sessionKey: 'sessionKey',
          mailVerificationRequired: false,
          mail: 'mail@example.com',
          userKeys: [{
            identifier: 'identifier',
            value: 'value',
            tags: ['tag']
          }]
        }
      }))
    ])
  })

  it('emits provision cancellation', testEpicCancellation(provideOtpEpic, authnOtpProvisionReset, authnOtpProvisionSignal))
})

describe('displayAuthnOtpProvisionExceptionsEpic', () => {
  it('emits toast data', testEpicException(displayAuthnOtpProvisionExceptionsEpic, authnOtpProvisionSignal))
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

  it('emits authentication cancellation', testEpicCancellation(logInViaDepotEpic, authnViaDepotReset, authnViaDepotSignal))
})

describe('displayAuthnViaDepotExceptionsEpic', () => {
  it('emits toast data', testEpicException(displayAuthnViaDepotExceptionsEpic, authnViaDepotSignal))
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

describe('remoteAuthnCompleteOnCredentialsEpic', () => {
  const params = {
    username: 'username',
    password: 'password',
    parametrization: 'parametrization',
    encryptionKey: 'encryptionKey'
  }
  const userData = {
    sessionKey: 'sessionKey',
    mailVerificationRequired: false,
    mail: 'mail@example.com',
    userKeys: []
  }
  const flowResult = {
    ...params,
    content: either.right(userData)
  }

  ;[
    authnViaApiSignal(success(flowResult)),
    backgroundAuthnSignal(success(flowResult))
  ].forEach((trigger) => {
    it(`emits the action on ${trigger.type}`, async () => {
      const store: Store<RootState, RootAction> = createStore(reducer)
      const { action$, actionSubject, state$ } = setUpEpicChannels(store)

      const epicTracker = new EpicTracker(remoteAuthnCompleteOnCredentialsEpic(action$, state$, {}))
      actionSubject.next(trigger)
      actionSubject.complete()
      await epicTracker.waitForCompletion()

      expect(await drainEpicActions(epicTracker)).to.deep.equal([
        remoteAuthnComplete({ ...params, ...userData })
      ])
    })
  })
})
