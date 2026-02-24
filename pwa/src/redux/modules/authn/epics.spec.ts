import { createStore, Store } from '@reduxjs/toolkit'
import { expect } from 'chai'
import { either, option } from 'fp-ts'
import { Epic } from 'redux-observable'
import { deepEqual, instance, mock, when } from 'ts-mockito'
import { container } from 'tsyringe'
import { PayloadAction, TypeConstant } from 'typesafe-actions'
import { AUTHENTICATION_API_TOKEN } from '@/api/api_di'
import {
  AuthenticationApi,
  ServiceRegisterResponse,
  ServiceRegisterResponseError,
  ServiceGetSaltResponse,
  ServiceGetSaltResponseError,
  ServiceLogInResponse,
  ServiceLogInResponseError,
  ServiceProvideOtpResponse,
  ServiceProvideOtpResponseError,
  ServiceFeatureType,
  ServiceFeaturePrompt,
  ServiceUserData
} from '@/api/definitions'
import { SodiumClient } from '@/cryptography/sodium_client'
import { Key } from '@/redux/domain'
import { cancel, exception, failure, FlowSignal, indicator, StandardError, success } from '@/redux/flow_signal'
import { rehydration as depotRehydration, webAuthnResult } from '@/redux/modules/depot/actions'
import { showToast } from '@/redux/modules/ui/toast/actions'
import { defaultMailVerification, remoteCredentialsMismatchLocal } from '@/redux/modules/user/account/actions'
import { RootAction } from '@/redux/root_action'
import { reducer, RootState } from '@/redux/root_reducer'
import { drainEpicActions, EpicTracker, setUpEpicChannels } from '@/redux/testing'
import {
  createAuthnViaDepotFlowResult,
  createDepotRehydration,
  createDepotRehydrationWebAuthn,
  createKeyProto,
  createMasterKeyDerivatives,
  createPasswordInput,
  createRegistrationFlowResult,
  createUserKey,
  createWebAuthnInput,
  createWebAuthnResult
} from '@/redux/testing/domain'
import {
  AuthnInputKind,
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
  backgroundOtpProvisionSignal,
  backgroundRemoteAuthnSignal,
  initiateBackgroundAuthn,
  logInViaApi,
  logInViaDepot,
  provideOtp,
  register,
  RegistrationFlowIndicator,
  registrationReset,
  registrationSignal,
  remoteAuthnComplete
} from './actions'
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
  displayAuthnOtpProvisionExceptionsEpic,
  backgroundOtpProvisionEpic,
  backgroundRemoteAuthnEpic
} from './epics'

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

