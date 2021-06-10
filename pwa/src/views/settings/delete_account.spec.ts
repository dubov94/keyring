import { mount, Wrapper } from '@vue/test-utils'
import DeleteAccount from './DeleteAccount.vue'
import { ActionQueue, drainActionQueue, setUpLocalVue, setUpStateMixin, setUpTranslationMixin, setUpVuetify } from '@/components/testing'
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
      vuetify: setUpVuetify(),
      mixins: [
        setUpTranslationMixin(fn.identity),
        setUpStateMixin(store, actionQueue)
      ]
    })
  })

  const getPasswordInput = () => wrapper.find('[aria-label="Password"]')
  const getSubmitButton = () => wrapper.find('button')

  it('dispatches account deletion action', async () => {
    await getPasswordInput().setValue('password')
    await getSubmitButton().trigger('click')

    expect(await drainActionQueue(actionQueue)).to.deep.equal([
      deleteAccount({ password: 'password' })
    ])
  })

  it('dispatches account deletion reset', async () => {
    wrapper.destroy()

    expect(await drainActionQueue(actionQueue)).to.deep.equal([
      accountDeletionReset()
    ])
  })
})
