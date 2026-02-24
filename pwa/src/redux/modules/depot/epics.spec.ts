import { createStore, Store } from '@reduxjs/toolkit'
import { expect } from 'chai'
import { option } from 'fp-ts'
import { mock, instance, when } from 'ts-mockito'
import { container } from 'tsyringe'
import { SodiumClient } from '@/cryptography/sodium_client'
import { UID_SERVICE_TOKEN, UidService } from '@/cryptography/uid_service'
import { WEB_AUTHN_TOKEN, WebAuthnService } from '@/cryptography/web_authn'
import { Key } from '@/redux/domain'
import { exception, indicator, success } from '@/redux/flow_signal'
import { authnViaDepotSignal, registrationSignal, remoteAuthnComplete } from '@/redux/modules/authn/actions'
import { showToast } from '@/redux/modules/ui/toast/actions'
import { masterKeyChangeSignal, otpParamsAcceptanceSignal, otpResetSignal, remoteRehashSignal } from '@/redux/modules/user/account/actions'
import { emplace, userKeysUpdate } from '@/redux/modules/user/keys/actions'
import { RootAction } from '@/redux/root_action'
import { reducer, RootState } from '@/redux/root_reducer'
import { drainEpicActions, EpicTracker, setUpEpicChannels } from '@/redux/testing'
import { FakeWebAuthn, SequentialFakeUidService } from '@/redux/testing/services'
import {
  createAuthnViaDepotFlowResult,
  createDepotActivationData,
  createDepotRehydration,
  createMasterKeyChangeData,
  createMasterKeyDerivatives,
  createRegistrationFlowResult,
  createRemoteAuthnCompleteResult,
  createUserKey,
  createWebAuthnResult
} from '@/redux/testing/domain'
import {
  generateDepotKeys,
  depotActivationData,
  newEncryptedOtpToken,
  newVault,
  rehydration,
  webAuthnSignal,
  webAuthnResult,
  newWebAuthnLocalDerivatives,
  newWebAuthnRemoteDerivatives,
  webAuthnRequest,
  toggleWebAuthn,
  WebAuthnFlowIndicator
} from './actions'
import {
  displayWebAuthnExceptionsEpic,
  generateDepotKeysEpic,
  localRehashEpic,
  masterKeyUpdateEpic,
  updateEncryptedOtpTokenEpic,
  updateVaultEpic,
  webAuthnCreationEpic,
  webAuthnLocalDerivativesEpic,
  webAuthnRemoteDerivativesEpic,
  webAuthnRetrievalEpic
} from './epics'

describe('updateVaultEpic', () => {
  const depotActivationDataAction = depotActivationData(createDepotActivationData({}))
  const userKeys: Key[] = [
    createUserKey({
      identifier: '1',
      attrs: { isShadow: true }
    }),
    createUserKey({
      identifier: '2',
      value: 'value'
    })
  ]

  beforeEach(() => {
    container.register<UidService>(UID_SERVICE_TOKEN, {
      useValue: new SequentialFakeUidService()
    })
  })

  ;[
    depotActivationDataAction,
    userKeysUpdate(userKeys)
  ].forEach((trigger) => {
    it(`emits a new vault on ${trigger.type}`, async () => {
      const store: Store<RootState, RootAction> = createStore(reducer)
      store.dispatch(depotActivationDataAction)
      store.dispatch(emplace(userKeys))
      const { action$, actionSubject, state$ } = setUpEpicChannels(store)
      const mockSodiumClient = mock(SodiumClient)
      when(mockSodiumClient.encryptString(
        'depotKey', JSON.stringify([userKeys[1]]))).thenResolve('vault')
      container.register(SodiumClient, {
        useValue: instance(mockSodiumClient)
      })

      const epicTracker = new EpicTracker(updateVaultEpic(action$, state$, {}))
      actionSubject.next(trigger)
      actionSubject.complete()
      await epicTracker.waitForCompletion()

      expect(await drainEpicActions(epicTracker)).to.deep.equal([newVault('vault')])
    })
  })
})