const createFilledUserDataProto = (): ServiceUserData => ({
  userUid: 'userId',
  sessionKey: 'sessionKey',
  featurePrompts: [{ featureType: ServiceFeatureType.UNKNOWN }],
  mailVerification: {
    required: false,
    tokenUid: ''
  },
  mail: 'mail@example.com',
  userKeys: [createKeyProto({
    uid: 'identifier',
    password: {
      value: '$value',
      tags: ['$tag']
    }
  })]
})

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
    when(mockAuthenticationApi.authenticationRegister(deepEqual({
      username: 'username',
      salt: 'parametrization',
      digest: 'authDigest',
      mail: 'mail@example.com',
      captchaToken: 'captchaToken'
    }))).thenResolve(<ServiceRegisterResponse>{
      error: ServiceRegisterResponseError.NONE,
      userUid: 'userId',
      sessionKey: 'sessionKey',
      mailTokenUid: 'mailTokenId'
    })
    container.register<AuthenticationApi>(AUTHENTICATION_API_TOKEN, {
      useValue: instance(mockAuthenticationApi)
    })

    const epicTracker = new EpicTracker(registrationEpic(action$, state$, {}))
    actionSubject.next(register({
      username: 'username',
      password: 'password',
      mail: 'mail@example.com',
      captchaToken: 'captchaToken'
    }))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      registrationSignal(indicator(RegistrationFlowIndicator.GENERATING_PARAMETRIZATION)),
      registrationSignal(indicator(RegistrationFlowIndicator.COMPUTING_MASTER_KEY_DERIVATIVES)),
      registrationSignal(indicator(RegistrationFlowIndicator.MAKING_REQUEST)),
      registrationSignal(success(createRegistrationFlowResult({})))
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
    when(mockAuthenticationApi.authenticationFetchSalt(deepEqual({
      username: 'username'
    }))).thenResolve(<ServiceGetSaltResponse>{
      error: ServiceGetSaltResponseError.NONE,
      salt: 'parametrization'
    })
    when(mockAuthenticationApi.authenticationLogIn(deepEqual({
      username: 'username',
      digest: 'authDigest'
    }))).thenResolve(<ServiceLogInResponse>{
      error: ServiceLogInResponseError.NONE,
      userData: createFilledUserDataProto()
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
        authnInput: createPasswordInput('password'),
        parametrization: 'parametrization',
        authDigest: 'authDigest',
        encryptionKey: 'encryptionKey',
        content: either.right({
          userId: 'userId',
          sessionKey: 'sessionKey',
          featurePrompts: [{ featureType: ServiceFeatureType.UNKNOWN }],
          mailVerification: defaultMailVerification(),
          mail: 'mail@example.com',
          userKeys: [createUserKey({
            identifier: 'identifier',
            value: 'value',
            tags: ['tag']
          })]
        })
      }))
    ])
  })

  it('does not get stuck on an empty set of keys', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)
    const mockAuthenticationApi: AuthenticationApi = mock(AuthenticationApi)
    when(mockAuthenticationApi.authenticationFetchSalt(deepEqual({
      username: 'username'
    }))).thenResolve(<ServiceGetSaltResponse>{
      error: ServiceGetSaltResponseError.NONE,
      salt: 'parametrization'
    })
    when(mockAuthenticationApi.authenticationLogIn(deepEqual({
      username: 'username',
      digest: 'authDigest'
    }))).thenResolve(<ServiceLogInResponse>{
      error: ServiceLogInResponseError.NONE,
      userData: createFilledUserDataProto()
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
        authnInput: createPasswordInput('password'),
        parametrization: 'parametrization',
        authDigest: 'authDigest',
        encryptionKey: 'encryptionKey',
        content: either.right({
          userId: 'userId',
          sessionKey: 'sessionKey',
          featurePrompts: [{ featureType: ServiceFeatureType.UNKNOWN }],
          mailVerification: defaultMailVerification(),
          mail: 'mail@example.com',
          userKeys: [createUserKey({
            identifier: 'identifier',
            value: 'value',
            tags: ['tag']
          })]
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
      authnInput: createPasswordInput(),
      parametrization: 'parametrization',
      authDigest: 'authDigest',
      encryptionKey: 'encryptionKey'
    }
    const mockAuthenticationApi: AuthenticationApi = mock(AuthenticationApi)
    when(mockAuthenticationApi.authenticationProvideOtp(deepEqual({
      authnKey: 'authnKey',
      otp: 'otp',
      yieldTrustedToken: false
    }))).thenResolve(<ServiceProvideOtpResponse>{
      error: ServiceProvideOtpResponseError.NONE,
      userData: createFilledUserDataProto()
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
          userId: 'userId',
          sessionKey: 'sessionKey',
          featurePrompts: [{ featureType: ServiceFeatureType.UNKNOWN }],
          mailVerification: defaultMailVerification(),
          mail: 'mail@example.com',
          userKeys: [createUserKey({
            identifier: 'identifier',
            value: 'value',
            tags: ['tag']
          })]
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
  it(`emits authentication sequence on ${AuthnInputKind.PASSWORD}`, async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(depotRehydration(createDepotRehydration({})))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)
    const mockSodiumClient = mock(SodiumClient)
    when(mockSodiumClient.computeAuthDigestAndEncryptionKey('salt', 'password')).thenResolve({
      authDigest: 'hash',
      encryptionKey: 'depotKey'
    })
    const userKeys: Key[] = [createUserKey({
      identifier: 'identifier',
      value: 'value',
      tags: ['tag']
    })]
    when(mockSodiumClient.decryptString('depotKey', 'vault')).thenResolve(JSON.stringify(userKeys))
    when(mockSodiumClient.decryptString('depotKey', 'encryptedOtpToken')).thenResolve('otpToken')
    container.register(SodiumClient, {
      useValue: instance(mockSodiumClient)
    })
    const authnInput = createPasswordInput()

    const epicTracker = new EpicTracker(logInViaDepotEpic(action$, state$, {}))
    actionSubject.next(logInViaDepot({
      username: 'username',
      authnInput
    }))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      authnViaDepotSignal(indicator(AuthnViaDepotFlowIndicator.COMPUTING_MASTER_KEY_DERIVATIVES)),
      authnViaDepotSignal(indicator(AuthnViaDepotFlowIndicator.DECRYPTING_DATA)),
      authnViaDepotSignal(success({
        username: 'username',
        authnInput,
        userKeys,
        depotKey: 'depotKey',
        otpToken: 'otpToken'
      }))
    ])
  })

  it(`emits authentication sequence on ${AuthnInputKind.WEB_AUTHN}`, async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(depotRehydration(createDepotRehydration(createDepotRehydrationWebAuthn({}))))
    store.dispatch(webAuthnResult(createWebAuthnResult({})))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)
    const mockSodiumClient = mock(SodiumClient)
    when(mockSodiumClient.decryptString('webAuthnResult', 'webAuthnEncryptedLocalDerivatives')).thenResolve(
      JSON.stringify(createMasterKeyDerivatives({
        authDigest: 'hash',
        encryptionKey: 'depotKey'
      }))
    )
    const userKeys: Key[] = [createUserKey({
      identifier: 'identifier',
      value: 'value',
      tags: ['tag']
    })]
    when(mockSodiumClient.decryptString('depotKey', 'vault')).thenResolve(JSON.stringify(userKeys))
    when(mockSodiumClient.decryptString('depotKey', 'encryptedOtpToken')).thenResolve('otpToken')
    container.register(SodiumClient, {
      useValue: instance(mockSodiumClient)
    })
    const authnInput = createWebAuthnInput()

    const epicTracker = new EpicTracker(logInViaDepotEpic(action$, state$, {}))
    actionSubject.next(logInViaDepot({
      username: 'username',
      authnInput
    }))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      authnViaDepotSignal(indicator(AuthnViaDepotFlowIndicator.COMPUTING_MASTER_KEY_DERIVATIVES)),
      authnViaDepotSignal(indicator(AuthnViaDepotFlowIndicator.DECRYPTING_DATA)),
      authnViaDepotSignal(success({
        username: 'username',
        authnInput,
        userKeys,
        depotKey: 'depotKey',
        otpToken: 'otpToken'
      }))
    ])
  })

  it('emits failure when usernames do not match', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(depotRehydration(createDepotRehydration({})))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(logInViaDepotEpic(action$, state$, {}))
    actionSubject.next(logInViaDepot({
      username: 'random',
      authnInput: createPasswordInput()
    }))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      authnViaDepotSignal(failure(AuthnViaDepotFlowError.INVALID_CREDENTIALS))
    ])
  })

  it('emits failure when digests do not match', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(depotRehydration(createDepotRehydration({})))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)
    const mockSodiumClient = mock(SodiumClient)
    when(mockSodiumClient.computeAuthDigestAndEncryptionKey('salt', 'password')).thenResolve({
      authDigest: 'random',
      encryptionKey: 'depotKey'
    })
    container.register(SodiumClient, {
      useValue: instance(mockSodiumClient)
    })

    const epicTracker = new EpicTracker(logInViaDepotEpic(action$, state$, {}))
    actionSubject.next(logInViaDepot({
      username: 'username',
      authnInput: createPasswordInput()
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

describe('backgroundRemoteAuthnEpic', () => {
  it(`emits authentication sequence on ${AuthnInputKind.WEB_AUTHN}`, async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(depotRehydration(createDepotRehydration(createDepotRehydrationWebAuthn({}))))
    store.dispatch(webAuthnResult(createWebAuthnResult({})))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)
    const mockAuthenticationApi: AuthenticationApi = mock(AuthenticationApi)
    when(mockAuthenticationApi.authenticationFetchSalt(deepEqual({
      username: 'username'
    }))).thenResolve(<ServiceGetSaltResponse>{
      error: ServiceGetSaltResponseError.NONE,
      salt: 'parametrization'
    })
    when(mockAuthenticationApi.authenticationLogIn(deepEqual({
      username: 'username',
      digest: 'webAuthnAuthDigest'
    }))).thenResolve(<ServiceLogInResponse>{
      error: ServiceLogInResponseError.NONE,
      userData: createFilledUserDataProto()
    })
    container.register<AuthenticationApi>(AUTHENTICATION_API_TOKEN, {
      useValue: instance(mockAuthenticationApi)
    })
    const mockSodiumClient = mock(SodiumClient)
    when(mockSodiumClient.decryptString('webAuthnResult', 'webAuthnEncryptedRemoteDerivatives')).thenResolve(
      JSON.stringify(createMasterKeyDerivatives({
        authDigest: 'webAuthnAuthDigest',
        encryptionKey: 'webAuthnEncryptionKey'
      }))
    )
    when(mockSodiumClient.decryptPassword('webAuthnEncryptionKey', deepEqual({
      value: '$value',
      tags: ['$tag']
    }))).thenResolve({
      value: 'value',
      tags: ['tag']
    })
    container.register(SodiumClient, {
      useValue: instance(mockSodiumClient)
    })
    const authnInput = createWebAuthnInput('webAuthnCredentialId')

    const epicTracker = new EpicTracker(backgroundRemoteAuthnEpic(action$, state$, {}))
    actionSubject.next(initiateBackgroundAuthn({
      username: 'username',
      authnInput
    }))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      backgroundRemoteAuthnSignal(indicator(AuthnViaApiFlowIndicator.RETRIEVING_PARAMETRIZATION)),
      backgroundRemoteAuthnSignal(indicator(AuthnViaApiFlowIndicator.COMPUTING_MASTER_KEY_DERIVATIVES)),
      backgroundRemoteAuthnSignal(indicator(AuthnViaApiFlowIndicator.MAKING_REQUEST)),
      backgroundRemoteAuthnSignal(indicator(AuthnViaApiFlowIndicator.DECRYPTING_DATA)),
      backgroundRemoteAuthnSignal(success({
        username: 'username',
        authnInput,
        parametrization: 'parametrization',
        authDigest: 'webAuthnAuthDigest',
        encryptionKey: 'webAuthnEncryptionKey',
        content: either.right({
          userId: 'userId',
          sessionKey: 'sessionKey',
          featurePrompts: [{ featureType: ServiceFeatureType.UNKNOWN }],
          mailVerification: defaultMailVerification(),
          mail: 'mail@example.com',
          userKeys: [createUserKey({
            identifier: 'identifier',
            value: 'value',
            tags: ['tag']
          })]
        })
      }))
    ])
  })
})

