import { ActionQueue, setUpLocalVue, setUpTranslationMixin, setUpStateMixin, getValue, drainActionQueue } from '@/components/testing'
import { success } from '@/redux/flow_signal'
import { registrationSignal } from '@/redux/modules/authn/actions'
import { acquireMailToken, mailTokenAcquisitionReset, mailTokenAcquisitionSignal, mailTokenReleaseReset, mailTokenReleaseSignal, releaseMailToken } from '@/redux/modules/user/account/actions'
import { RootAction } from '@/redux/root_action'
import { reducer, RootState } from '@/redux/root_reducer'
import { createStore, Store } from '@reduxjs/toolkit'
import { mount, Wrapper } from '@vue/test-utils'
import { expect } from 'chai'
import { EMPTY, Subject } from 'rxjs'
import { function as fn } from 'fp-ts'
import ChangeMail from './ChangeMail.vue'
import { showToast } from '@/redux/modules/ui/toast/actions'

describe('ChangeMail', () => {
  let store: Store<RootState, RootAction>
  let actionQueue: ActionQueue
  let wrapper: Wrapper<Vue>
  let $actions: Subject<RootAction>

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
    $actions = new Subject()
    wrapper = mount(ChangeMail, {
      localVue,
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

  const getNewMailInput = () => wrapper.find('[aria-label="New e-mail"]')
  const getPasswordInput = () => wrapper.find('[aria-label="Password"]')
  const getNextButton = () => wrapper.findAll('button').filter(
    (button) => button.text() === 'Next')
  const getCodeInput = () => wrapper.find('[aria-label="Code"]')
  const getSubmitButton = () => wrapper.findAll('button').filter(
    (button) => button.text() === 'Submit')

  it('dispatches mail acquisition action', async () => {
    await getNewMailInput().setValue('mail@example.com')
    await getPasswordInput().setValue('password')
    await getNextButton().trigger('click')
    expect(await drainActionQueue(actionQueue)).to.deep.equal([
      acquireMailToken({
        mail: 'mail@example.com',
        password: 'password'
      })
    ])
  })

  it('dispatches mail release action', async () => {
    store.dispatch(mailTokenAcquisitionSignal(success('mail@example.com')))
    await wrapper.vm.$nextTick()
    await getCodeInput().setValue('123456')
    await getSubmitButton().trigger('click')
    expect(await drainActionQueue(actionQueue)).to.deep.equal([
      releaseMailToken({ code: '123456' })
    ])
  })

  it('dispatches mail change reset', async () => {
    wrapper.destroy()

    expect(await drainActionQueue(actionQueue)).to.have.deep.members([
      mailTokenAcquisitionReset(),
      mailTokenReleaseReset()
    ])
  })

  it('resets on completion', async () => {
    await getNewMailInput().setValue('mail@example.com')
    await getPasswordInput().setValue('password')
    await getNextButton().trigger('click')
    store.dispatch(mailTokenAcquisitionSignal(success('mail@example.com')))
    await wrapper.vm.$nextTick()
    await getCodeInput().setValue('123456')
    await getSubmitButton().trigger('click')
    store.dispatch(mailTokenReleaseSignal(success({})))
    await wrapper.vm.$nextTick()
    $actions.next(mailTokenReleaseSignal(success({})))
    await wrapper.vm.$nextTick()

    expect(getValue(getNewMailInput())).to.be.empty
    expect(getValue(getPasswordInput())).to.be.empty
    expect(getValue(getCodeInput())).to.be.empty
    expect(await drainActionQueue(actionQueue)).to.include.deep.members([
      mailTokenAcquisitionReset(),
      mailTokenReleaseReset(),
      showToast({ message: 'DONE' })
    ])
  })
})
