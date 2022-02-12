import { createStore, Store } from '@reduxjs/toolkit'
import { shallowMount, Wrapper } from '@vue/test-utils'
import { assert, expect } from 'chai'
import { EMPTY, Subject } from 'rxjs'
import { Writable } from 'ts-essentials'
import { container } from 'tsyringe'
import VueRouter from 'vue-router'
import { Framework } from 'vuetify'
import PasswordMasonry from '@/components/PasswordMasonry.vue'
import { ActionQueue, setUpLocalVue, setUpStateMixin, setUpVuetify } from '@/components/testing'
import { UidService, UID_SERVICE_TOKEN } from '@/cryptography/uid_service'
import { success } from '@/redux/flow_signal'
import { registrationSignal } from '@/redux/modules/authn/actions'
import { emplace, userKeysUpdate } from '@/redux/modules/user/keys/actions'
import { Clique } from '@/redux/modules/user/keys/selectors'
import { RootAction } from '@/redux/root_action'
import { reducer, RootState } from '@/redux/root_reducer'
import { createClique, createRegistrationFlowResult, createUserKey } from '@/redux/testing/entities'
import { SequentialFakeUidService } from '@/redux/testing/services'
import Dashboard from './Dashboard.vue'

describe('Dashboard', () => {
  let store: Store<RootState, RootAction>
  let actionQueue: ActionQueue
  let wrapper: Wrapper<Vue>
  let $actions: Subject<RootAction>

  beforeEach(() => {
    container.register<UidService>(UID_SERVICE_TOKEN, {
      useValue: new SequentialFakeUidService()
    })
    const localVue = setUpLocalVue()
    localVue.use(VueRouter)
    store = createStore(reducer)
    store.dispatch(registrationSignal(success(createRegistrationFlowResult({}))))
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
  const getCliqueNames = () => getPasswordMasonry().props().cliques.map(
    (clique: Clique) => clique.name)

  it('filters items by search query', async () => {
    const userKeys = [
      createUserKey({ identifier: '1', value: 'fst', tags: ['abc', 'xyz'] }),
      createUserKey({ identifier: '2', value: 'snd', tags: ['xyz', '---'] })
    ]
    store.dispatch(emplace(userKeys))
    wrapper.vm.$data.$actions.next(userKeysUpdate(userKeys))
    await wrapper.vm.$nextTick()
    assert.deepEqual(getCliqueNames(), ['uid-1', 'uid-2'])
    getSearchInput().vm.$emit('input', 'AB')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(getPasswordMasonry().props().cliques).to.deep.equal([
      createClique({ name: 'uid-1', parent: userKeys[0] })
    ])
  })

  it('resets query on attachment', async () => {
    const userKeys = [
      createUserKey({ identifier: '1', value: 'fst', tags: ['xyz'] }),
      createUserKey({ identifier: '2', value: 'snd', tags: ['xyz'] }),
      createUserKey({ identifier: '3', value: 'trd', tags: ['abc'] })
    ]
    store.dispatch(emplace(userKeys))
    wrapper.vm.$data.$actions.next(userKeysUpdate(userKeys))
    await wrapper.vm.$nextTick()
    assert.deepEqual(getCliqueNames(), ['uid-1', 'uid-2', 'uid-3'])
    getSearchInput().vm.$emit('input', 'xyz')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    assert.deepEqual(getCliqueNames(), ['uid-1', 'uid-2'])
    getPasswordMasonry().vm.$emit('addition', 'clq', true)
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(getSearchInput().props().value).to.equal('')
    expect(getPasswordMasonry().props().cliques.length).to.equal(3)
  })
})