describe('updateEncryptedOtpTokenEpic', () => {
  const depotActivationDataAction = depotActivationData(createDepotActivationData({}))
  const remoteAuthnCompleteAction = remoteAuthnComplete(createRemoteAuthnCompleteResult({
    isOtpEnabled: true,
    otpToken: 'otpToken'
  }))

  ;[
    depotActivationDataAction,
    remoteAuthnCompleteAction,
    otpParamsAcceptanceSignal(success(option.of('otpToken')))
  ].forEach((trigger) => {
    it(`emits a new encrypted OTP token on ${trigger.type}`, async () => {
      const store: Store<RootState, RootAction> = createStore(reducer)
      store.dispatch(depotActivationDataAction)
      store.dispatch(remoteAuthnCompleteAction)
      const { action$, actionSubject, state$ } = setUpEpicChannels(store)
      const mockSodiumClient = mock(SodiumClient)
      when(mockSodiumClient.encryptString('depotKey', 'otpToken')).thenResolve('encryptedOtpToken')
      container.register(SodiumClient, {
        useValue: instance(mockSodiumClient)
      })

      const epicTracker = new EpicTracker(updateEncryptedOtpTokenEpic(action$, state$, {}))
      actionSubject.next(trigger)
      actionSubject.complete()
      await epicTracker.waitForCompletion()

      expect(await drainEpicActions(epicTracker)).to.deep.equal([newEncryptedOtpToken('encryptedOtpToken')])
    })
  })

  it('emits `null` on OTP reset', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(depotActivationDataAction)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(updateEncryptedOtpTokenEpic(action$, state$, {}))
    actionSubject.next(otpResetSignal(success({})))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([newEncryptedOtpToken(null)])
  })
})

describe('generateDepotKeysEpic', () => {
  it('emits activation data', async () => {
    const { action$, actionSubject, state$ } = setUpEpicChannels(createStore(reducer))
    const mockSodiumClient = mock(SodiumClient)
    when(mockSodiumClient.generateNewParametrization()).thenResolve('parametrization')
    when(mockSodiumClient.computeAuthDigestAndEncryptionKey('parametrization', 'password')).thenResolve({
      authDigest: 'authDigest',
      encryptionKey: 'depotKey'
    })
    container.register(SodiumClient, {
      useValue: instance(mockSodiumClient)
    })

    const epicTracker = new EpicTracker(generateDepotKeysEpic(action$, state$, {}))
    actionSubject.next(generateDepotKeys({
      username: 'username',
      password: 'password'
    }))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([depotActivationData({
      username: 'username',
      salt: 'parametrization',
      hash: 'authDigest',
      depotKey: 'depotKey'
    })])
  })
})

describe('masterKeyUpdateEpic', () => {
  it('activates the depot', async () => {
    const store = createStore(reducer)
    store.dispatch(depotActivationData(createDepotActivationData({})))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(masterKeyUpdateEpic(action$, state$, {}))
    actionSubject.next(masterKeyChangeSignal(success(createMasterKeyChangeData({}))))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([generateDepotKeys({
      username: 'username',
      password: 'newMasterKey'
    })])
  })
})

describe('localRehashEpic', () => {
  it('activates the depot', async () => {
    const store = createStore(reducer)
    store.dispatch(rehydration(createDepotRehydration({})))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)
    const mockSodiumClient = mock(SodiumClient)
    when(mockSodiumClient.isParametrizationUpToDate('salt')).thenReturn(false)
    container.register(SodiumClient, {
      useValue: instance(mockSodiumClient)
    })

    const epicTracker = new EpicTracker(localRehashEpic(action$, state$, {}))
    actionSubject.next(authnViaDepotSignal(success(createAuthnViaDepotFlowResult({}))))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      generateDepotKeys({
        username: 'username',
        password: 'password'
      })
    ])
  })
})

describe('webAuthnCreationEpic', () => {
  it('creates and emits a new credential', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(remoteAuthnComplete(createRemoteAuthnCompleteResult({})))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)
    container.register<WebAuthnService>(WEB_AUTHN_TOKEN, {
      useValue: new FakeWebAuthn()
    })

    const epicTracker = new EpicTracker(webAuthnCreationEpic(action$, state$, {}))
    actionSubject.next(toggleWebAuthn(true))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      webAuthnSignal(indicator(WebAuthnFlowIndicator.WORKING)),
      webAuthnSignal(success({ credentialId: 'credential-1', salt: 'salt' })),
      webAuthnResult({ result: 'credential-1-salt-result' })
    ])
  })
})

describe('displayWebAuthnExceptionsEpic', () => {
  it('emits toast data', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(displayWebAuthnExceptionsEpic(action$, state$, {}))
    actionSubject.next(webAuthnSignal(exception('exception')))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      showToast({ message: 'exception' })
    ])
  })
})

