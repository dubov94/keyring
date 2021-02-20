import './register_service_worker'
// https://github.com/microsoft/tsyringe#installation
import 'reflect-metadata'
import sodium from 'libsodium-wrappers'
import { container } from 'tsyringe'
import { Subject } from 'rxjs'

import 'vuetify/dist/vuetify.min.css'
import Vue, { VueConstructor } from 'vue'
import Vuelidate from 'vuelidate'
import Vuetify from 'vuetify'
import Application from './Application.vue'
import FormTextField from './components/FormTextField.vue'

import { AdministrationApi, AuthenticationApi } from '@/api/definitions'
import { fetchFromApi } from '@/api/fetch'
import { ADMINISTRATION_API_TOKEN, AUTHENTICATION_API_TOKEN } from '@/api/api_di'
import { getVueI18n } from '@/i18n'
import { Router } from '@/router'
import { PwnedService, PWNED_SERVICE_TOKEN, HaveIBeenPwnedService } from '@/pwned_service'
import SodiumWorker from './sodium.worker.ts'
import { SODIUM_WORKER_INTERFACE_TOKEN, SodiumWorkerInterface } from '@/sodium_worker_interface'
import { store, state$, action$ } from '@/redux'
import { takeUntil } from 'rxjs/operators'
import { AnyAction } from '@reduxjs/toolkit'
import { VUE_CONSTRUCTOR_TOKEN } from './vue_di'

container.register<SodiumWorkerInterface>(SODIUM_WORKER_INTERFACE_TOKEN, {
  useValue: SodiumWorker<SodiumWorkerInterface>()
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

container.register<VueConstructor>(VUE_CONSTRUCTOR_TOKEN, {
  useValue: Vue
})

Vue.use(Vuetify)
Vue.use(Vuelidate)

Vue.directive('focus', {
  inserted (element) {
    element.focus()
  }
})
Vue.directive('visible', (element, binding) => {
  element.style.visibility = binding.value ? 'visible' : 'hidden'
})

Vue.component('form-text-field', FormTextField)

Vue.mixin({
  data () {
    return {
      $destruction: new Subject<void>()
    }
  },
  beforeDestroy () {
    ;(<Vue> this).$data.$destruction.next()
  }
})

Vue.mixin({
  data () {
    return {
      $state: store.getState(),
      $actions: action$
    }
  },
  methods: {
    dispatch (action: AnyAction) {
      store.dispatch(action)
    }
  },
  created () {
    state$.pipe(
      takeUntil((<Vue> this).$data.$destruction)
    ).subscribe((value) => {
      ;(<Vue> this).$data.$state = value
    })
  }
})

;(async () => {
  await sodium.ready
  new Vue({
    render: h => h(Application),
    router: Router,
    i18n: getVueI18n()
  }).$mount('#application')
})()
