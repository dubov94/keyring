import { ActionQueue, setUpLocalVue, setUpStateMixin, setUpVuetify } from '@/components/testing'
import { success } from '@/redux/flow_signal'
import { deletionSignal, emplace } from '@/redux/modules/user/keys/actions'
import { duplicateGroupsSearchSignal } from '@/redux/modules/user/security/actions'
import { RootAction } from '@/redux/root_action'
import { reducer, RootState } from '@/redux/root_reducer'
import { createStore, Store } from '@reduxjs/toolkit'
import { shallowMount, Wrapper } from '@vue/test-utils'
import DuplicatePasswords from './DuplicatePasswords.vue'
import PasswordMasonry from '@/components/PasswordMasonry.vue'
import { expect } from 'chai'

describe('DuplicatePasswords', () => {
  let store: Store<RootState, RootAction>
  let actionQueue: ActionQueue
  let wrapper: Wrapper<Vue>

  beforeEach(() => {
    const localVue = setUpLocalVue()
    store = createStore(reducer)
    actionQueue = new ActionQueue()
    wrapper = shallowMount(DuplicatePasswords, {
      localVue,
      vuetify: setUpVuetify(),
      mixins: [
        setUpStateMixin(store, actionQueue)
      ]
    })
  })

  it('displays the first duplicate group', async () => {
    store.dispatch(emplace([
      { identifier: '1', value: 'a', tags: [] },
      { identifier: '2', value: 'a', tags: [] }
    ]))
    store.dispatch(duplicateGroupsSearchSignal(success([['1', '2']])))
    await wrapper.vm.$nextTick()

    const masonry = wrapper.findComponent(PasswordMasonry)
    expect(masonry.props().userKeys).to.deep.equal([
      { identifier: '1', value: 'a', tags: [] },
      { identifier: '2', value: 'a', tags: [] }
    ])
  })

  it('switches between duplicate groups', async () => {
    store.dispatch(emplace([
      { identifier: '1', value: 'a', tags: [] },
      { identifier: '2', value: 'a', tags: [] },
      { identifier: '3', value: 'b', tags: [] },
      { identifier: '4', value: 'b', tags: [] }
    ]))
    store.dispatch(duplicateGroupsSearchSignal(success([
      ['1', '2'],
      ['3', '4']
    ])))
    await wrapper.vm.$nextTick()
    const pagination = wrapper.findComponent({ name: 'v-pagination' })
    pagination.vm.$emit('input', 2)
    await wrapper.vm.$nextTick()

    const masonry = wrapper.findComponent(PasswordMasonry)
    expect(masonry.props().userKeys).to.deep.equal([
      { identifier: '3', value: 'b', tags: [] },
      { identifier: '4', value: 'b', tags: [] }
    ])
  })

  it('propagates key editing request', async () => {
    store.dispatch(emplace([
      { identifier: '1', value: 'a', tags: [] },
      { identifier: '2', value: 'a', tags: [] }
    ]))
    store.dispatch(duplicateGroupsSearchSignal(success([['1', '2']])))
    await wrapper.vm.$nextTick()
    const masonry = wrapper.findComponent(PasswordMasonry)
    masonry.vm.$emit('edit', { identifier: '1', reveal: false })
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted().edit![0]).to.deep.equal([
      { identifier: '1', reveal: false }
    ])
  })

  it('decreases the group number when the last group disappears', async () => {
    store.dispatch(emplace([
      { identifier: '1', value: 'a', tags: [] },
      { identifier: '2', value: 'a', tags: [] },
      { identifier: '3', value: 'b', tags: [] },
      { identifier: '4', value: 'b', tags: [] }
    ]))
    store.dispatch(duplicateGroupsSearchSignal(success([
      ['1', '2'],
      ['3', '4']
    ])))
    await wrapper.vm.$nextTick()
    const pagination = wrapper.findComponent({ name: 'v-pagination' })
    pagination.vm.$emit('input', 2)
    await wrapper.vm.$nextTick()
    store.dispatch(deletionSignal(success('4')))
    store.dispatch(duplicateGroupsSearchSignal(success([['1', '2']])))
    await wrapper.vm.$nextTick()

    expect(pagination.props().value).to.equal(1)
  })
})
