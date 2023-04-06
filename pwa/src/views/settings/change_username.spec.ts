import { createStore, Store } from '@reduxjs/toolkit'
import { mount, Wrapper } from '@vue/test-utils'
import { expect } from 'chai'
import { function as fn } from 'fp-ts'
import { EMPTY, Subject } from 'rxjs'
import { ActionQueue, drainActionQueue, getValue, setUpExpansionPanelProviders, setUpLocalVue, setUpStateMixin, setUpTranslationMixin, setUpVuetify } from '@/components/testing'
import { success } from '@/redux/flow_signal'
import { registrationSignal } from '@/redux/modules/authn/actions'
import { showToast } from '@/redux/modules/ui/toast/actions'
import { changeUsername, usernameChangeReset, usernameChangeSignal } from '@/redux/modules/user/account/actions'
import { RootAction } from '@/redux/root_action'
import { reducer, RootState } from '@/redux/root_reducer'
import { createRegistrationFlowResult } from '@/redux/testing/domain'
import ChangeUsername from './ChangeUsername.vue'

describe('ChangeUsername', () => {
  let store: Store<RootState, RootAction>
  let actionQueue: ActionQueue
  let wrapper: Wrapper<Vue>
  let $actions: Subject<RootAction>

  beforeEach(async () => {
    const localVue = setUpLocalVue()
    store = createStore(reducer)
    store.dispatch(registrationSignal(success(createRegistrationFlowResult({}))))
    actionQueue = new ActionQueue()
    $actions = new Subject()
    wrapper = mount(ChangeUsername, {
      localVue,
      vuetify: setUpVuetify(),
      provide: {
        ...setUpExpansionPanelProviders()
      },
      propsData: { eagerPanel: true },
      data () {
        return {
          $actions,
          $destruction: EMPTY
        }
      },
      mixins: [
        setUpTranslationMixin(fn.identity),
        setUpStateMixin(store, actionQueue)
      ]
    })
  })

  const getNewUsernameInput = () => wrapper.find('[aria-label="New username"]')
  const getPasswordInput = () => wrapper.find('[aria-label="Password"]')
  const getSubmitButton = () => wrapper.findAll('button').filter(
    (button) => button.text() === 'Submit')

  it('dispatches username change action', async () => {
    await getNewUsernameInput().setValue('username')
    await getPasswordInput().setValue('password')
    await getSubmitButton().trigger('click')

    expect(await drainActionQueue(actionQueue)).to.deep.equal([
      changeUsername({
        username: 'username',
        password: 'password'
      })
    ])
  })

  it('dispatches username change reset', async () => {
    wrapper.destroy()

    expect(await drainActionQueue(actionQueue)).to.deep.equal([
      usernameChangeReset()
    ])
  })

  it('resets on completion', async () => {
    await getNewUsernameInput().setValue('username')
    await getPasswordInput().setValue('password')
    await getSubmitButton().trigger('click')
    $actions.next(usernameChangeSignal(success({
      before: 'john',
      update: 'username'
    })))
    await wrapper.vm.$nextTick()

    expect(getValue(getNewUsernameInput())).to.be.empty
    expect(getValue(getPasswordInput())).to.be.empty
    expect(await drainActionQueue(actionQueue)).to.include.deep.members([
      usernameChangeReset(),
      showToast({ message: 'DONE' })
    ])
  })
})
