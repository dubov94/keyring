import { Key } from '@/redux/entities'
import { container } from 'tsyringe'
import { emplace, userKeysUpdate } from '../user/keys/actions'
import { mock, instance, when } from 'ts-mockito'
import { SodiumClient } from '@/cryptography/sodium_client'
import { activateDepotEpic, localRehashEpic, masterKeyUpdateEpic, updateEncryptedOtpTokenEpic, updateVaultEpic } from './epics'
import { activateDepot, depotActivationData, newEncryptedOtpToken, newVault, rehydrateDepot } from './actions'
import { RootAction } from '@/redux/root_action'
import { expect } from 'chai'
import { drainEpicActions, EpicTracker, setUpEpicChannels } from '@/redux/testing'
import { createStore, Store } from '@reduxjs/toolkit'
import { reducer, RootState } from '@/redux/root_reducer'
import { MasterKeyChangeData, masterKeyChangeSignal } from '../user/account/actions'
import { success } from '@/redux/flow_signal'
import { authnViaDepotSignal, remoteAuthnComplete } from '../authn/actions'

describe('updateVaultEpic', () => {
  const depotActivationDataAction = depotActivationData({
    username: 'username',
    salt: 'salt',
    hash: 'hash',
    depotKey: 'depotKey'
  })
  const userKeys: Key[] = [{
    identifier: '0',
    value: 'value',
    tags: []
  }]

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
      when(mockSodiumClient.encryptMessage(
        'depotKey', JSON.stringify(userKeys))).thenResolve('vault')
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
  const depotActivationDataAction = depotActivationData({
    username: 'username',
    salt: 'salt',
    hash: 'hash',
    depotKey: 'depotKey'
  })
  const remoteASuthnCompleteAction = remoteAuthnComplete({
    username: 'username',
    password: 'password',
    parametrization: 'parametreization',
    encryptionKey: 'encryptionKey',
    sessionKey: 'sessionKey',
    mailVerificationRequired: false,
    mail: 'mail@example.com',
    userKeys: [],
    isOtpEnabled: true,
    otpToken: 'otpToken'
  })

  ;[
    depotActivationDataAction,
    remoteASuthnCompleteAction
  ].forEach((trigger) => {
    it(`emits a new encrypted OTP token on ${trigger.type}`, async () => {
      const store: Store<RootState, RootAction> = createStore(reducer)
      store.dispatch(depotActivationDataAction)
      store.dispatch(remoteASuthnCompleteAction)
      const { action$, actionSubject, state$ } = setUpEpicChannels(store)
      const mockSodiumClient = mock(SodiumClient)
      when(mockSodiumClient.encryptMessage('depotKey', 'otpToken')).thenResolve('encryptedOtpToken')
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
})

describe('activateDepotEpic', () => {
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

    const epicTracker = new EpicTracker(activateDepotEpic(action$, state$, {}))
    actionSubject.next(activateDepot({
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
    store.dispatch(depotActivationData({
      username: 'username',
      salt: 'salt',
      hash: 'hash',
      depotKey: 'depotKey'
    }))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(masterKeyUpdateEpic(action$, state$, {}))
    actionSubject.next(masterKeyChangeSignal(success(masterKeyChangeData)))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([activateDepot({
      username: 'username',
      password: 'masterKey'
    })])
  })
})

describe('localRehashEpic', () => {
  it('activates the depot', async () => {
    const store = createStore(reducer)
    store.dispatch(rehydrateDepot({
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
    actionSubject.next(authnViaDepotSignal(success({
      username: 'username',
      password: 'password',
      userKeys: [],
      depotKey: 'depotKey'
    })))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      activateDepot({
        username: 'username',
        password: 'password'
      })
    ])
  })
})
