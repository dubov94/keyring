import { ActionQueue, setUpLocalVue, setUpStateMixin, setUpVuetify } from '@/components/testing'
import { RootAction } from '@/redux/root_action'
import { reducer, RootState } from '@/redux/root_reducer'
import { createStore, Store } from '@reduxjs/toolkit'
import { shallowMount, Wrapper } from '@vue/test-utils'
import CompromisedPasswords from './CompromisedPasswords.vue'
import PasswordMasonry from '@/components/PasswordMasonry.vue'
import { emplace } from '@/redux/modules/user/keys/actions'
import { exposedUserKeyIdsSearchSignal } from '@/redux/modules/user/security/actions'
import { success } from '@/redux/flow_signal'
import { expect } from 'chai'

describe('CompromisedPasswords', () => {
  let store: Store<RootState, RootAction>
  let actionQueue: ActionQueue
  let wrapper: Wrapper<Vue>

  beforeEach(() => {
    const localVue = setUpLocalVue()
    store = createStore(reducer)
    actionQueue = new ActionQueue()
    wrapper = shallowMount(CompromisedPasswords, {
      localVue,
      vuetify: setUpVuetify(),
      mixins: [
        setUpStateMixin(store, actionQueue)
      ]
    })
  })

  it('displays exposed user keys', async () => {
    store.dispatch(emplace([
      { identifier: '1', value: 'secure', tags: [] },
      { identifier: '2', value: 'vulnerable', tags: [] }
    ]))
    store.dispatch(exposedUserKeyIdsSearchSignal(success(['2'])))
    await wrapper.vm.$nextTick()

    const masonry = wrapper.findComponent(PasswordMasonry)
    expect(masonry.props().userKeys).to.deep.equal([
      { identifier: '2', value: 'vulnerable', tags: [] }
    ])
  })

  it('propagates key editing request', async () => {
    store.dispatch(emplace([{ identifier: 'identifier', value: 'value', tags: [] }]))
    store.dispatch(exposedUserKeyIdsSearchSignal(success(['identifier'])))
    await wrapper.vm.$nextTick()
    const masonry = wrapper.findComponent(PasswordMasonry)
    masonry.vm.$emit('edit', { identifier: 'identifier', reveal: false })
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted().edit![0]).to.deep.equal([{
      identifier: 'identifier',
      reveal: false
    }])
  })
})
