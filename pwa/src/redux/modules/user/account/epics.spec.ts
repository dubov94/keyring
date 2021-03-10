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
  rehashSignal,
  releaseMailToken,
  remoteCredentialsMismatchLocal,
  UsernameChangeFlowIndicator,
  usernameChangeReset,
  usernameChangeSignal
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
  logOutOnCredentialsMismatchEpic,
  releaseMailTokenEpic,
  changeMasterKeyEpic,
  displayMasterKeyChangeExceptionsEpic,
  rehashEpic
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
  ServiceChangeMasterKeyResponseError
} from '@/api/definitions'
import { SESSION_TOKEN_HEADER_NAME } from '@/headers'
import { container } from 'tsyringe'
import { ADMINISTRATION_API_TOKEN } from '@/api/api_di'
import { authnViaApiSignal, registrationSignal } from '../../authn/actions'
import { showToast } from '../../ui/toast/actions'
import { SodiumClient } from '@/cryptography/sodium_client'
import { emplace } from '../keys/actions'

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
      error: ServiceReleaseMailTokenResponseError.NONE
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
      mailTokenReleaseSignal(success({}))
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

    expect(await drainEpicActions(epicTracker)).to.deep.equal([logOut()])
  })
})

describe('logOutOnCredentialsMismatchEpic', () => {
  it('emits `logOut` action', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(logOutOnCredentialsMismatchEpic(action$, state$, {}))
    actionSubject.next(remoteCredentialsMismatchLocal())
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([logOut()])
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

describe('rehashEpic', () => {
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

    const epicTracker = new EpicTracker(rehashEpic(action$, state$, {}))
    actionSubject.next(authnViaApiSignal(success({
      username: 'username',
      password: 'password',
      parametrization: 'parametrization',
      encryptionKey: 'encryptionKey',
      sessionKey: 'sessionKey',
      requiresMailVerification: false,
      userKeys: []
    })))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      rehashSignal(indicator(MasterKeyChangeFlowIndicator.REENCRYPTING)),
      rehashSignal(indicator(MasterKeyChangeFlowIndicator.MAKING_REQUEST)),
      rehashSignal(success({
        newMasterKey: 'password',
        newParametrization: 'newParametrization',
        newEncryptionKey: 'newEncryptionKey',
        newSessionKey: 'newSessionKey'
      }))
    ])
  })
})
