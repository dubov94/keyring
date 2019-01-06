import 'vuetify/dist/vuetify.min.css'
import Application from './Application'
import FixedTooltip from './components/FixedTooltip'
import FormTextField from './components/FormTextField'
import Messages from './messages'
import Vue from 'vue'
import VueI18n from 'vue-i18n'
import Vuelidate from 'vuelidate'
import Vuetify from 'vuetify'
import axios from 'axios'
import router from './router'
import store from './store'
import {SESSION_LIFETIME_IN_MS} from './constants'
import {logOut} from './utilities'

Vue.use(VueI18n)
Vue.use(Vuetify)
Vue.use(Vuelidate)

Vue.config.productionTip = false

let visibilityTimer = null
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    visibilityTimer = setTimeout(() => {
      if (store.getters.hasSessionKey) {
        logOut()
      }
    }, SESSION_LIFETIME_IN_MS)
  } else {
    clearTimeout(visibilityTimer)
  }
})

Vue.directive('focus', {
  inserted (element) {
    element.focus()
  }
})

Vue.component('fixed-tooltip', FixedTooltip)
Vue.component('form-text-field', FormTextField)

axios.interceptors.response.use(undefined, (error) => {
  store.dispatch('interface/displaySnackbar', {
    message: `Error response: ${error.response.status}!`,
    timeout: 1500
  })
  return Promise.reject(error)
})

/* eslint-disable no-new */
new Vue({
  el: '#application',
  router,
  store,
  components: { Application },
  i18n: new VueI18n({
    locale: 'en',
    messages: Messages
  })
})
