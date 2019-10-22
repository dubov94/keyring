import 'vuetify/dist/vuetify.min.css'
import sodium from 'libsodium-wrappers'
import Application from './Application'
import FixedTooltip from './components/FixedTooltip'
import FormTextField from './components/FormTextField'
import Messages from './messages'
import Vue from 'vue'
import VueI18n from 'vue-i18n'
import Vuelidate from 'vuelidate'
import Vuetify from 'vuetify'
import router from './router'
import store from './store'
import {
  applyAttachVersionHeaderOnRequest,
  applyFreezeWhenPageIsHidden,
  applySaveRouteOnNavigation,
  applySendKeepAliveWhileIdle,
  applyGoOfflineOnRequestError
} from './aspects'

Vue.use(VueI18n)
Vue.use(Vuetify)
Vue.use(Vuelidate)

Vue.config.productionTip = false

Vue.directive('focus', {
  inserted (element) {
    element.focus()
  }
})

Vue.component('fixed-tooltip', FixedTooltip)
Vue.component('form-text-field', FormTextField)

applySaveRouteOnNavigation()
applyAttachVersionHeaderOnRequest()
applyGoOfflineOnRequestError()
applySendKeepAliveWhileIdle()
applyFreezeWhenPageIsHidden()

sodium.ready.then(() =>
  /* eslint-disable no-new */
  new Vue({
    render: h => h(Application),
    router,
    store,
    i18n: new VueI18n({
      locale: 'en',
      messages: Messages
    })
  }).$mount('#application')
)
