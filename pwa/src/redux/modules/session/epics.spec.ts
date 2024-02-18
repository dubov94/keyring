import { createStore, Store } from '@reduxjs/toolkit'
import { expect } from 'chai'
import { array, function as fn } from 'fp-ts'
import { injected } from '@/redux/actions'
import { LogoutTrigger } from '@/redux/modules/user/account/actions'
import { RootAction } from '@/redux/root_action'
import { reducer, RootState } from '@/redux/root_reducer'
import { drainEpicActions, EpicTracker, setUpEpicChannels } from '@/redux/testing'
import { rehydration } from './actions'
import { displayLogoutTriggerEpic } from './epics'

describe('displayLogoutTriggerEpic', () => {
  it('shows a toast', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(displayLogoutTriggerEpic(action$, state$, {}))
    actionSubject.next(rehydration({
      username: 'username',
      logoutTrigger: LogoutTrigger.BACKGROUND_AUTHN_FAILURE
    }))
    actionSubject.next(injected())
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(fn.pipe(
      await drainEpicActions(epicTracker),
      array.map((action) => action.type))
    ).to.deep.equal(['ui/toast/show'])
  })
})
