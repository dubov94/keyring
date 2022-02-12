import { createStore, Store } from '@reduxjs/toolkit'
import { shallowMount, Wrapper } from '@vue/test-utils'
import { expect } from 'chai'
import { container } from 'tsyringe'
import PasswordMasonry from '@/components/PasswordMasonry.vue'
import { ActionQueue, setUpLocalVue, setUpStateMixin, setUpVuetify } from '@/components/testing'
import { UidService, UID_SERVICE_TOKEN } from '@/cryptography/uid_service'
import { success } from '@/redux/flow_signal'
import { deletionSignal, emplace } from '@/redux/modules/user/keys/actions'
import { duplicateGroupsSearchSignal } from '@/redux/modules/user/security/actions'
import { RootAction } from '@/redux/root_action'
import { reducer, RootState } from '@/redux/root_reducer'
import { createUserKey, createClique } from '@/redux/testing/domain'
import { SequentialFakeUidService } from '@/redux/testing/services'
import DuplicatePasswords from './DuplicatePasswords.vue'

describe('DuplicatePasswords', () => {
  let store: Store<RootState, RootAction>
  let actionQueue: ActionQueue
  let wrapper: Wrapper<Vue>

  beforeEach(() => {
    container.register<UidService>(UID_SERVICE_TOKEN, {
      useValue: new SequentialFakeUidService()
    })
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
    const userKeys = [
      createUserKey({ identifier: '1', value: 'a' }),
      createUserKey({ identifier: '2', value: 'a' })
    ]
    store.dispatch(emplace(userKeys))
    store.dispatch(duplicateGroupsSearchSignal(success([
      ['uid-1', 'uid-2']
    ])))
    await wrapper.vm.$nextTick()

    const masonry = wrapper.findComponent(PasswordMasonry)
    expect(masonry.props().cliques).to.deep.equal([
      createClique({ name: 'uid-1', parent: userKeys[0] }),
      createClique({ name: 'uid-2', parent: userKeys[1] })
    ])
  })

  it('switches between duplicate groups', async () => {
    const userKeys = [
      createUserKey({ identifier: '1', value: 'a' }),
      createUserKey({ identifier: '2', value: 'a' }),
      createUserKey({ identifier: '3', value: 'b' }),
      createUserKey({ identifier: '4', value: 'b' })
    ]
    store.dispatch(emplace(userKeys))
    store.dispatch(duplicateGroupsSearchSignal(success([
      ['uid-1', 'uid-2'],
      ['uid-3', 'uid-4']
    ])))
    await wrapper.vm.$nextTick()
    const pagination = wrapper.findComponent({ name: 'v-pagination' })
    pagination.vm.$emit('input', 2)
    await wrapper.vm.$nextTick()

    const masonry = wrapper.findComponent(PasswordMasonry)
    expect(masonry.props().cliques).to.deep.equal([
      createClique({ name: 'uid-3', parent: userKeys[2] }),
      createClique({ name: 'uid-4', parent: userKeys[3] })
    ])
  })

  it('decreases the group number when the last group disappears', async () => {
    store.dispatch(emplace([
      createUserKey({ identifier: '1', value: 'a' }),
      createUserKey({ identifier: '2', value: 'a' }),
      createUserKey({ identifier: '3', value: 'b' }),
      createUserKey({ identifier: '4', value: 'b' })
    ]))
    store.dispatch(duplicateGroupsSearchSignal(success([
      ['uid-1', 'uid-2'],
      ['uid-3', 'uid-4']
    ])))
    await wrapper.vm.$nextTick()
    const pagination = wrapper.findComponent({ name: 'v-pagination' })
    pagination.vm.$emit('input', 2)
    await wrapper.vm.$nextTick()
    store.dispatch(deletionSignal(success('4'), { uid: 'random' }))
    store.dispatch(duplicateGroupsSearchSignal(success([
      ['uid-1', 'uid-2']
    ])))
    await wrapper.vm.$nextTick()

    expect(pagination.props().value).to.equal(1)
  })
})
