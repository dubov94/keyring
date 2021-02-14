import { createLocalVue, mount } from '@vue/test-utils'
import DeleteAccount from './DeleteAccount.vue'
import { expect } from 'chai'
import { DeepReadonly } from 'ts-essentials'
import { zero } from '@/redux/remote_data'
import { AccountDeletion } from '@/redux/modules/user/account/selectors'
import { validationMixin } from 'vuelidate'
import Vuetify from 'vuetify'
import FormTextField from '@/components/FormTextField.vue'

describe('DeleteAccount', () => {
  it('renders the title', () => {
    const localVue = createLocalVue()
    localVue.use(Vuetify)
    const wrapper = mount(DeleteAccount, {
      localVue,
      components: {
        formTextField: FormTextField
      },
      mixins: [validationMixin],
      mocks: {
        $t: (key: string) => key
      },
      computed: {
        canAccessApi (): boolean {
          return true
        },
        accountDeletion (): DeepReadonly<AccountDeletion> {
          return zero()
        }
      }
    })

    expect(wrapper.find('.toolbar__title').text()).to.equal('Delete account')
  })
})
