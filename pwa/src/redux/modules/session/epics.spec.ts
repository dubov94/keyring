import { injectionsSetUp } from '@/redux/actions'
import { RootAction } from '@/redux/root_action'
import { reducer, RootState } from '@/redux/root_reducer'
import { drainEpicActions, EpicTracker, setUpEpicChannels } from '@/redux/testing'
import { createStore, Store } from '@reduxjs/toolkit'
import { expect } from 'chai'
import { LogoutTrigger } from '../user/account/actions'
import { rehydrateSession } from './actions'
import { displayLogoutTriggerEpic } from './epics'
import { array, function as fn } from 'fp-ts'

describe('displayLogoutTriggerEpic', () => {
  it('shows a toast', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(displayLogoutTriggerEpic(action$, state$, {}))
    actionSubject.next(rehydrateSession({
      username: 'username',
      logoutTrigger: LogoutTrigger.BACKGROUND_AUTHN_FAILURE
    }))
    actionSubject.next(injectionsSetUp())
    actionSubject.complete()
    await epicTracker.waitForCompletion()
    injectionsSetUp().type

    expect(fn.pipe(
      await drainEpicActions(epicTracker),
      array.map((action) => action.type))
    ).to.deep.equal(['ui/toast/show'])
  })
})
