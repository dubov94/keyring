import { mount } from '@vue/test-utils'
import DeleteAccount from './DeleteAccount.vue'
import { DeepReadonly } from 'ts-essentials'
import { zero } from '@/redux/remote_data'
import { AccountDeletion } from '@/redux/modules/user/account/selectors'
import { defaultLocalVue, defaultMocks } from '@/components/testing'
import { deleteAccount } from '@/redux/modules/user/account/actions'
import { expect } from 'chai'
import { RootAction } from '@/redux/root_action'

describe('DeleteAccount', () => {
  it('dispatches `deleteAccount`', async () => {
    const localVue = defaultLocalVue()
    const actionSink: RootAction[] = []
    const { $t, dispatch } = defaultMocks(actionSink)
    const wrapper = mount(DeleteAccount, {
      localVue,
      mocks: { $t, dispatch },
      computed: {
        canAccessApi (): boolean {
          return true
        },
        accountDeletion (): DeepReadonly<AccountDeletion> {
          return zero()
        }
      }
    })

    const password = wrapper.find('[aria-label="Password"]')
    password.setValue('password')
    await password.trigger('input')
    await wrapper.find('button').trigger('click')

    expect(actionSink).to.deep.equal([
      deleteAccount({ password: 'password' })
    ])
  })
})
