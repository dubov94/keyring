import { cancel, exception, indicator, success } from '@/redux/flow_signal'
import { RootAction } from '@/redux/root_action'
import { reducer, RootState } from '@/redux/root_reducer'
import { drainEpicActions, EpicTracker, setUpEpicChannels } from '@/redux/testing'
import { createStore, Store } from '@reduxjs/toolkit'
import { expect } from 'chai'
import { deepEqual, instance, mock, when } from 'ts-mockito'
import {
  AccountDeletionFlowIndicator,
  accountDeletionReset,
  accountDeletionSignal,
  acquireMailToken,
  changeMasterKey,
  changeUsername,
  deleteAccount,
  logOut,
  MailTokenAcquisitionFlowIndicator,
  mailTokenAcquisitionReset,
  mailTokenAcquisitionSignal,
  MailTokenReleaseFlowIndicator,
  mailTokenReleaseReset,
  mailTokenReleaseSignal,
  MasterKeyChangeFlowIndicator,
  masterKeyChangeReset,
  masterKeyChangeSignal,
  remoteRehashSignal,
  releaseMailToken,
  remoteCredentialsMismatchLocal,
  UsernameChangeFlowIndicator,
  usernameChangeReset,
  usernameChangeSignal,
  generateOtpParams,
  otpParamsGenerationSignal,
  OtpParamsGenerationFlowIndicator,
  otpParamsAcceptanceSignal,
  otpParamsAcceptanceReset,
  acceptOtpParams,
  OtpParamsAcceptanceFlowIndicator,
  otpResetSignal,
  resetOtp,
  OtpResetFlowIndicator,
  cancelOtpReset,
  localOtpTokenFailure,
  LogoutTrigger,
  ackFeaturePrompt,
  featureAckSignal
} from './actions'
import {
  acquireMailTokenEpic,
  changeUsernameEpic,
  deleteAccountEpic,
  displayAccountDeletionExceptionsEpic,
  displayMailTokenAcquisitionExceptionsEpic,
  displayMailTokenReleaseExceptionsEpic,
  displayUsernameChangeExceptionsEpic,
  logOutOnDeletionSuccessEpic,
  releaseMailTokenEpic,
  changeMasterKeyEpic,
  displayMasterKeyChangeExceptionsEpic,
  remoteRehashEpic,
  otpParamsGenerationEpic,
  otpParamsAcceptanceEpic,
  displayOtpParamsAcceptanceExceptionsEpic,
  displayOtpResetExceptionsEpic,
  otpResetEpic,
  logOutOnBackgroundAuthnFailureEpic,
  ackFeaturePromptEpic
} from './epics'
import {
  AdministrationApi,
  ServiceReleaseMailTokenResponse,
  ServiceReleaseMailTokenResponseError,
  ServiceAcquireMailTokenResponse,
  ServiceAcquireMailTokenResponseError,
  ServiceChangeUsernameResponse,
  ServiceChangeUsernameResponseError,
  ServiceDeleteAccountResponse,
  ServiceDeleteAccountResponseError,
  ServiceChangeMasterKeyResponse,
  ServiceChangeMasterKeyResponseError,
  ServiceGenerateOtpParamsResponse,
  ServiceAcceptOtpParamsResponse,
  ServiceAcceptOtpParamsResponseError,
  ServiceResetOtpResponse,
  ServiceResetOtpResponseError,
  ServiceFeatureType,
  ServiceAckFeaturePromptResponse
} from '@/api/definitions'
import { SESSION_TOKEN_HEADER_NAME } from '@/headers'
import { container } from 'tsyringe'
import { ADMINISTRATION_API_TOKEN } from '@/api/api_di'
import { registrationSignal, remoteAuthnComplete } from '../../authn/actions'
import { showToast } from '../../ui/toast/actions'
import { SodiumClient } from '@/cryptography/sodium_client'
import { emplace } from '../keys/actions'
import { QrcEncoder, QRC_ENCODER_TOKEN } from '@/cryptography/qrc_encoder'
import { option } from 'fp-ts'
import { depotActivationData } from '../../depot/actions'

