import { ActionQueue, drainActionQueue, setUpLocalVue, setUpStateMixin, setUpTranslationMixin } from '@/components/testing'
import { RootAction } from '@/redux/root_action'
import { reducer, RootState } from '@/redux/root_reducer'
import { createStore, Store } from '@reduxjs/toolkit'
import { mount, Wrapper } from '@vue/test-utils'
import { EMPTY, Subject } from 'rxjs'
import VueRouter from 'vue-router'
import MailVerification from './MailVerification.vue'
import { function as fn } from 'fp-ts'
import { expect } from 'chai'
import { mailTokenReleaseReset, mailTokenReleaseSignal, releaseMailToken } from '@/redux/modules/user/account/actions'
import { success } from '@/redux/flow_signal'

describe('MailVerification', () => {
  let store: Store<RootState, RootAction>
  let actionQueue: ActionQueue
  let wrapper: Wrapper<Vue>
  let $actions: Subject<RootAction>
  let router: VueRouter

  beforeEach(async () => {
    const localVue = setUpLocalVue()
    localVue.use(VueRouter)
    store = createStore(reducer)
    actionQueue = new ActionQueue()
    $actions = new Subject()
    router = new VueRouter({ mode: 'abstract' })
    wrapper = mount(MailVerification, {
      localVue,
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
    // To wait for `mounted`.
    await wrapper.vm.$nextTick()
  })

  const getVerificationCodeInput = () => wrapper.find('[aria-label="Verification code"]')
  const getActivateButton = () => wrapper.find('button')

  it('dispatches mail token release action', async () => {
    await getVerificationCodeInput().setValue('123456')
    await getActivateButton().trigger('click')

    expect(await drainActionQueue(actionQueue)).to.deep.equal([
      releaseMailToken({ code: '123456' })
    ])
  })

  it('dispatches mail token release reset', async () => {
    wrapper.destroy()

    expect(await drainActionQueue(actionQueue)).to.deep.equal([
      mailTokenReleaseReset()
    ])
  })

  it('redirects on completion', async () => {
    $actions.next(mailTokenReleaseSignal(success({})))
    await wrapper.vm.$nextTick()

    expect(router.currentRoute.path).to.equal('/dashboard')
  })
})
