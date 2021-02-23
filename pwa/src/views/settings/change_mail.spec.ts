import { ActionQueue, setUpLocalVue, setUpStandardMocks, setUpStateMixin } from '@/components/testing'
import { success } from '@/redux/flow_signal'
import { registrationSignal } from '@/redux/modules/authn/actions'
import { acquireMailToken, mailTokenAcquisitionSignal, releaseMailToken } from '@/redux/modules/user/account/actions'
import { RootAction } from '@/redux/root_action'
import { reducer, RootState } from '@/redux/root_reducer'
import { createStore, Store } from '@reduxjs/toolkit'
import { mount } from '@vue/test-utils'
import { expect } from 'chai'
import { EMPTY } from 'rxjs'
import ChangeMail from './ChangeMail.vue'

describe('ChangeMail', () => {
  it('dispatches mail change sequence', async () => {
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
    const wrapper = mount(ChangeMail, {
      localVue,
      data () {
        return {
          $actions: EMPTY,
          $destruction: EMPTY
        }
      },
      mocks: { $t, dispatch },
      mixins: [setUpStateMixin(store)]
    })

    const newMail = wrapper.find('[aria-label="New e-mail"]')
    await newMail.setValue('mail@example.com')
    await newMail.trigger('input')
    const password = wrapper.find('[aria-label="Password"]')
    await password.setValue('password')
    await password.trigger('input')
    await wrapper.findAll('button').filter(
      (button) => button.text() === 'Next').trigger('click')
    expect(await actionQueue.dequeue()).to.deep.equal(
      acquireMailToken({
        mail: 'mail@example.com',
        password: 'password'
      })
    )
    store.dispatch(mailTokenAcquisitionSignal(success('mail@example.com')))
    await wrapper.vm.$nextTick()
    const code = wrapper.find('[aria-label="Code"]')
    await code.setValue('123456')
    await code.trigger('input')
    await wrapper.findAll('button').filter(
      (button) => button.text() === 'Submit').trigger('click')
    expect(await actionQueue.dequeue()).to.deep.equal(
      releaseMailToken({ code: '123456' })
    )
  })
})
