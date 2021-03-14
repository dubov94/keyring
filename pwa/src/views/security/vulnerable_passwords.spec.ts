import { ActionQueue, setUpLocalVue, setUpStateMixin } from '@/components/testing'
import { Color } from '@/cryptography/strength_test_service'
import { success } from '@/redux/flow_signal'
import { emplace } from '@/redux/modules/user/keys/actions'
import { vulnerableKeysSearchSignal } from '@/redux/modules/user/security/actions'
import { RootAction } from '@/redux/root_action'
import { reducer, RootState } from '@/redux/root_reducer'
import { shallowMount, Wrapper } from '@vue/test-utils'
import { expect } from 'chai'
import { createStore, Store } from 'redux'
import VulnerablePasswords from './VulnerablePasswords.vue'
import PasswordMasonry from '@/components/PasswordMasonry.vue'

describe('VulnerablePasswords', () => {
  let store: Store<RootState, RootAction>
  let actionQueue: ActionQueue
  let wrapper: Wrapper<Vue>

  beforeEach(() => {
    const localVue = setUpLocalVue()
    store = createStore(reducer)
    actionQueue = new ActionQueue()
    wrapper = shallowMount(VulnerablePasswords, {
      localVue,
      mixins: [
        setUpStateMixin(store, actionQueue)
      ]
    })
  })

  it('displays vulnerable user keys', async () => {
    store.dispatch(emplace([
      { identifier: '1', value: 'secure', tags: [] },
      { identifier: '2', value: 'vulnerable', tags: [] }
    ]))
    store.dispatch(vulnerableKeysSearchSignal(success([{
      identifier: '2',
      score: { value: 0, color: Color.RED }
    }])))
    await wrapper.vm.$nextTick()

    const masonry = wrapper.findComponent(PasswordMasonry)
    expect(masonry.props().userKeys).to.deep.equal([
      {
        identifier: '2',
        value: 'vulnerable',
        tags: [],
        score: { value: 0, color: Color.RED }
      }
    ])
  })

  it('propagates key editing request', async () => {
    store.dispatch(emplace([{ identifier: 'identifier', value: 'value', tags: [] }]))
    store.dispatch(vulnerableKeysSearchSignal(success([{
      identifier: 'identifier',
      score: { value: 0, color: Color.RED }
    }])))
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
