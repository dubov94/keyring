import { createStore, Store } from '@reduxjs/toolkit'
import { shallowMount, Wrapper } from '@vue/test-utils'
import { expect } from 'chai'
import { container } from 'tsyringe'
import PasswordMasonry from '@/components/PasswordMasonry.vue'
import { ActionQueue, setUpLocalVue, setUpStateMixin, setUpVuetify } from '@/components/testing'
import { UidService, UID_SERVICE_TOKEN } from '@/cryptography/uid_service'
import { success } from '@/redux/flow_signal'
import { emplace } from '@/redux/modules/user/keys/actions'
import { exposedCliqueIdsSearchSignal } from '@/redux/modules/user/security/actions'
import { RootAction } from '@/redux/root_action'
import { reducer, RootState } from '@/redux/root_reducer'
import { createClique, createUserKey } from '@/redux/testing/domain'
import { SequentialFakeUidService } from '@/redux/testing/services'
import CompromisedPasswords from './CompromisedPasswords.vue'

describe('CompromisedPasswords', () => {
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
    wrapper = shallowMount(CompromisedPasswords, {
      localVue,
      vuetify: setUpVuetify(),
      mixins: [
        setUpStateMixin(store, actionQueue)
      ]
    })
  })

  it('displays exposed user keys', async () => {
    const userKeys = [
      createUserKey({ identifier: '1', value: 'secure' }),
      createUserKey({ identifier: '2', value: 'vulnerable' })
    ]
    store.dispatch(emplace(userKeys))
    store.dispatch(exposedCliqueIdsSearchSignal(success(['uid-2'])))
    await wrapper.vm.$nextTick()

    const masonry = wrapper.findComponent(PasswordMasonry)
    expect(masonry.props().cliques).to.deep.equal([
      createClique({ name: 'uid-2', parent: userKeys[1] })
    ])
  })
})
