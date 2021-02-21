import { Key } from '@/redux/entities'
import { container } from 'tsyringe'
import { creationSignal, deletionSignal, emplace, updationSignal } from '../user/keys/actions'
import { mock, instance, when } from 'ts-mockito'
import { SodiumClient } from '@/sodium_client'
import { activateDepotEpic, changeMasterKeyEpic, updateVaultEpic } from './epics'
import { activateDepot, depotActivationData, newVault } from './actions'
import { RootAction } from '@/redux/root_action'
import { expect } from 'chai'
import { EpicTracker, setUpEpicChannels } from '@/redux/testing'
import { createStore, Store } from '@reduxjs/toolkit'
import { reducer, RootState } from '@/redux/root_reducer'
import { masterKeyChangeSignal } from '../user/account/actions'
import { success } from '@/redux/flow_signal'

describe('updateVaultEpic', () => {
  ;[
    depotActivationData({ username: 'username', salt: 'salt', hash: 'hash', vaultKey: 'vaultKey' }),
    emplace([{ identifier: '0', value: 'value', tags: [] }]),
    creationSignal(success({ identifier: '0', value: 'value', tags: [] })),
    updationSignal(success({ identifier: '0', value: 'value', tags: [] })),
    deletionSignal(success('2'))
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
      actionSubject.next(emplace(userKeys))
      actionSubject.complete()
      await epicTracker.waitForCompletion()

      expect(epicTracker.getActions()).to.deep.equal([newVault('vault')])
    })
  })
})

describe('activateDepotEpic', () => {
  it('emits activation data', async () => {
    const { action$, actionSubject, state$ } = setUpEpicChannels(createStore(reducer))
    const mockSodiumClient = mock(SodiumClient)
    when(mockSodiumClient.generateArgon2Parametrization()).thenResolve('parametrization')
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

    expect(epicTracker.getActions()).to.deep.equal([depotActivationData({
      username: 'username',
      salt: 'parametrization',
      hash: 'authDigest',
      vaultKey: 'vaultKey'
    })])
  })
})

describe('changeMasterKeyEpic', () => {
  it('activates the depot', async () => {
    const store = createStore(reducer)
    store.dispatch(depotActivationData({
      username: 'username',
      salt: 'salt',
      hash: 'hash',
      vaultKey: 'vaultKey'
    }))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(changeMasterKeyEpic(action$, state$, {}))
    actionSubject.next(masterKeyChangeSignal(success({
      newMasterKey: 'newMasterKey',
      newParametrization: 'newParametrization',
      newEncryptionKey: 'newEncryptionKey',
      newSessionKey: 'newSessionKey'
    })))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(epicTracker.getActions()).to.deep.equal([activateDepot({
      username: 'username',
      password: 'newMasterKey'
    })])
  })
})
