import { ActionQueue, drainActionQueue, setUpLocalVue, setUpStateMixin, setUpTranslationMixin, setUpVuetify } from '@/components/testing'
import { RootAction } from '@/redux/root_action'
import { reducer, RootState } from '@/redux/root_reducer'
import { createStore, Store } from '@reduxjs/toolkit'
import { mount, Wrapper } from '@vue/test-utils'
import { EMPTY, Subject } from 'rxjs'
import VueRouter from 'vue-router'
import Register from './Register.vue'
import { function as fn } from 'fp-ts'
import { expect } from 'chai'
import { register, registrationReset, registrationSignal } from '@/redux/modules/authn/actions'
import { success } from '@/redux/flow_signal'
import { createRegistrationFlowResult } from '@/redux/testing/domain'

describe('Register', () => {
  let store: Store<RootState, RootAction>
  let actionQueue: ActionQueue
  let wrapper: Wrapper<Vue>
  let $actions: Subject<RootAction>
  let router: VueRouter

  beforeEach(() => {
    const localVue = setUpLocalVue()
    localVue.use(VueRouter)
    store = createStore(reducer)
    actionQueue = new ActionQueue()
    $actions = new Subject()
    router = new VueRouter({ mode: 'abstract' })
    wrapper = mount(Register, {
      localVue,
      vuetify: setUpVuetify(),
      stubs: {
        page: true
      },
      router,
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

  const getUsernameInput = () => wrapper.find('[aria-label="Username"]')
  const getPasswordInput = () => wrapper.find('[aria-label="Password"]')
  const getRepeatPasswordInput = () => wrapper.find('[aria-label="Repeat password"]')
  const getEmailInput = () => wrapper.find('[aria-label="E-mail"')
  const getRegisterButton = () => wrapper.find('button')

  it('dispathes registration action', async () => {
    await getUsernameInput().setValue('username')
    await getPasswordInput().setValue('password')
    await getRepeatPasswordInput().setValue('password')
    await getEmailInput().setValue('mail@example.com')
    await getRegisterButton().trigger('click')

    expect(await drainActionQueue(actionQueue)).to.deep.equal([
      register({
        username: 'username',
        password: 'password',
        mail: 'mail@example.com'
      })
    ])
  })

  it('dispatches registration reset', async () => {
    wrapper.destroy()

    expect(await drainActionQueue(actionQueue)).to.deep.equal([
      registrationReset()
    ])
  })

  it('redirects on completion', async () => {
    $actions.next(registrationSignal(success(createRegistrationFlowResult({}))))
    await wrapper.vm.$nextTick()

    expect(router.currentRoute.path).to.equal('/mail-verification')
  })
})
