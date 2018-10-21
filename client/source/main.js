import 'vuetify/dist/vuetify.min.css'
import Application from './Application'
import Vue from 'vue'
import VueClipboard from 'vue-clipboard2'
import VueInputAutoWidth from 'vue-input-autowidth'
import Vuelidate from 'vuelidate'
import Vuetify from 'vuetify'
import axios from 'axios'
import router from './router'
import store from './store'
import {SESSION_LIFETIME_IN_MS} from './constants'

Vue.use(VueClipboard)
Vue.use(VueInputAutoWidth)
Vue.use(Vuetify)
Vue.use(Vuelidate)

Vue.config.productionTip = false

let visibilityTimer = null
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    visibilityTimer = setTimeout(() => {
      location.reload()
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
  components: { Application }
})
