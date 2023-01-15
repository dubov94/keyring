<style scoped>
  .card-column {
    /* Captcha plus two paddings. */
    min-width: calc(300px + 16px * 2);
  }

  .password-strength {
    padding-left: calc(24px + 9px);
  }

  /* https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/#widget-size */
  .captcha {
    position: relative;
    width: 300px;
    height: 65px;
    margin: 0 auto;
  }

  .captcha__layer {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
  }

  .captcha__layer--widget {
    /* To be above `v-skeleton-loader` animation. */
    z-index: 1;
  }
</style>

<template>
  <page>
    <v-main>
      <v-container fluid>
        <v-row no-gutters class="mt-12" justify="center">
          <v-col class="card-column" :cols="12" :sm="6" :md="4" :lg="3" :xl="2">
            <v-card>
              <v-card-text>
                <v-form @keydown.native.enter.prevent="submit">
                  <form-text-field type="text" label="Username" prepend-icon="person" autofocus
                    :value="username.value" @input="setUsername"
                    :dirty="$v.username.$dirty" :errors="usernameErrors"
                    @touch="$v.username.$touch()" @reset="$v.username.$reset()">
                  </form-text-field>
                  <form-text-field type="password" label="Password" prepend-icon="lock"
                    v-model="password" :dirty="$v.password.$dirty" :errors="passwordErrors"
                    @touch="$v.password.$touch()" @reset="$v.password.$reset()">
                  </form-text-field>
                  <div class="password-strength my-3">
                    <strength-score :color="passwordStrength.color" :value="passwordStrength.value">
                    </strength-score>
                    <div class="mt-2 text-body-2 text--secondary">
                      Choose
                      <a href="https://xkcd.com/936/" target="_blank"
                        rel="noopener noreferrer">a strong passphrase</a>
                      that you will remember &mdash; all other data will
                      be encrypted with it, and there is no way to recover
                      any data if you forget it.
                    </div>
                  </div>
                  <form-text-field type="password" label="Repeat password" prepend-icon="repeat"
                    v-model="repeat" :dirty="$v.repeat.$dirty" :errors="repeatErrors"
                    @touch="$v.repeat.$touch()" @reset="$v.repeat.$reset()">
                  </form-text-field>
                  <form-text-field type="email" label="E-mail" prepend-icon="email"
                    v-model="mail" :dirty="$v.mail.$dirty" :errors="mailErrors"
                    @touch="$v.mail.$touch()" @reset="$v.mail.$reset()">
                  </form-text-field>
                  <div class="mt-2">
                    <div class="captcha">
                      <div class="captcha__layer">
                        <v-skeleton-loader type="paragraph"></v-skeleton-loader>
                      </div>
                      <div class="captcha__layer captcha__layer--widget" ref="captcha"></div>
                    </div>
                  </div>
                </v-form>
              </v-card-text>
              <v-card-actions class="px-6">
                <v-btn block color="primary" @click="submit" :loading="hasIndicatorMessage">
                  <span>Register</span>
                  <template #loader>
                    <v-progress-circular indeterminate :size="23" :width="2">
                    </v-progress-circular>
                    <span class="ml-4">{{ indicatorMessage }}</span>
                  </template>
                </v-btn>
              </v-card-actions>
              <div class="pb-2 text-center">
                <router-link to="/log-in">Log in</router-link>
              </div>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </page>
</template>

<script lang="ts">
import { option, function as fn, map, eq } from 'fp-ts'
import { takeUntil, filter } from 'rxjs/operators'
import { DeepReadonly } from 'ts-essentials'
import Vue, { VueConstructor } from 'vue'
import { email, required, sameAs } from 'vuelidate/lib/validators'
import { ServiceRegisterResponseError } from '@/api/definitions'
import Page from '@/components/Page.vue'
import StrengthScore from '@/components/StrengthScore.vue'
import { remoteDataErrorIndicator, checkUsername } from '@/components/form_validators'
import { Score, getStrengthTestService } from '@/cryptography/strength_test_service'
import { getFlags } from '@/flags'
import { register, RegistrationFlowIndicator, registrationReset, registrationSignal } from '@/redux/modules/authn/actions'
import { registration, Registration } from '@/redux/modules/authn/selectors'
import { showToast } from '@/redux/modules/ui/toast/actions'
import { isActionSuccess } from '@/redux/flow_signal'
import { getTurnstileApi } from '@/turnstile_di'

const usernameTakenIndicator = remoteDataErrorIndicator(ServiceRegisterResponseError.NAMETAKEN)

