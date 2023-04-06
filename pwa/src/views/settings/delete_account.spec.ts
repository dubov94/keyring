import { createStore, Store } from '@reduxjs/toolkit'
import { mount, Wrapper } from '@vue/test-utils'
import { expect } from 'chai'
import { function as fn } from 'fp-ts'
import { ActionQueue, drainActionQueue, setUpExpansionPanelProviders, setUpLocalVue, setUpStateMixin, setUpTranslationMixin, setUpVuetify } from '@/components/testing'
import { success } from '@/redux/flow_signal'
import { registrationSignal } from '@/redux/modules/authn/actions'
import { accountDeletionReset, deleteAccount } from '@/redux/modules/user/account/actions'
import { RootAction } from '@/redux/root_action'
import { reducer, RootState } from '@/redux/root_reducer'
import { createRegistrationFlowResult } from '@/redux/testing/domain'
import DeleteAccount from './DeleteAccount.vue'

describe('DeleteAccount', () => {
  let wrapper: Wrapper<Vue>
  let store: Store<RootState, RootAction>
  let actionQueue: ActionQueue

  beforeEach(async () => {
    const localVue = setUpLocalVue()
    store = createStore(reducer)
    store.dispatch(registrationSignal(success(createRegistrationFlowResult({}))))
    actionQueue = new ActionQueue()
    wrapper = mount(DeleteAccount, {
      localVue,
      vuetify: setUpVuetify(),
      provide: {
        ...setUpExpansionPanelProviders()
      },
      propsData: { eagerPanel: true },
      mixins: [
        setUpTranslationMixin(fn.identity),
        setUpStateMixin(store, actionQueue)
      ]
    })
  })

  const getPasswordInput = () => wrapper.find('[aria-label="Password"]')
  const getSubmitButton = () => wrapper.findAll('button').filter(
    (button) => button.text() === 'Submit')

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
