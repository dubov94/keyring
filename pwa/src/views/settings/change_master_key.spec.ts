import { ActionQueue, drainActionQueue, getValue, setUpLocalVue, setUpStateMixin, setUpTranslationMixin, setUpVuetify } from '@/components/testing'
import { success } from '@/redux/flow_signal'
import { registrationSignal } from '@/redux/modules/authn/actions'
import { RootAction } from '@/redux/root_action'
import { reducer, RootState } from '@/redux/root_reducer'
import { createStore, Store } from '@reduxjs/toolkit'
import { mount, Wrapper } from '@vue/test-utils'
import { EMPTY, Subject } from 'rxjs'
import ChangeMasterKey from './ChangeMasterKey.vue'
import { function as fn } from 'fp-ts'
import { expect } from 'chai'
import { changeMasterKey, masterKeyChangeReset, masterKeyChangeSignal } from '@/redux/modules/user/account/actions'
import { showToast } from '@/redux/modules/ui/toast/actions'

describe('ChangeMasterKey', () => {
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
    wrapper = mount(ChangeMasterKey, {
      localVue,
      vuetify: setUpVuetify(),
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

  const getCurrentPasswordInput = () => wrapper.find('[aria-label="Current password"]')
  const getNewPasswordInput = () => wrapper.find('[aria-label="New password"]')
  const getRepeatNewPasswordInput = () => wrapper.find('[aria-label="Repeat new password"]')
  const getSubmitButton = () => wrapper.find('button')

  it('dispatches master key change action', async () => {
    await getCurrentPasswordInput().setValue('abc')
    await getNewPasswordInput().setValue('xyz')
    await getRepeatNewPasswordInput().setValue('xyz')
    await getSubmitButton().trigger('click')

    expect(await drainActionQueue(actionQueue)).to.deep.equal([
      changeMasterKey({
        current: 'abc',
        renewal: 'xyz'
      })
    ])
  })

  it('dispatches master key change reset', async () => {
    wrapper.destroy()

    expect(await drainActionQueue(actionQueue)).to.deep.equal([
      masterKeyChangeReset()
    ])
  })

  it('resets on completion', async () => {
    await getCurrentPasswordInput().setValue('abc')
    await getNewPasswordInput().setValue('xyz')
    await getRepeatNewPasswordInput().setValue('xyz')
    await getSubmitButton().trigger('click')
    $actions.next(masterKeyChangeSignal(success({
      newMasterKey: 'xyz',
      newParametrization: 'newParametrization',
      newEncryptionKey: 'newEncryptionKey',
      newSessionKey: 'newSessionKey'
    })))
    await wrapper.vm.$nextTick()

    expect(getValue(getCurrentPasswordInput())).to.be.empty
    expect(getValue(getNewPasswordInput())).to.be.empty
    expect(getValue(getRepeatNewPasswordInput())).to.be.empty
    expect(await drainActionQueue(actionQueue)).to.include.deep.members([
      masterKeyChangeReset(),
      showToast({ message: 'DONE' })
    ])
  })
})