describe('releaseMailTokenEpic', () => {
  it('emits release sequence', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(registrationSignal(success({
      username: 'username',
      parametrization: 'parametrization',
      encryptionKey: 'encryptionKey',
      sessionKey: 'sessionKey'
    })))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)
    const mockAdministrationApi: AdministrationApi = mock(AdministrationApi)
    when(mockAdministrationApi.releaseMailToken(
      deepEqual({ code: 'code' }),
      deepEqual({ headers: { [SESSION_TOKEN_HEADER_NAME]: 'sessionKey' } })
    )).thenResolve(<ServiceReleaseMailTokenResponse>{
      error: ServiceReleaseMailTokenResponseError.NONE,
      mail: 'mail@example.com'
    })
    container.register<AdministrationApi>(ADMINISTRATION_API_TOKEN, {
      useValue: instance(mockAdministrationApi)
    })

    const epicTracker = new EpicTracker(releaseMailTokenEpic(action$, state$, {}))
    actionSubject.next(releaseMailToken({ code: 'code' }))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      mailTokenReleaseSignal(indicator(MailTokenReleaseFlowIndicator.WORKING)),
      mailTokenReleaseSignal(success('mail@example.com'))
    ])
  })

  it('emits release cancellation', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(releaseMailTokenEpic(action$, state$, {}))
    actionSubject.next(mailTokenReleaseReset())
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      mailTokenReleaseSignal(cancel())
    ])
  })
})

describe('displayMailTokenReleaseExceptionsEpic', () => {
  it('emits toast data', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(displayMailTokenReleaseExceptionsEpic(action$, state$, {}))
    actionSubject.next(mailTokenReleaseSignal(exception('exception')))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      showToast({ message: 'exception' })
    ])
  })
})

describe('acquireMailTokenEpic', () => {
  it('emits acquisition sequence', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(registrationSignal(success({
      username: 'username',
      parametrization: 'parametrization',
      encryptionKey: 'encryptionKey',
      sessionKey: 'sessionKey'
    })))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)
    const mockSodiumClient = mock(SodiumClient)
    when(mockSodiumClient.computeAuthDigestAndEncryptionKey('parametrization', 'password')).thenResolve({
      authDigest: 'authDigest',
      encryptionKey: 'encryptionKey'
    })
    container.register(SodiumClient, {
      useValue: instance(mockSodiumClient)
    })
    const mockAdministrationApi: AdministrationApi = mock(AdministrationApi)
    when(mockAdministrationApi.acquireMailToken(
      deepEqual({ digest: 'authDigest', mail: 'mail@example.com' }),
      deepEqual({ headers: { [SESSION_TOKEN_HEADER_NAME]: 'sessionKey' } })
    )).thenResolve(<ServiceAcquireMailTokenResponse>{
      error: ServiceAcquireMailTokenResponseError.NONE
    })
    container.register<AdministrationApi>(ADMINISTRATION_API_TOKEN, {
      useValue: instance(mockAdministrationApi)
    })

    const epicTracker = new EpicTracker(acquireMailTokenEpic(action$, state$, {}))
    actionSubject.next(acquireMailToken({
      mail: 'mail@example.com',
      password: 'password'
    }))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      mailTokenAcquisitionSignal(indicator(MailTokenAcquisitionFlowIndicator.COMPUTING_MASTER_KEY_DERIVATIVES)),
      mailTokenAcquisitionSignal(indicator(MailTokenAcquisitionFlowIndicator.MAKING_REQUEST)),
      mailTokenAcquisitionSignal(success('mail@example.com'))
    ])
  })

  it('emits acquisition cancellation', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(acquireMailTokenEpic(action$, state$, {}))
    actionSubject.next(mailTokenAcquisitionReset())
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      mailTokenAcquisitionSignal(cancel())
    ])
  })
})

describe('displayMailTokenAcquisitionExceptionsEpic', () => {
  it('emits toast data', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(displayMailTokenAcquisitionExceptionsEpic(action$, state$, {}))
    actionSubject.next(mailTokenAcquisitionSignal(exception('exception')))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      showToast({ message: 'exception' })
    ])
  })
})