const INDICATOR_TO_MESSAGE = new Map<RegistrationFlowIndicator, string>([
  [RegistrationFlowIndicator.GENERATING_PARAMETRIZATION, 'Generating salt'],
  [RegistrationFlowIndicator.COMPUTING_MASTER_KEY_DERIVATIVES, 'Computing keys'],
  [RegistrationFlowIndicator.MAKING_REQUEST, 'Making request']
])

interface Mixins {
  username: { untouchedSinceDispatch: boolean };
  registration: DeepReadonly<Registration>;
}

export default (Vue as VueConstructor<Vue & Mixins>).extend({
  components: {
    page: Page,
    strengthScore: StrengthScore
  },
  data () {
    return {
      turnstileWidgetId: '',
      turnstileToken: '',
      username: {
        value: '',
        untouchedSinceDispatch: false
      },
      password: '',
      repeat: '',
      mail: ''
    }
  },
  created () {
    this.$data.$actions.pipe(
      filter(isActionSuccess(registrationSignal)),
      takeUntil(this.$data.$destruction)
    ).subscribe(() => {
      this.$router.push('/mail-verification')
    })
  },
  validations: {
    username: {
      required ({ value }) {
        return value.trim().length > 0
      },
      matchesPattern ({ value }) {
        return checkUsername(value)
      },
      isAvailable () {
        return !usernameTakenIndicator(this.registration, this.username.untouchedSinceDispatch)
      }
    },
    password: { required },
    repeat: { sameAs: sameAs('password') },
    mail: { required, email }
  },
  computed: {
    passwordStrength (): Score {
      return getStrengthTestService().score(this.password, [
        this.username.value,
        this.mail
      ])
    },
    registration (): DeepReadonly<Registration> {
      return registration(this.$data.$state)
    },
    usernameErrors (): { [key: string]: boolean } {
      return {
        [this.$t('USERNAME_CANNOT_BE_EMPTY') as string]: !this.$v.username.required,
        [this.$t('USERNAME_PATTERN_MISMATCH') as string]: !this.$v.username.matchesPattern,
        [this.$t('USERNAME_IS_ALREADY_TAKEN') as string]: !this.$v.username.isAvailable
      }
    },
    passwordErrors (): { [key: string]: boolean } {
      return {
        [this.$t('PASSWORD_CANNOT_BE_EMPTY') as string]: !this.$v.password.required
      }
    },
    repeatErrors (): { [key: string]: boolean } {
      return {
        [this.$t('PASSWORDS_DO_NOT_MATCH') as string]: !this.$v.repeat.sameAs
      }
    },
    mailErrors (): { [key: string]: boolean } {
      return {
        [this.$t('EMAIL_ADDRESS_IS_REQUIRED') as string]: !this.$v.mail.required,
        [this.$t('EMAIL_ADDRESS_IS_INVALID') as string]: !this.$v.mail.email
      }
    },
    indicatorMessage (): string | null {
      return fn.pipe(
        this.registration.indicator,
        option.chain((indicator) => map.lookup(eq.eqStrict)(indicator, INDICATOR_TO_MESSAGE)),
        option.getOrElse<string | null>(() => null)
      )
    },
    hasIndicatorMessage (): boolean {
      return this.indicatorMessage !== null
    }
  },
  methods: {
    setUsername (value: string) {
      this.username.value = value
      this.username.untouchedSinceDispatch = false
    },
    submit () {
      if (this.hasIndicatorMessage) {
        return
      }
      this.$v.$touch()
      if (this.$v.$invalid) {
        return
      }
      if (this.turnstileToken === '') {
        this.dispatch(showToast({
          message: 'Please complete the CAPTCHA 🧮'
        }))
        return
      }
      this.username.untouchedSinceDispatch = true
      this.dispatch(register({
        username: this.username.value,
        password: this.password,
        mail: this.mail,
        captchaToken: this.turnstileToken
      }))
    },
    mountTurnstile () {
      const turnstileApi = getTurnstileApi()
      if (turnstileApi === null) {
        return
      }
      this.turnstileWidgetId = turnstileApi.render(
        this.$refs.captcha as HTMLElement,
        {
          sitekey: getFlags().turnstileSiteKey,
          action: 'register',
          callback: (token) => {
            this.turnstileToken = token
          },
          'expired-callback': () => {
            this.turnstileToken = ''
            turnstileApi.reset(this.turnstileWidgetId)
          },
          'response-field': false,
          size: 'normal'
        }
      )!
    },
    unmountTurnstile () {
      const turnstileApi = getTurnstileApi()
      if (turnstileApi === null) {
        return
      }
      turnstileApi.reset(this.turnstileWidgetId)
    }
  },
  mounted () {
    this.mountTurnstile()
  },
  beforeDestroy () {
    this.unmountTurnstile()
    this.dispatch(registrationReset())
  }
})
</script>