describe('webAuthnRetrievalEpic', () => {
  it('emits WebAuthn result', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const fakeWebAuthn = new FakeWebAuthn()
    const credential = await fakeWebAuthn.createCredential('userId', 'John Doe')
    store.dispatch(webAuthnSignal(success({
      credentialId: credential.credentialId,
      salt: credential.prfFirstSalt
    })))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)
    container.register<WebAuthnService>(WEB_AUTHN_TOKEN, {
      useValue: fakeWebAuthn
    })

    const epicTracker = new EpicTracker(webAuthnRetrievalEpic(action$, state$, {}))
    actionSubject.next(webAuthnRequest({ credentialId: credential.credentialId }))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      webAuthnResult({ result: credential.prfFirstResult })
    ])
  })

  it('rejects on credential ID mismatch', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const fakeWebAuthn = new FakeWebAuthn()
    const credential = await fakeWebAuthn.createCredential('userId', 'John Doe')
    store.dispatch(webAuthnSignal(success({
      credentialId: credential.credentialId,
      salt: credential.prfFirstSalt
    })))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)
    container.register<WebAuthnService>(WEB_AUTHN_TOKEN, {
      useValue: fakeWebAuthn
    })

    const epicTracker = new EpicTracker(webAuthnRetrievalEpic(action$, state$, {}))
    actionSubject.next(webAuthnRequest({ credentialId: 'random' }))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      showToast({ message: 'WebAuthn `credentialId` mismatch' })
    ])
  })
})

describe('webAuthnLocalDerivativesEpic', () => {
  ;[
    webAuthnResult(createWebAuthnResult({})),
    depotActivationData(createDepotActivationData({}))
  ].forEach((trigger) => {
    it('emits new encrypted derivatives', async () => {
      const store: Store<RootState, RootAction> = createStore(reducer)
      store.dispatch(depotActivationData(createDepotActivationData({})))
      store.dispatch(webAuthnResult(createWebAuthnResult({})))
      const { action$, actionSubject, state$ } = setUpEpicChannels(store)
      const mockSodiumClient = mock(SodiumClient)
      when(mockSodiumClient.encryptString(
        'webAuthnResult',
        JSON.stringify(createMasterKeyDerivatives({
          authDigest: 'hash',
          encryptionKey: 'depotKey'
        }))
      )).thenResolve('newWebAuthnLocalDerivatives')
      container.register(SodiumClient, {
        useValue: instance(mockSodiumClient)
      })

      const epicTracker = new EpicTracker(webAuthnLocalDerivativesEpic(action$, state$, {}))
      actionSubject.next(trigger)
      actionSubject.complete()
      await epicTracker.waitForCompletion()

      expect(await drainEpicActions(epicTracker)).to.deep.equal([
        newWebAuthnLocalDerivatives('newWebAuthnLocalDerivatives')
      ])
    })
  })
})

describe('webAuthnRemoteDerivativesEpic', () => {
  ;[
    webAuthnResult(createWebAuthnResult({})),
    registrationSignal(success(createRegistrationFlowResult({}))),
    remoteAuthnComplete(createRemoteAuthnCompleteResult({})),
    remoteRehashSignal(success(createMasterKeyChangeData({}))),
    masterKeyChangeSignal(success(createMasterKeyChangeData({})))
  ].forEach((trigger) => {
    it(`emits new encrypted derivatives on ${trigger.type}`, async () => {
      const store: Store<RootState, RootAction> = createStore(reducer)
      store.dispatch(remoteAuthnComplete(createRemoteAuthnCompleteResult({})))
      store.dispatch(webAuthnResult(createWebAuthnResult({})))
      const { action$, actionSubject, state$ } = setUpEpicChannels(store)
      const mockSodiumClient = mock(SodiumClient)
      when(mockSodiumClient.encryptString(
        'webAuthnResult',
        JSON.stringify(createMasterKeyDerivatives(createMasterKeyDerivatives({})))
      )).thenResolve('newWebAuthnRemoteDerivatives')
      container.register(SodiumClient, {
        useValue: instance(mockSodiumClient)
      })

      const epicTracker = new EpicTracker(webAuthnRemoteDerivativesEpic(action$, state$, {}))
      actionSubject.next(trigger)
      actionSubject.complete()
      await epicTracker.waitForCompletion()

      expect(await drainEpicActions(epicTracker)).to.deep.equal([
        newWebAuthnRemoteDerivatives('newWebAuthnRemoteDerivatives')
      ])
    })
  })
})