describe('changeUsernameEpic', () => {
  it('emits change sequence', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(registrationSignal(success({
      username: 'usernameA',
      parametrization: 'parametrization',
      encryptionKey: 'encryptionKey',
      sessionKey: 'sessionKey'
    })))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)
    const mockSodiumClient = mock(SodiumClient)
    when(mockSodiumClient.computeAuthDigestAndEncryptionKey('parametrization', 'password')).thenResolve({
      authDigest: 'authDigest',
      encryptionKey: 'encryptionKey'
    })
    container.register(SodiumClient, {
      useValue: instance(mockSodiumClient)
    })
    const mockAdministrationApi: AdministrationApi = mock(AdministrationApi)
    when(mockAdministrationApi.changeUsername(
      deepEqual({ digest: 'authDigest', username: 'usernameB' }),
      deepEqual({ headers: { [SESSION_TOKEN_HEADER_NAME]: 'sessionKey' } })
    )).thenResolve(<ServiceChangeUsernameResponse>{
      error: ServiceChangeUsernameResponseError.NONE
    })
    container.register<AdministrationApi>(ADMINISTRATION_API_TOKEN, {
      useValue: instance(mockAdministrationApi)
    })

    const epicTracker = new EpicTracker(changeUsernameEpic(action$, state$, {}))
    actionSubject.next(changeUsername({
      username: 'usernameB',
      password: 'password'
    }))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      usernameChangeSignal(indicator(UsernameChangeFlowIndicator.COMPUTING_MASTER_KEY_DERIVATIVES)),
      usernameChangeSignal(indicator(UsernameChangeFlowIndicator.MAKING_REQUEST)),
      usernameChangeSignal(success({
        before: 'usernameA',
        update: 'usernameB'
      }))
    ])
  })

  it('emits change cancellation', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(changeUsernameEpic(action$, state$, {}))
    actionSubject.next(usernameChangeReset())
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      usernameChangeSignal(cancel())
    ])
  })
})

describe('displayUsernameChangeExceptionsEpic', () => {
  it('emits toast data', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(displayUsernameChangeExceptionsEpic(action$, state$, {}))
    actionSubject.next(usernameChangeSignal(exception('exception')))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      showToast({ message: 'exception' })
    ])
  })
})

describe('deleteAccountEpic', () => {
  it('emits deletion sequence', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(registrationSignal(success({
      username: 'username',
      parametrization: 'parametrization',
      encryptionKey: 'encryptionKey',
      sessionKey: 'sessionKey'
    })))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)
    const mockSodiumClient = mock(SodiumClient)
    when(mockSodiumClient.computeAuthDigestAndEncryptionKey('parametrization', 'password')).thenResolve({
      authDigest: 'authDigest',
      encryptionKey: 'encryptionKey'
    })
    container.register(SodiumClient, {
      useValue: instance(mockSodiumClient)
    })
    const mockAdministrationApi: AdministrationApi = mock(AdministrationApi)
    when(mockAdministrationApi.deleteAccount(
      deepEqual({ digest: 'authDigest' }),
      deepEqual({ headers: { [SESSION_TOKEN_HEADER_NAME]: 'sessionKey' } })
    )).thenResolve(<ServiceDeleteAccountResponse>{
      error: ServiceDeleteAccountResponseError.NONE
    })
    container.register<AdministrationApi>(ADMINISTRATION_API_TOKEN, {
      useValue: instance(mockAdministrationApi)
    })

    const epicTracker = new EpicTracker(deleteAccountEpic(action$, state$, {}))
    actionSubject.next(deleteAccount({
      password: 'password'
    }))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      accountDeletionSignal(indicator(AccountDeletionFlowIndicator.COMPUTING_MASTER_KEY_DERIVATIVES)),
      accountDeletionSignal(indicator(AccountDeletionFlowIndicator.MAKING_REQUEST)),
      accountDeletionSignal(success({}))
    ])
  })

  it('emits deletion cancellation', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(deleteAccountEpic(action$, state$, {}))
    actionSubject.next(accountDeletionReset())
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      accountDeletionSignal(cancel())
    ])
  })
})

