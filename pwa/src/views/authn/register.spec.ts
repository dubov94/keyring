import { ActionQueue, drainActionQueue, setUpLocalVue, setUpStateMixin, setUpTranslationMixin, setUpVuetify } from '@/components/testing'
import { createStore, Store } from '@reduxjs/toolkit'
import { mount, Wrapper } from '@vue/test-utils'
import { expect } from 'chai'
import { function as fn } from 'fp-ts'
import 'reflect-metadata'
import { EMPTY, Subject } from 'rxjs'
import { container } from 'tsyringe'
import VueRouter from 'vue-router'
import { StrengthTestService, STRENGTH_TEST_SERVICE_TOKEN } from '@/cryptography/strength_test_service'
import { success } from '@/redux/flow_signal'
import { register, registrationReset, registrationSignal } from '@/redux/modules/authn/actions'
import { RootAction } from '@/redux/root_action'
import { reducer, RootState } from '@/redux/root_reducer'
import { createRegistrationFlowResult } from '@/redux/testing/domain'
import { FAKE_FLAGS } from '@/redux/testing/flags'
import { FakeTurnstileApi, PositiveFakeStrengthTestService } from '@/redux/testing/services'
import { TURNSTILE_API_TOKEN } from '@/turnstile_di'
import Register from './Register.vue'
import { Flags, FLAGS_TOKEN } from '@/flags'

describe('Register', () => {
  let store: Store<RootState, RootAction>
  let actionQueue: ActionQueue
  let wrapper: Wrapper<Vue>
  let $actions: Subject<RootAction>
  let router: VueRouter

  beforeEach(() => {
    container.register<StrengthTestService>(STRENGTH_TEST_SERVICE_TOKEN, {
      useValue: new PositiveFakeStrengthTestService()
    })
    container.register<OptionalTurnstileApi>(TURNSTILE_API_TOKEN, {
      useValue: new FakeTurnstileApi('widget', 'captchaToken')
    })
    container.register<Flags>(FLAGS_TOKEN, {
      useValue: FAKE_FLAGS
    })
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

  it('dispatches registration action', async () => {
    await getUsernameInput().setValue('username')
    await getPasswordInput().setValue('password')
    await getRepeatPasswordInput().setValue('password')
    await getEmailInput().setValue('mail@example.com')
    await getRegisterButton().trigger('click')

    expect(await drainActionQueue(actionQueue)).to.deep.equal([
      register({
        username: 'username',
        password: 'password',
        mail: 'mail@example.com',
        captchaToken: 'captchaToken'
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