describe('backgroundOtpProvisionEpic', () => {
  it('emits provision sequence', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(depotRehydration(createDepotRehydration({})))
    store.dispatch(authnViaDepotSignal(success(createAuthnViaDepotFlowResult({}))))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)
    const credentialParams: AuthnViaApiParams = {
      username: 'username',
      authnInput: createPasswordInput(),
      parametrization: 'parametrization',
      authDigest: 'authDigest',
      encryptionKey: 'encryptionKey'
    }
    const mockSodiumClient = mock(SodiumClient)
    when(mockSodiumClient.decryptString('depotKey', 'encryptedOtpToken')).thenResolve('otpToken')
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
    const mockAuthenticationApi: AuthenticationApi = mock(AuthenticationApi)
    when(mockAuthenticationApi.authenticationProvideOtp(deepEqual({
      authnKey: 'authnKey',
      otp: 'otpToken',
      yieldTrustedToken: true
    }))).thenResolve(<ServiceProvideOtpResponse>{
      error: ServiceProvideOtpResponseError.NONE,
      trustedToken: 'newOtpToken',
      userData: createFilledUserDataProto()
    })
    container.register<AuthenticationApi>(AUTHENTICATION_API_TOKEN, {
      useValue: instance(mockAuthenticationApi)
    })

    const epicTracker = new EpicTracker(backgroundOtpProvisionEpic(action$, state$, {}))
    actionSubject.next(backgroundRemoteAuthnSignal(success({
      ...credentialParams,
      content: either.left({
        authnKey: 'authnKey',
        attemptsLeft: 1
      })
    })))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      backgroundOtpProvisionSignal(indicator(AuthnOtpProvisionFlowIndicator.MAKING_REQUEST)),
      backgroundOtpProvisionSignal(indicator(AuthnOtpProvisionFlowIndicator.DECRYPTING_DATA)),
      backgroundOtpProvisionSignal(success({
        credentialParams,
        trustedToken: option.of('newOtpToken'),
        userData: {
          userId: 'userId',
          sessionKey: 'sessionKey',
          featurePrompts: [{ featureType: ServiceFeatureType.UNKNOWN }],
          mailVerification: defaultMailVerification(),
          mail: 'mail@example.com',
          userKeys: [createUserKey({
            identifier: 'identifier',
            value: 'value',
            tags: ['tag']
          })]
        }
      }))
    ])
  })
})

