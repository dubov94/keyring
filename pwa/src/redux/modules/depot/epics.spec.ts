import { createStore, Store } from '@reduxjs/toolkit'
import { expect } from 'chai'
import { option } from 'fp-ts'
import { mock, instance, when } from 'ts-mockito'
import { container } from 'tsyringe'
import { SodiumClient } from '@/cryptography/sodium_client'
import { Key } from '@/redux/domain'
import { success } from '@/redux/flow_signal'
import { authnViaDepotSignal, remoteAuthnComplete } from '@/redux/modules/authn/actions'
import { MasterKeyChangeData, masterKeyChangeSignal, otpParamsAcceptanceSignal, otpResetSignal } from '@/redux/modules/user/account/actions'
import { emplace, userKeysUpdate } from '@/redux/modules/user/keys/actions'
import { RootAction } from '@/redux/root_action'
import { reducer, RootState } from '@/redux/root_reducer'
import { drainEpicActions, EpicTracker, setUpEpicChannels } from '@/redux/testing'
import { createAuthnViaDepotFlowResult, createDepotActivationData, createRemoteAuthnCompleteResult, createUserKey } from '@/redux/testing/domain'
import { generateDepotKeys, depotActivationData, newEncryptedOtpToken, newVault, rehydration } from './actions'
import { generateDepotKeysEpic, localRehashEpic, masterKeyUpdateEpic, updateEncryptedOtpTokenEpic, updateVaultEpic } from './epics'

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
  const masterKeyChangeData: MasterKeyChangeData = {
    newMasterKey: 'masterKey',
    newParametrization: 'newParametrization',
    newEncryptionKey: 'newEncryptionKey',
    newSessionKey: 'newSessionKey'
  }

  it('activates the depot', async () => {
    const store = createStore(reducer)
    store.dispatch(depotActivationData(createDepotActivationData({})))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(masterKeyUpdateEpic(action$, state$, {}))
    actionSubject.next(masterKeyChangeSignal(success(masterKeyChangeData)))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([generateDepotKeys({
      username: 'username',
      password: 'masterKey'
    })])
  })
})

describe('localRehashEpic', () => {
  it('activates the depot', async () => {
    const store = createStore(reducer)
    store.dispatch(rehydration({
      username: 'username',
      salt: 'salt',
      hash: 'hash',
      vault: 'vault',
      encryptedOtpToken: null
    }))
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
