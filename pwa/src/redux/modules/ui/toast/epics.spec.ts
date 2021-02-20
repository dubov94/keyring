import { RootAction } from '@/redux/root_action'
import { reducer, RootState } from '@/redux/root_reducer'
import { EpicTracker, setUpEpicChannels } from '@/redux/testing'
import { createStore, Store } from '@reduxjs/toolkit'
import { expect } from 'chai'
import { instance, mock, verify, when } from 'ts-mockito'
import { hideToast, showToast, toastReadyToBeShown } from './actions'
import { showToastEpic } from './epics'
import Vue, { VueConstructor } from 'vue'
import { container } from 'tsyringe'
import { VUE_CONSTRUCTOR_TOKEN } from '@/vue_di'

describe('showToastEpic', () => {
  it('emits `hide` then `ready`', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)
    const mockVueConstructor = mock<VueConstructor>(Vue)
    when(mockVueConstructor.nextTick()).thenResolve()
    container.register<VueConstructor>(VUE_CONSTRUCTOR_TOKEN, {
      useValue: instance(mockVueConstructor)
    })

    const epicTracker = new EpicTracker(showToastEpic(action$, state$, {}))
    actionSubject.next(showToast({
      message: 'message',
      timeout: 1000
    }))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    verify(mockVueConstructor.nextTick()).once()
    expect(epicTracker.getActions()).to.deep.equal([
      hideToast(),
      toastReadyToBeShown({
        message: 'message',
        timeout: 1000
      })
    ])
  })
})
