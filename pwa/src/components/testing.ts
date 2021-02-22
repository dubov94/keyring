import Vue, { VueConstructor } from 'vue'
import { createLocalVue } from '@vue/test-utils'
import Vuetify from 'vuetify'
import Vuelidate from 'vuelidate'
import { RootAction } from '@/redux/root_action'
import FormTextField from '@/components/FormTextField.vue'

export const defaultLocalVue = (): VueConstructor<Vue> => {
  const localVue = createLocalVue()
  localVue.use(Vuetify)
  localVue.use(Vuelidate)
  localVue.component('form-text-field', FormTextField)
  return localVue
}

export const defaultMocks = (actionSink: RootAction[]) => {
  const $t = (key: string) => key
  const dispatch = (action: RootAction) => {
    actionSink.push(action)
  }
  return { $t, dispatch }
}