describe('displayAccountDeletionExceptionsEpic', () => {
  it('emits toast data', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(displayAccountDeletionExceptionsEpic(action$, state$, {}))
    actionSubject.next(accountDeletionSignal(exception('exception')))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      showToast({ message: 'exception' })
    ])
  })
})

describe('logOutOnDeletionSuccessEpic', () => {
  it('emits `logOut` action', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(logOutOnDeletionSuccessEpic(action$, state$, {}))
    actionSubject.next(accountDeletionSignal(success({})))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      logOut(LogoutTrigger.USER_REQUEST)
    ])
  })
})

describe('logOutOnBackgroundAuthnFailureEpic', () => {
  ;[
    remoteCredentialsMismatchLocal(),
    localOtpTokenFailure()
  ].forEach((trigger) => {
    it(`emits \`logOut\` action on ${trigger.type}`, async () => {
      const store: Store<RootState, RootAction> = createStore(reducer)
      const { action$, actionSubject, state$ } = setUpEpicChannels(store)

      const epicTracker = new EpicTracker(logOutOnBackgroundAuthnFailureEpic(action$, state$, {}))
      actionSubject.next(remoteCredentialsMismatchLocal())
      actionSubject.complete()
      await epicTracker.waitForCompletion()

      expect(await drainEpicActions(epicTracker)).to.deep.equal([
        logOut(LogoutTrigger.BACKGROUND_AUTHN_FAILURE)
      ])
    })
  })
})

