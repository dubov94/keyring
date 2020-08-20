import 'vuetify/dist/vuetify.min.css'
import sodium from 'libsodium-wrappers'
import './register_service_worker'
import Application from './Application'
import FormTextField from './components/FormTextField'
import { LOCALE_MESSAGES } from './messages'
import Vue from 'vue'
import VueI18n from 'vue-i18n'
import VueRx from 'vue-rx'
import Vuelidate from 'vuelidate'
import Vuetify from 'vuetify'
import router from './router'
import store from './store'

Vue.use(VueI18n)
Vue.use(VueRx)
Vue.use(Vuetify)
Vue.use(Vuelidate)

Vue.config.productionTip = false

Vue.directive('focus', {
  inserted (element) {
    element.focus()
  }
})
Vue.directive('visible', (element, binding) => {
  element.style.visibility = binding.value ? 'visible' : 'hidden'
})

Vue.component('form-text-field', FormTextField)

sodium.ready.then(() =>
  new Vue({
    render: h => h(Application),
    router,
    store,
    i18n: new VueI18n({
      locale: 'en',
      messages: LOCALE_MESSAGES
    })
  }).$mount('#application')
)
