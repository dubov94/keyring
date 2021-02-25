import { mount, Wrapper } from '@vue/test-utils'
import DeleteAccount from './DeleteAccount.vue'
import { ActionQueue, setUpLocalVue, setUpStateMixin, setUpTranslationMixin } from '@/components/testing'
import { accountDeletionReset, deleteAccount } from '@/redux/modules/user/account/actions'
import { expect } from 'chai'
import { RootAction } from '@/redux/root_action'
import { createStore, Store } from '@reduxjs/toolkit'
import { reducer, RootState } from '@/redux/root_reducer'
import { registrationSignal } from '@/redux/modules/authn/actions'
import { success } from '@/redux/flow_signal'
import { function as fn } from 'fp-ts'

describe('DeleteAccount', () => {
  let wrapper: Wrapper<Vue>
  let store: Store<RootState, RootAction>
  let actionQueue: ActionQueue

  beforeEach(() => {
    const localVue = setUpLocalVue()
    store = createStore(reducer)
    store.dispatch(registrationSignal(success({
      username: 'username',
      parametrization: 'parametrization',
      encryptionKey: 'encryptionKey',
      sessionKey: 'sessionKey'
    })))
    actionQueue = new ActionQueue()
    wrapper = mount(DeleteAccount, {
      localVue,
      mixins: [
        setUpTranslationMixin(fn.identity),
        setUpStateMixin(store, actionQueue)
      ]
    })
  })

  it('dispatches account deletion sequence', async () => {
    const password = wrapper.find('[aria-label="Password"]')
    await password.setValue('password')
    await wrapper.find('button').trigger('click')
    expect(await actionQueue.dequeue()).to.deep.equal(
      deleteAccount({ password: 'password' })
    )
  })

  it('dispatches account deletion reset', async () => {
    wrapper.destroy()
    expect(await actionQueue.dequeue()).to.deep.equal(accountDeletionReset())
  })
})
