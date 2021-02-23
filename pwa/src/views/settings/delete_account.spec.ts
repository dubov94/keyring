import { mount } from '@vue/test-utils'
import DeleteAccount from './DeleteAccount.vue'
import { ActionQueue, setUpLocalVue, setUpStandardMocks } from '@/components/testing'
import { deleteAccount } from '@/redux/modules/user/account/actions'
import { expect } from 'chai'
import { RootAction } from '@/redux/root_action'
import { createStore, Store } from '@reduxjs/toolkit'
import { reducer, RootState } from '@/redux/root_reducer'
import { registrationSignal } from '@/redux/modules/authn/actions'
import { success } from '@/redux/flow_signal'

describe('DeleteAccount', () => {
  it('dispatches account deletion sequence', async () => {
    const localVue = setUpLocalVue()
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(registrationSignal(success({
      username: 'username',
      parametrization: 'parametrization',
      encryptionKey: 'encryptionKey',
      sessionKey: 'sessionKey'
    })))
    const actionQueue = new ActionQueue()
    const { $t, dispatch } = setUpStandardMocks(actionQueue)
    const wrapper = mount(DeleteAccount, {
      localVue,
      data: () => ({ $state: store.getState() }),
      mocks: { $t, dispatch }
    })

    const password = wrapper.find('[aria-label="Password"]')
    await password.setValue('password')
    await password.trigger('input')
    await wrapper.find('button').trigger('click')
    expect(await actionQueue.dequeue()).to.deep.equal(
      deleteAccount({ password: 'password' })
    )
  })
})