describe('remoteCredentialsMismatchLocalEpic', () => {
  it('emits credentials mismatch action', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(remoteCredentialsMismatchLocalEpic(action$, state$, {}))
    actionSubject.next(backgroundRemoteAuthnSignal(failure(ServiceLogInResponseError.INVALIDCREDENTIALS)))
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
    authnInput: createPasswordInput(),
    parametrization: 'parametrization',
    authDigest: 'authDigest',
    encryptionKey: 'encryptionKey'
  }
  const userData = {
    userId: 'userId',
    sessionKey: 'sessionKey',
    featurePrompts: <ServiceFeaturePrompt[]>[],
    mailVerification: defaultMailVerification(),
    mail: 'mail@example.com',
    userKeys: <Key[]>[]
  }
  const flowResult = {
    ...params,
    content: either.right(userData)
  }

  ;[
    authnViaApiSignal(success(flowResult)),
    backgroundRemoteAuthnSignal(success(flowResult))
  ].forEach((trigger) => {
    it(`emits the action on ${trigger.type}`, async () => {
      const store: Store<RootState, RootAction> = createStore(reducer)
      const { action$, actionSubject, state$ } = setUpEpicChannels(store)

      const epicTracker = new EpicTracker(remoteAuthnCompleteOnCredentialsEpic(action$, state$, {}))
      actionSubject.next(trigger)
      actionSubject.complete()
      await epicTracker.waitForCompletion()

      expect(await drainEpicActions(epicTracker)).to.deep.equal([
        remoteAuthnComplete({ ...params, ...userData, isOtpEnabled: false, otpToken: null })
      ])
    })
  })
})
