import 'vuetify/dist/vuetify.min.css'
import Application from './Application'
import Vue from 'vue'
import VueClipboard from 'vue-clipboard2'
import VueInputAutoWidth from 'vue-input-autowidth'
import VueMasonry from 'vue-masonry-css'
import Vuelidate from 'vuelidate'
import Vuetify from 'vuetify'
import router from './router'
import store from './store'

Vue.use(VueClipboard)
Vue.use(VueInputAutoWidth)
Vue.use(VueMasonry)
Vue.use(Vuetify)
Vue.use(Vuelidate)

Vue.config.productionTip = false

/* eslint-disable no-new */
new Vue({
  el: '#application',
  router,
  store,
  components: { Application }
})
