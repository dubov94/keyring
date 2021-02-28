import { ActionQueue, setUpLocalVue, setUpStateMixin } from '@/components/testing'
import { success } from '@/redux/flow_signal'
import { registrationSignal } from '@/redux/modules/authn/actions'
import { RootAction } from '@/redux/root_action'
import { reducer, RootState } from '@/redux/root_reducer'
import { createStore, Store } from '@reduxjs/toolkit'
import { shallowMount, Wrapper } from '@vue/test-utils'
import { EMPTY, Subject } from 'rxjs'
import Dashboard from './Dashboard.vue'
import PasswordMasonry from '@/components/PasswordMasonry.vue'
import { creationSignal, deletionSignal, emplace } from '@/redux/modules/user/keys/actions'
import { assert, expect } from 'chai'

describe('Dashboard', () => {
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
    wrapper = shallowMount(Dashboard, {
      localVue,
      propsData: {
        cardsPerPage: 2
      },
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

  const getSearchInput = () => wrapper.findComponent({ name: 'v-text-field' })
  const getPagination = () => wrapper.findComponent({ name: 'v-pagination' })
  const getPasswordMasonry = () => wrapper.findComponent(PasswordMasonry)

  it('splits items into pages', async () => {
    store.dispatch(emplace([
      { identifier: '1', value: 'fst', tags: [] },
      { identifier: '2', value: 'snd', tags: [] },
      { identifier: '3', value: 'trd', tags: [] }
    ]))
    await wrapper.vm.$nextTick()

    expect(getPagination().props().length).to.be.equal(2)
    expect(getPasswordMasonry().props().userKeys).to.deep.equal([
      { identifier: '1', value: 'fst', tags: [] },
      { identifier: '2', value: 'snd', tags: [] }
    ])
  })

  it('decreases the page number when it exceeds the length', async () => {
    store.dispatch(emplace([
      { identifier: '1', value: 'fst', tags: [] },
      { identifier: '2', value: 'snd', tags: [] },
      { identifier: '3', value: 'trd', tags: [] }
    ]))
    await wrapper.vm.$nextTick()
    assert.equal(getPagination().props().value, 1)
    await getPagination().vm.$emit('input', 2)
    store.dispatch(deletionSignal(success('3')))
    await wrapper.vm.$nextTick()

    expect(getPagination().props().value).to.equal(1)
  })

  it('filters items by search query', async () => {
    store.dispatch(emplace([
      { identifier: '1', value: 'fst', tags: ['abc', 'xyz'] },
      { identifier: '2', value: 'snd', tags: ['xyz', '---'] }
    ]))
    await wrapper.vm.$nextTick()
    await getSearchInput().vm.$emit('input', 'AB')

    expect(getPasswordMasonry().props().userKeys).to.deep.equal([
      { identifier: '1', value: 'fst', tags: ['abc', 'xyz'] }
    ])
  })

  it('resets navigation on query change', async () => {
    store.dispatch(emplace([
      { identifier: '1', value: 'fst', tags: ['-'] },
      { identifier: '2', value: 'snd', tags: ['-'] },
      { identifier: '3', value: 'trd', tags: ['-'] }
    ]))
    await wrapper.vm.$nextTick()
    await getPagination().vm.$emit('input', 2)
    await getSearchInput().vm.$emit('input', '-')
    assert.equal(getPagination().props().length, 2)

    expect(getPagination().props().value).to.equal(1)
  })

  it('resets on key creation', async () => {
    store.dispatch(emplace([
      { identifier: '1', value: 'fst', tags: ['-'] },
      { identifier: '2', value: 'snd', tags: ['-'] },
      { identifier: '3', value: 'trd', tags: ['-'] }
    ]))
    await wrapper.vm.$nextTick()
    await getSearchInput().vm.$emit('input', '-')
    assert.equal(getPagination().props().length, 2)
    await getPagination().vm.$emit('input', 2)
    $actions.next(creationSignal(success({
      identifier: '4',
      value: 'fth',
      tags: []
    })))
    await wrapper.vm.$nextTick()

    expect(getSearchInput().props().value).to.equal('')
    expect(getPagination().props().value).to.equal(1)
  })
})
