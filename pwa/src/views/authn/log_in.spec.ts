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
import {
  authnOtpProvisionReset,
  authnViaApiReset,
  authnViaDepotReset,
  authnViaDepotSignal,
  initiateBackgroundAuthn,
  logInViaApi,
  logInViaDepot,
  remoteAuthnComplete
} from '@/redux/modules/authn/actions'
import { rehydration as depotRehydration, webAuthnInterruption, webAuthnResult } from '@/redux/modules/depot/actions'
import { success } from '@/redux/flow_signal'
import { createAuthnViaDepotFlowResult, createDepotRehydration, createDepotRehydrationWebAuthn, createPasswordInput, createRemoteAuthnCompleteResult, createWebAuthnInput, createWebAuthnResult } from '@/redux/testing/domain'

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
  const getLogInButton = () => wrapper.find('button.primary')

  it('dispatches remote authentication action', async () => {
    await getUsernameInput().setValue('username')
    await getPasswordInput().setValue('password')
    const logInButton = getLogInButton()
    expect(logInButton.text()).to.contain('Log in')
    await logInButton.trigger('click')

    expect(await drainActionQueue(actionQueue)).to.deep.equal([
      logInViaApi({
        username: 'username',
        password: 'password'
      })
    ])
  })

  it('initiates depot authn on matching username', async () => {
    store.dispatch(depotRehydration(createDepotRehydration({})))
    await wrapper.vm.$nextTick()
    await getUsernameInput().setValue('username')
    await getPasswordInput().setValue('password')
    await getLogInButton().trigger('click')

    expect(await drainActionQueue(actionQueue)).to.deep.equal([
      logInViaDepot({
        username: 'username',
        authnInput: createPasswordInput('password')
      })
    ])
  })

  it('initiates depot authn on WebAuthn result', async () => {
    store.dispatch(depotRehydration(createDepotRehydration(createDepotRehydrationWebAuthn({}))))
    getUsernameInput().setValue('username')
    $actions.next(webAuthnResult(createWebAuthnResult({})))
    await wrapper.vm.$nextTick()

    expect(await drainActionQueue(actionQueue)).to.deep.equal([
      logInViaDepot({
        username: 'username',
        authnInput: createWebAuthnInput('webAuthnCredentialId')
      })
    ])
  })

  it('dispatches WebAuthn read reset', async () => {
    wrapper.destroy()

    expect(await drainActionQueue(actionQueue)).to.include.deep.members([
      webAuthnInterruption()
    ])
  })

  it('dispatches remote authentication reset', async () => {
    wrapper.destroy()

    expect(await drainActionQueue(actionQueue)).to.include.deep.members([
      authnViaDepotReset()
    ])
  })

  it('dispatches remote otp provision reset', async () => {
    wrapper.destroy()

    expect(await drainActionQueue(actionQueue)).to.include.deep.members([
      authnOtpProvisionReset()
    ])
  })

  it('dispatches depot authentication reset', async () => {
    wrapper.destroy()

    expect(await drainActionQueue(actionQueue)).to.include.deep.members([
      authnViaApiReset()
    ])
  })

  it('redirects on remote authn completion', async () => {
    $actions.next(remoteAuthnComplete(createRemoteAuthnCompleteResult({})))
    await wrapper.vm.$nextTick()

    expect(router.currentRoute.path).to.equal('/dashboard')
  })

  it('redirects and initiates remote authn on depot authn completion', async () => {
    $actions.next(authnViaDepotSignal(success(createAuthnViaDepotFlowResult({}))))
    await wrapper.vm.$nextTick()

    expect(await drainActionQueue(actionQueue)).to.deep.equal([
      initiateBackgroundAuthn({
        username: 'username',
        authnInput: createPasswordInput()
      })
    ])
    expect(router.currentRoute.path).to.equal('/dashboard')
  })
})
