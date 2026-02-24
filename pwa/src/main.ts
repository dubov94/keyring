import './register_service_worker'

import '@fontsource/material-icons'
import '@fontsource/material-icons-outlined'
import '@fontsource/roboto'
import '@fontsource/roboto-mono'

// https://github.com/microsoft/tsyringe#installation
import 'reflect-metadata'
import { container } from 'tsyringe'

import { AnyAction } from '@reduxjs/toolkit'
import axios from 'axios'
import Qrc from 'qrcode'
import { Subject } from 'rxjs'
import { takeUntil } from 'rxjs/operators'
import { v4 } from 'uuid'

import Vue, { VueConstructor } from 'vue'
import Vuelidate from 'vuelidate'
import Vuetify from 'vuetify/lib'
import { VuetifyThemeVariant } from 'vuetify/types/services/theme'
import Application from './Application.vue'
import ExternalLink from '@/components/ExternalLink.vue'
import FormTextField from '@/components/FormTextField.vue'

import Logomark from './logomark.svg'

import { ADMINISTRATION_API_TOKEN, AUTHENTICATION_API_TOKEN } from '@/api/api_di'
import { AdministrationApi, AuthenticationApi } from '@/api/definitions'
import { fetchFromApi } from '@/api/fetch'
import { PwnedService, PWNED_SERVICE_TOKEN, HaveIBeenPwnedService } from '@/cryptography/pwned_service'
import { QrcEncoder, QRC_ENCODER_TOKEN } from '@/cryptography/qrc_encoder'
import { sha1 } from '@/cryptography/sha1'
import { SODIUM_WORKER_INTERFACE_TOKEN, SodiumWorkerInterface } from '@/cryptography/sodium_worker_interface'
import SodiumWorker from './cryptography/sodium.worker.ts'
import { StrengthTestService, STRENGTH_TEST_SERVICE_TOKEN, ZxcvbnService } from '@/cryptography/strength_test_service'
import { UidService, UID_SERVICE_TOKEN } from '@/cryptography/uid_service'
import { WEB_AUTHN_TOKEN, WebAuthnService, NavigatorCredentialsService } from '@/cryptography/web_authn'
import { Flags, FLAGS_TOKEN, readFlagsFromPage } from '@/flags'
import { getVueI18n } from '@/i18n'
import { store, state$, action$ } from '@/redux'
import { injected } from '@/redux/actions'
import {
  creatSessionStorageAccessor,
  SESSION_STORAGE_ACCESSOR_TOKEN,
  createLocalStorageAccessor,
  LOCAL_STORAGE_ACCESSOR_TOKEN
} from '@/redux/storages'
import { JsonAccessor } from '@/redux/storages/accessor'
import { router } from '@/router'
import { TURNSTILE_API_TOKEN } from '@/turnstile_di'
import { VUE_CONSTRUCTOR_TOKEN } from '@/vue_di'

const flags = readFlagsFromPage()
container.register<Flags>(FLAGS_TOKEN, {
  useValue: flags
})

container.register<JsonAccessor>(SESSION_STORAGE_ACCESSOR_TOKEN, {
  useValue: creatSessionStorageAccessor()
})
container.register<JsonAccessor>(LOCAL_STORAGE_ACCESSOR_TOKEN, {
  useValue: createLocalStorageAccessor()
})

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
  useValue: new HaveIBeenPwnedService(
    sha1,
    (prefix) => axios.get<string>(
      `https://api.pwnedpasswords.com/range/${prefix}`).then(({ data }) => data)
  )
})

container.register<StrengthTestService>(STRENGTH_TEST_SERVICE_TOKEN, {
  useValue: new ZxcvbnService()
})

container.register<QrcEncoder>(QRC_ENCODER_TOKEN, {
  useValue: { encode: Qrc.toDataURL }
})

container.register<UidService>(UID_SERVICE_TOKEN, {
  useValue: { v4 }
})

container.register<OptionalTurnstileApi>(TURNSTILE_API_TOKEN, {
  useFactory: () => (globalThis as any).turnstile || null
})

container.register<WebAuthnService>(WEB_AUTHN_TOKEN, {
  useValue: new NavigatorCredentialsService(flags.mode === 'development' ? window.location.hostname : 'parolica.com')
})

Vue.config.productionTip = false

container.register<VueConstructor>(VUE_CONSTRUCTOR_TOKEN, {
  useValue: Vue
})

store.dispatch(injected())

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
Vue.component('external-link', ExternalLink)

Vue.mixin({
  data () {
    const subject = new Subject<void>()
    return {
      $destruction: subject
    }
  },
  beforeDestroy () {
    const subject = (<Vue> this).$data.$destruction
    subject.next()
    subject.complete()
  }
})

Vue.mixin({
  data () {
    return {
      $state: state$.getValue(),
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

const variant: Partial<VuetifyThemeVariant> = {
  primary: '#052842',
  secondary: '#b31d1f',
  accent: '#b31d1f'
}
const vuetify = new Vuetify({
  icons: {
    iconfont: 'md',
    values: {
      logomark: {
        component: Logomark
      }
    }
  },
  theme: {
    themes: {
      light: variant,
      dark: variant
    }
  }
})

const application = new Vue({
  vuetify,
  render: h => h(Application),
  router,
  i18n: getVueI18n()
})
application.$mount('#application')
