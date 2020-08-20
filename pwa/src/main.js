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
import {
  applyGoOfflineOnRequestError
} from './aspects'

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

// Aspects are a very powerful short-term weapon, and as any powerful weapon
// should be used with extreme care. While they do save quite a bit of time
// on initial plumbing, they heavily obfuscate the logic and sometimes can
// lead to undesired side-effects in places where their application was not
// expected by the developer. We are actively trying to reduce their number,
// but it's a perpetual battle -- in practice as soon as one is eliminated
// it's a matter of time before another pops up.
//
// That said, given the migration to RxJS we may be able to get rid of all
// of them soon!
applyGoOfflineOnRequestError()

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
