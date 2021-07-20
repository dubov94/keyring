import { ActionQueue, drainActionQueue, setUpLocalVue, setUpStateMixin, setUpTranslationMixin, setUpVuetify } from '@/components/testing'
import { RootAction } from '@/redux/root_action'
import { reducer, RootState } from '@/redux/root_reducer'
import { createStore, Store } from '@reduxjs/toolkit'
import { mount, Wrapper } from '@vue/test-utils'
import { EMPTY, Subject } from 'rxjs'
import Vue from 'vue'
import VueRouter from 'vue-router'
import LogIn from './LogIn.vue'
import { function as fn } from 'fp-ts'
import { expect } from 'chai'
import { authnViaApiReset, authnViaDepotReset, authnViaDepotSignal, initiateBackgroundAuthn, logInViaApi, logInViaDepot, remoteAuthnComplete } from '@/redux/modules/authn/actions'
import { activateDepot, rehydrateDepot } from '@/redux/modules/depot/actions'
import { success } from '@/redux/flow_signal'

describe('LogIn', () => {
  let store: Store<RootState, RootAction>
  let actionQueue: ActionQueue
  let wrapper: Wrapper<Vue>
  let $actions: Subject<RootAction>
  let router: VueRouter

  beforeEach(() => {
    const localVue = setUpLocalVue()
    localVue.use(VueRouter)
    localVue.mixin(setUpTranslationMixin(fn.identity))
    store = createStore(reducer)
    actionQueue = new ActionQueue()
    $actions = new Subject()
    router = new VueRouter({ mode: 'abstract' })
    wrapper = mount(LogIn, {
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
        setUpStateMixin(store, actionQueue)
      ]
    })
  })

  const getUsernameInput = () => wrapper.find('[aria-label="Username"]')
  const getPasswordInput = () => wrapper.find('[aria-label="Password"]')
  const getPersistanceSwitch = () => wrapper.find('[role="switch"]')
  const getRegisterButton = () => wrapper.find('button')

  it('dispatches remote authentication action', async () => {
    await getUsernameInput().setValue('username')
    await getPasswordInput().setValue('password')
    await getRegisterButton().trigger('click')

    expect(await drainActionQueue(actionQueue)).to.deep.equal([
      logInViaApi({
        username: 'username',
        password: 'password'
      })
    ])
  })

  it('dispatches depot authentication action', async () => {
    store.dispatch(rehydrateDepot({
      username: 'username',
      salt: 'salt',
      hash: 'hash',
      vault: 'vault',
      encryptedOtpToken: null
    }))
    await wrapper.vm.$nextTick()
    await getUsernameInput().setValue('username')
    await getPasswordInput().setValue('password')
    await getRegisterButton().trigger('click')

    expect(await drainActionQueue(actionQueue)).to.deep.equal([
      logInViaDepot({
        username: 'username',
        password: 'password'
      })
    ])
  })

  it('dispatches remote authentication reset', async () => {
    wrapper.destroy()

    expect(await drainActionQueue(actionQueue)).to.include.deep.members([
      authnViaDepotReset()
    ])
  })

  it('dispatches depot authentication reset', async () => {
    wrapper.destroy()

    expect(await drainActionQueue(actionQueue)).to.include.deep.members([
      authnViaApiReset()
    ])
  })

  it('redirects and initiates depot authn on remote authn completion', async () => {
    await getPersistanceSwitch().trigger('click')
    $actions.next(remoteAuthnComplete({
      username: 'username',
      password: 'password',
      parametrization: 'parametrization',
      encryptionKey: 'encryptionKey',
      sessionKey: 'sessionKey',
      mailVerificationRequired: false,
      mail: 'mail@example.com',
      userKeys: [],
      isOtpEnabled: false,
      otpToken: null
    }))
    await wrapper.vm.$nextTick()

    expect(await drainActionQueue(actionQueue)).to.include.deep.members([
      activateDepot({
        username: 'username',
        password: 'password'
      })
    ])
    expect(router.currentRoute.path).to.equal('/dashboard')
  })

  it('redirects and initiates remote authn on depot authn completion', async () => {
    $actions.next(authnViaDepotSignal(success({
      username: 'username',
      password: 'password',
      userKeys: [],
      depotKey: 'depotKey'
    })))
    await wrapper.vm.$nextTick()

    expect(await drainActionQueue(actionQueue)).to.deep.equal([
      initiateBackgroundAuthn({
        username: 'username',
        password: 'password'
      })
    ])
    expect(router.currentRoute.path).to.equal('/dashboard')
  })
})