describe('changeMasterKeyEpic', () => {
  it('emits change sequence', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(registrationSignal(success({
      username: 'username',
      parametrization: 'parametrization',
      encryptionKey: 'encryptionKey',
      sessionKey: 'sessionKey'
    })))
    store.dispatch(emplace([{
      identifier: 'identifier',
      value: 'value',
      tags: ['tag']
    }]))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)
    const mockSodiumClient = mock(SodiumClient)
    when(mockSodiumClient.computeAuthDigestAndEncryptionKey('parametrization', 'passwordA')).thenResolve({
      authDigest: 'authDigest',
      encryptionKey: 'encryptionKey'
    })
    when(mockSodiumClient.generateNewParametrization()).thenResolve('newParametrization')
    when(mockSodiumClient.computeAuthDigestAndEncryptionKey('newParametrization', 'passwordB')).thenResolve({
      authDigest: 'newAuthDigest',
      encryptionKey: 'newEncryptionKey'
    })
    when(mockSodiumClient.encryptPassword('newEncryptionKey', deepEqual({
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
    when(mockAdministrationApi.changeMasterKey(
      deepEqual({
        currentDigest: 'authDigest',
        renewal: {
          salt: 'newParametrization',
          digest: 'newAuthDigest',
          keys: [{
            identifier: 'identifier',
            password: {
              value: '$value',
              tags: ['$tag']
            }
          }]
        }
      }),
      deepEqual({ headers: { [SESSION_TOKEN_HEADER_NAME]: 'sessionKey' } })
    )).thenResolve(<ServiceChangeMasterKeyResponse>{
      error: ServiceChangeMasterKeyResponseError.NONE,
      sessionKey: 'newSessionKey'
    })
    container.register<AdministrationApi>(ADMINISTRATION_API_TOKEN, {
      useValue: instance(mockAdministrationApi)
    })

    const epicTracker = new EpicTracker(changeMasterKeyEpic(action$, state$, {}))
    actionSubject.next(changeMasterKey({
      current: 'passwordA',
      renewal: 'passwordB'
    }))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      masterKeyChangeSignal(indicator(MasterKeyChangeFlowIndicator.REENCRYPTING)),
      masterKeyChangeSignal(indicator(MasterKeyChangeFlowIndicator.MAKING_REQUEST)),
      masterKeyChangeSignal(success({
        newMasterKey: 'passwordB',
        newParametrization: 'newParametrization',
        newEncryptionKey: 'newEncryptionKey',
        newSessionKey: 'newSessionKey'
      }))
    ])
  })

  it('does not get stuck on an empty set of keys', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(registrationSignal(success({
      username: 'username',
      parametrization: 'parametrization',
      encryptionKey: 'encryptionKey',
      sessionKey: 'sessionKey'
    })))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)
    const mockSodiumClient = mock(SodiumClient)
    when(mockSodiumClient.computeAuthDigestAndEncryptionKey('parametrization', 'passwordA')).thenResolve({
      authDigest: 'authDigest',
      encryptionKey: 'encryptionKey'
    })
    when(mockSodiumClient.generateNewParametrization()).thenResolve('newParametrization')
    when(mockSodiumClient.computeAuthDigestAndEncryptionKey('newParametrization', 'passwordB')).thenResolve({
      authDigest: 'newAuthDigest',
      encryptionKey: 'newEncryptionKey'
    })
    container.register(SodiumClient, {
      useValue: instance(mockSodiumClient)
    })
    const mockAdministrationApi: AdministrationApi = mock(AdministrationApi)
    when(mockAdministrationApi.changeMasterKey(
      deepEqual({
        currentDigest: 'authDigest',
        renewal: {
          salt: 'newParametrization',
          digest: 'newAuthDigest',
          keys: []
        }
      }),
      deepEqual({ headers: { [SESSION_TOKEN_HEADER_NAME]: 'sessionKey' } })
    )).thenResolve(<ServiceChangeMasterKeyResponse>{
      error: ServiceChangeMasterKeyResponseError.NONE,
      sessionKey: 'newSessionKey'
    })
    container.register<AdministrationApi>(ADMINISTRATION_API_TOKEN, {
      useValue: instance(mockAdministrationApi)
    })

    const epicTracker = new EpicTracker(changeMasterKeyEpic(action$, state$, {}))
    actionSubject.next(changeMasterKey({
      current: 'passwordA',
      renewal: 'passwordB'
    }))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      masterKeyChangeSignal(indicator(MasterKeyChangeFlowIndicator.REENCRYPTING)),
      masterKeyChangeSignal(indicator(MasterKeyChangeFlowIndicator.MAKING_REQUEST)),
      masterKeyChangeSignal(success({
        newMasterKey: 'passwordB',
        newParametrization: 'newParametrization',
        newEncryptionKey: 'newEncryptionKey',
        newSessionKey: 'newSessionKey'
      }))
    ])
  })

  it('emits change cancellation', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(changeMasterKeyEpic(action$, state$, {}))
    actionSubject.next(masterKeyChangeReset())
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      masterKeyChangeSignal(cancel())
    ])
  })
})

describe('displayMasterKeyChangeExceptionsEpic', () => {
  it('emits toast data', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(displayMasterKeyChangeExceptionsEpic(action$, state$, {}))
    actionSubject.next(masterKeyChangeSignal(exception('exception')))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      showToast({ message: 'exception' })
    ])
  })
})

