import { Key } from '@/redux/entities'
import { reducer, RootState } from '@/redux/root_reducer'
import { container } from 'tsyringe'
import { emplace } from '../user/keys/actions'
import { mock, instance, when } from 'ts-mockito'
import { SodiumClient } from '@/sodium_client'
import { ActionsObservable, StateObservable } from 'redux-observable'
import { updateVaultEpic } from './epics'
import { Subject } from 'rxjs'
import { depotActivationData, newVault } from './actions'
import { RootAction } from '@/redux/root_action'
import { function as fn, array } from 'fp-ts'
import { expect } from 'chai'

describe('updateVaultEpic', () => {
  it('emits a new vault', (done) => {
    const userKeys: Key[] = [{
      identifier: '0',
      value: 'value',
      tags: []
    }]
    const actionSubject = new Subject<RootAction>()
    const action$ = new ActionsObservable(actionSubject)
    const stateSubject = new Subject<RootState>()
    const state$ = new StateObservable(stateSubject, fn.pipe(
      [
        depotActivationData({
          username: 'username',
          salt: 'salt',
          hash: 'hash',
          vaultKey: 'vaultKey'
        }),
        emplace(userKeys)
      ],
      array.reduce<RootAction, RootState | undefined>(
        undefined, (state, action) => reducer(state, action))
    )!)
    const mockSodiumClient = mock(SodiumClient)
    container.register<SodiumClient>(SodiumClient, {
      useValue: instance(mockSodiumClient)
    })
    when(mockSodiumClient.encryptMessage(
      'vaultKey', JSON.stringify(userKeys))).thenReturn(Promise.resolve('vault'))

    const output: RootAction[] = []
    updateVaultEpic(action$, state$, {}).subscribe({
      next: (action) => output.push(action),
      complete: () => {
        expect(output).to.deep.equal([
          newVault('vault')
        ])
        done()
      }
    })
    actionSubject.next(emplace(userKeys))
    actionSubject.complete()
  })
})
