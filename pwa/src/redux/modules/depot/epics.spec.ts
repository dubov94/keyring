import { Key } from '@/redux/entities'
import { container } from 'tsyringe'
import { emplace, userKeysUpdate } from '../user/keys/actions'
import { mock, instance, when } from 'ts-mockito'
import { SodiumClient } from '@/cryptography/sodium_client'
import { activateDepotEpic, localRehashEpic, masterKeyUpdateEpic, updateVaultEpic } from './epics'
import { activateDepot, depotActivationData, newVault, rehydrateDepot } from './actions'
import { RootAction } from '@/redux/root_action'
import { expect } from 'chai'
import { drainEpicActions, EpicTracker, setUpEpicChannels } from '@/redux/testing'
import { createStore, Store } from '@reduxjs/toolkit'
import { reducer, RootState } from '@/redux/root_reducer'
import { MasterKeyChangeData, masterKeyChangeSignal } from '../user/account/actions'
import { success } from '@/redux/flow_signal'
import { authnViaDepotSignal } from '../authn/actions'

describe('updateVaultEpic', () => {
  ;[
    depotActivationData({ username: 'username', salt: 'salt', hash: 'hash', vaultKey: 'vaultKey' }),
    userKeysUpdate([{ identifier: '0', value: 'value', tags: [] }])
  ].forEach((trigger) => {
    it(`emits a new vault on ${trigger.type}`, async () => {
      const userKeys: Key[] = [{
        identifier: '0',
        value: 'value',
        tags: []
      }]
      const store: Store<RootState, RootAction> = createStore(reducer)
      store.dispatch(depotActivationData({
        username: 'username',
        salt: 'salt',
        hash: 'hash',
        vaultKey: 'vaultKey'
      }))
      store.dispatch(emplace(userKeys))
      const { action$, actionSubject, state$ } = setUpEpicChannels(store)
      const mockSodiumClient = mock(SodiumClient)
      when(mockSodiumClient.encryptMessage(
        'vaultKey', JSON.stringify(userKeys))).thenResolve('vault')
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

describe('activateDepotEpic', () => {
  it('emits activation data', async () => {
    const { action$, actionSubject, state$ } = setUpEpicChannels(createStore(reducer))
    const mockSodiumClient = mock(SodiumClient)
    when(mockSodiumClient.generateNewParametrization()).thenResolve('parametrization')
    when(mockSodiumClient.computeAuthDigestAndEncryptionKey('parametrization', 'password')).thenResolve({
      authDigest: 'authDigest',
      encryptionKey: 'vaultKey'
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
      vaultKey: 'vaultKey'
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
      vaultKey: 'vaultKey'
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
      vault: 'vault'
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
      vaultKey: 'vaultKey'
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