describe('remoteRehashEpic', () => {
  it('emits rehash sequence', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(registrationSignal(success({
      username: 'username',
      parametrization: 'parametrization',
      encryptionKey: 'encryptionKey',
      sessionKey: 'sessionKey'
    })))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)
    const mockSodiumClient = mock(SodiumClient)
    when(mockSodiumClient.isParametrizationUpToDate('parametrization')).thenReturn(false)
    when(mockSodiumClient.computeAuthDigestAndEncryptionKey('parametrization', 'password')).thenResolve({
      authDigest: 'authDigest',
      encryptionKey: 'encryptionKey'
    })
    when(mockSodiumClient.generateNewParametrization()).thenResolve('newParametrization')
    when(mockSodiumClient.computeAuthDigestAndEncryptionKey('newParametrization', 'password')).thenResolve({
      authDigest: 'newAuthDigest',
      encryptionKey: 'newEncryptionKey'
    })
    container.register(SodiumClient, {
      useValue: instance(mockSodiumClient)
    })
    const mockAdministrationApi: AdministrationApi = mock(AdministrationApi)
    when(mockAdministrationApi.changeMasterKey(
      deepEqual({
        currentDigest: 'authDigest',
        renewal: {
          salt: 'newParametrization',
          digest: 'newAuthDigest',
          keys: []
        }
      }),
      deepEqual({ headers: { [SESSION_TOKEN_HEADER_NAME]: 'sessionKey' } })
    )).thenResolve(<ServiceChangeMasterKeyResponse>{
      error: ServiceChangeMasterKeyResponseError.NONE,
      sessionKey: 'newSessionKey'
    })
    container.register<AdministrationApi>(ADMINISTRATION_API_TOKEN, {
      useValue: instance(mockAdministrationApi)
    })

    const epicTracker = new EpicTracker(remoteRehashEpic(action$, state$, {}))
    actionSubject.next(remoteAuthnComplete({
      username: 'username',
      password: 'password',
      parametrization: 'parametrization',
      encryptionKey: 'encryptionKey',
      sessionKey: 'sessionKey',
      featurePrompts: [],
      mailVerificationRequired: false,
      mail: 'mail@example.com',
      userKeys: [],
      isOtpEnabled: false,
      otpToken: null
    }))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      remoteRehashSignal(indicator(MasterKeyChangeFlowIndicator.REENCRYPTING)),
      remoteRehashSignal(indicator(MasterKeyChangeFlowIndicator.MAKING_REQUEST)),
      remoteRehashSignal(success({
        newMasterKey: 'password',
        newParametrization: 'newParametrization',
        newEncryptionKey: 'newEncryptionKey',
        newSessionKey: 'newSessionKey'
      }))
    ])
  })
})

describe('otpParamsGenerationEpic', () => {
  it('emits generation sequence', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(registrationSignal(success({
      username: 'username',
      parametrization: 'parametrization',
      encryptionKey: 'encryptionKey',
      sessionKey: 'sessionKey'
    })))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)
    const mockAdministrationApi: AdministrationApi = mock(AdministrationApi)
    when(mockAdministrationApi.generateOtpParams(deepEqual({}), deepEqual({
      headers: { [SESSION_TOKEN_HEADER_NAME]: 'sessionKey' }
    }))).thenResolve(<ServiceGenerateOtpParamsResponse>{
      otpParamsId: 'id',
      sharedSecret: 'secret',
      scratchCodes: ['a', 'b', 'c'],
      keyUri: 'uri'
    })
    container.register<AdministrationApi>(ADMINISTRATION_API_TOKEN, {
      useValue: instance(mockAdministrationApi)
    })
    const mockQrcEncoder: QrcEncoder = mock<QrcEncoder>()
    when(mockQrcEncoder.encode('uri')).thenResolve('qrc')
    container.register<QrcEncoder>(QRC_ENCODER_TOKEN, {
      useValue: instance(mockQrcEncoder)
    })

    const epicTracker = new EpicTracker(otpParamsGenerationEpic(action$, state$, {}))
    actionSubject.next(generateOtpParams())
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      otpParamsGenerationSignal(indicator(OtpParamsGenerationFlowIndicator.MAKING_REQUEST)),
      otpParamsGenerationSignal(success({
        otpParamsId: 'id',
        sharedSecret: 'secret',
        scratchCodes: ['a', 'b', 'c'],
        keyUri: 'uri',
        qrcDataUrl: 'qrc'
      }))
    ])
  })
})

