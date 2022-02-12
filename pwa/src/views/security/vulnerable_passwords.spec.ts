import { shallowMount, Wrapper } from '@vue/test-utils'
import { expect } from 'chai'
import { createStore, Store } from 'redux'
import { container } from 'tsyringe'
import PasswordMasonry from '@/components/PasswordMasonry.vue'
import { ActionQueue, setUpLocalVue, setUpStateMixin, setUpVuetify } from '@/components/testing'
import { Color } from '@/cryptography/strength_test_service'
import { UidService, UID_SERVICE_TOKEN } from '@/cryptography/uid_service'
import { success } from '@/redux/flow_signal'
import { emplace } from '@/redux/modules/user/keys/actions'
import { vulnerableCliquesSearchSignal } from '@/redux/modules/user/security/actions'
import { RootAction } from '@/redux/root_action'
import { reducer, RootState } from '@/redux/root_reducer'
import { createClique, createUserKey } from '@/redux/testing/entities'
import { SequentialFakeUidService } from '@/redux/testing/services'
import VulnerablePasswords from './VulnerablePasswords.vue'

describe('VulnerablePasswords', () => {
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
    wrapper = shallowMount(VulnerablePasswords, {
      localVue,
      vuetify: setUpVuetify(),
      mixins: [
        setUpStateMixin(store, actionQueue)
      ]
    })
  })

  it('displays vulnerable user keys', async () => {
    const userKeys = [
      createUserKey({ identifier: '1', value: 'secure' }),
      createUserKey({ identifier: '2', value: 'vulnerable' })
    ]
    store.dispatch(emplace(userKeys))
    store.dispatch(vulnerableCliquesSearchSignal(success([{
      name: 'uid-2',
      score: { value: 0.5, color: Color.YELLOW }
    }])))
    await wrapper.vm.$nextTick()

    const masonry = wrapper.findComponent(PasswordMasonry)
    expect(masonry.props().cliques).to.deep.equal([
      createClique({ name: 'uid-2', parent: userKeys[1] })
    ])
    expect(masonry.props().idToScore).to.deep.equal({
      'uid-2': Color.YELLOW
    })
  })
})
