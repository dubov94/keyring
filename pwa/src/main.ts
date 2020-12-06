import './register_service_worker'
// https://github.com/microsoft/tsyringe#installation
import 'reflect-metadata'
import sodium from 'libsodium-wrappers'
import { container } from 'tsyringe'
import { Subject } from 'rxjs'

import 'vuetify/dist/vuetify.min.css'
import Vue from 'vue'
import VueI18n from 'vue-i18n'
import VueRx from 'vue-rx'
import Vuelidate from 'vuelidate'
import Vuetify from 'vuetify'
import Application from './Application.vue'
import FormTextField from './components/FormTextField.vue'

import { AdministrationApi, AuthenticationApi } from '@/api/definitions'
import { fetchFromApi } from '@/api/fetch'
import { ADMINISTRATION_API_TOKEN, AUTHENTICATION_API_TOKEN } from '@/api/api_di'
import { LOCALE_MESSAGES } from '@/messages'
import { Router } from '@/router'
import { PwnedService, PWNED_SERVICE_TOKEN, HaveIBeenPwnedService } from '@/pwned_service'
import SodiumWorker from './sodium.worker.ts'
import { SODIUM_INTERFACE_TOKEN, SodiumInterface } from '@/sodium_interface'
import '@/store'
import { getStore } from '@/store/store_di'
import '@/redux'

container.register<SodiumInterface>(SODIUM_INTERFACE_TOKEN, {
  useValue: SodiumWorker<SodiumInterface>()
})

container.register<AdministrationApi>(ADMINISTRATION_API_TOKEN, {
  useValue: new AdministrationApi({}, '/api', fetchFromApi)
})

container.register<AuthenticationApi>(AUTHENTICATION_API_TOKEN, {
  useValue: new AuthenticationApi({}, '/api', fetchFromApi)
})

container.register<PwnedService>(PWNED_SERVICE_TOKEN, {
  useValue: new HaveIBeenPwnedService()
})

Vue.config.productionTip = false

Vue.use(VueI18n)
Vue.use(VueRx)
Vue.use(Vuetify)
Vue.use(Vuelidate)

container.register(VueI18n, {
  useValue: new VueI18n({
    locale: 'en',
    messages: LOCALE_MESSAGES
  })
})

Vue.mixin({
  data () {
    return {
      beforeDestroy$: new Subject<void>()
    }
  },
  beforeDestroy () {
    (this as Vue).beforeDestroy$.next()
  }
})

Vue.directive('focus', {
  inserted (element) {
    element.focus()
  }
})
Vue.directive('visible', (element, binding) => {
  element.style.visibility = binding.value ? 'visible' : 'hidden'
})

Vue.component('form-text-field', FormTextField)

;(async () => {
  await sodium.ready
  new Vue({
    render: h => h(Application),
    router: Router,
    store: getStore(),
    i18n: container.resolve(VueI18n)
  }).$mount('#application')
})()
