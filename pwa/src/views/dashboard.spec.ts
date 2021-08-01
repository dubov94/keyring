import { ActionQueue, setUpLocalVue, setUpStateMixin, setUpVuetify } from '@/components/testing'
import { success } from '@/redux/flow_signal'
import { registrationSignal } from '@/redux/modules/authn/actions'
import { RootAction } from '@/redux/root_action'
import { reducer, RootState } from '@/redux/root_reducer'
import { createStore, Store } from '@reduxjs/toolkit'
import { shallowMount, Wrapper } from '@vue/test-utils'
import { EMPTY, Subject } from 'rxjs'
import Dashboard from './Dashboard.vue'
import PasswordMasonry from '@/components/PasswordMasonry.vue'
import { creationSignal, emplace } from '@/redux/modules/user/keys/actions'
import { expect } from 'chai'
import { Framework } from 'vuetify'
import { Writable } from 'ts-essentials'

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
    const vuetify = setUpVuetify()
    wrapper = shallowMount(Dashboard, {
      localVue,
      vuetify,
      propsData: {
        debounceMillis: null
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
    // Alter the framework after the component is instantiated.
    ;(<Writable<Framework>>vuetify.framework).goTo = <T>(target: T) => Promise.resolve(target)
  })

  const getSearchInput = () => wrapper.findComponent({ name: 'v-text-field' })
  const getPasswordMasonry = () => wrapper.findComponent(PasswordMasonry)

  it('filters items by search query', async () => {
    store.dispatch(emplace([
      { identifier: '1', value: 'fst', tags: ['abc', 'xyz'] },
      { identifier: '2', value: 'snd', tags: ['xyz', '---'] }
    ]))
    await wrapper.vm.$nextTick()
    await getSearchInput().vm.$emit('input', 'AB')
    await wrapper.vm.$nextTick()

    expect(getPasswordMasonry().props().userKeys).to.deep.equal([
      { identifier: '1', value: 'fst', tags: ['abc', 'xyz'] }
    ])
  })

  it('resets query on key creation', async () => {
    store.dispatch(emplace([
      { identifier: '1', value: 'fst', tags: ['-'] },
      { identifier: '2', value: 'snd', tags: ['-'] },
      { identifier: '3', value: 'trd', tags: ['-'] }
    ]))
    await wrapper.vm.$nextTick()
    await getSearchInput().vm.$emit('input', '-')
    await wrapper.vm.$nextTick()
    $actions.next(creationSignal(success({
      identifier: '4',
      value: 'fth',
      tags: []
    })))
    await wrapper.vm.$nextTick()

    expect(getSearchInput().props().value).to.equal('')
  })
})