describe('otpParamsAcceptanceEpic', () => {
  it('emits acceptance sequence', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(registrationSignal(success({
      username: 'user',
      parametrization: 'parametrization',
      sessionKey: 'sessionKey',
      encryptionKey: 'encryptionKey'
    })))
    store.dispatch(depotActivationData({
      username: 'user',
      salt: 'salt',
      hash: 'hash',
      depotKey: 'depotKey'
    }))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)
    const mockAdministrationApi: AdministrationApi = mock(AdministrationApi)
    when(mockAdministrationApi.acceptOtpParams(deepEqual({
      otpParamsId: 'id',
      otp: 'otp',
      yieldTrustedToken: true
    }), deepEqual({
      headers: { [SESSION_TOKEN_HEADER_NAME]: 'sessionKey' }
    }))).thenResolve(<ServiceAcceptOtpParamsResponse>{
      error: ServiceAcceptOtpParamsResponseError.NONE,
      trustedToken: 'token'
    })
    container.register<AdministrationApi>(ADMINISTRATION_API_TOKEN, {
      useValue: instance(mockAdministrationApi)
    })

    const epicTracker = new EpicTracker(otpParamsAcceptanceEpic(action$, state$, {}))
    actionSubject.next(acceptOtpParams({
      otpParamsId: 'id',
      otp: 'otp'
    }))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      otpParamsAcceptanceSignal(indicator(OtpParamsAcceptanceFlowIndicator.MAKING_REQUEST)),
      otpParamsAcceptanceSignal(success(option.of('token')))
    ])
  })

  it('emits acceptance cancellation', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(otpParamsAcceptanceEpic(action$, state$, {}))
    actionSubject.next(otpParamsAcceptanceReset())
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      otpParamsAcceptanceSignal(cancel())
    ])
  })
})

describe('displayOtpParamsAcceptanceExceptionsEpic', () => {
  it('emits toast data', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(displayOtpParamsAcceptanceExceptionsEpic(action$, state$, {}))
    actionSubject.next(otpParamsAcceptanceSignal(exception('exception')))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      showToast({ message: 'exception' })
    ])
  })
})

describe('otpResetEpic', () => {
  it('emits reset sequence', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(registrationSignal(success({
      username: 'user',
      parametrization: 'parametrization',
      sessionKey: 'sessionKey',
      encryptionKey: 'encryptionKey'
    })))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)
    const mockAdministrationApi: AdministrationApi = mock(AdministrationApi)
    when(mockAdministrationApi.resetOtp(
      deepEqual({ otp: 'otp' }),
      deepEqual({ headers: { [SESSION_TOKEN_HEADER_NAME]: 'sessionKey' } })
    )).thenResolve(<ServiceResetOtpResponse>{
      error: ServiceResetOtpResponseError.NONE
    })
    container.register<AdministrationApi>(ADMINISTRATION_API_TOKEN, {
      useValue: instance(mockAdministrationApi)
    })

    const epicTracker = new EpicTracker(otpResetEpic(action$, state$, {}))
    actionSubject.next(resetOtp({ otp: 'otp' }))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      otpResetSignal(indicator(OtpResetFlowIndicator.MAKING_REQUEST)),
      otpResetSignal(success({}))
    ])
  })

  it('emits reset cancellation', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(otpResetEpic(action$, state$, {}))
    actionSubject.next(cancelOtpReset())
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      otpResetSignal(cancel())
    ])
  })
})

describe('displayOtpResetExceptionsEpic', () => {
  it('emits toast data', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(displayOtpResetExceptionsEpic(action$, state$, {}))
    actionSubject.next(otpResetSignal(exception('exception')))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      showToast({ message: 'exception' })
    ])
  })
})

describe('ackFeaturePromptEpic', () => {
  it('emits acknowledgement sequence', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(registrationSignal(success({
      username: 'user',
      parametrization: 'parametrization',
      sessionKey: 'sessionKey',
      encryptionKey: 'encryptionKey'
    })))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)
    const mockAdministrationApi: AdministrationApi = mock(AdministrationApi)
    when(mockAdministrationApi.ackFeaturePrompt(
      deepEqual({ featureType: ServiceFeatureType.UNKNOWN }),
      deepEqual({ headers: { [SESSION_TOKEN_HEADER_NAME]: 'sessionKey' } })
    )).thenResolve(<ServiceAckFeaturePromptResponse>{})
    container.register<AdministrationApi>(ADMINISTRATION_API_TOKEN, {
      useValue: instance(mockAdministrationApi)
    })

    const epicTracker = new EpicTracker(ackFeaturePromptEpic(action$, state$, {}))
    actionSubject.next(ackFeaturePrompt(ServiceFeatureType.UNKNOWN))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      featureAckSignal(success(ServiceFeatureType.UNKNOWN))
    ])
  })
})
