<style scoped>
  .password-strength {
    padding-left: calc(24px + 9px);
  }
</style>

<template>
  <page>
    <v-main>
      <v-container fluid>
        <v-row no-gutters class="mt-12" justify="center">
          <v-col :cols="12" :sm="6" :md="4" :lg="3" :xl="2">
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
                  <div class="password-strength">
                    <strength-score :color="assessment.color" :value="assessment.value">
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
import { container } from 'tsyringe'
import Vue, { VueConstructor } from 'vue'
import { email, required, sameAs } from 'vuelidate/lib/validators'
import { ServiceRegisterResponseError } from '@/api/definitions'
import Page from '@/components/Page.vue'
import StrengthScore from '@/components/StrengthScore.vue'
import { remoteDataValidator } from '@/components/form_validators'
import { Score, StrengthTestService, STRENGTH_TEST_SERVICE_TOKEN } from '@/cryptography/strength_test_service'
import { register, RegistrationFlowIndicator, registrationReset, registrationSignal } from '@/redux/modules/authn/actions'
import { registration, Registration } from '@/redux/modules/authn/selectors'
import { isActionSuccess } from '@/redux/flow_signal'

const usernameAvailableValidator = remoteDataValidator(ServiceRegisterResponseError.NAMETAKEN)

const INDICATOR_TO_MESSAGE = new Map<RegistrationFlowIndicator, string>([
  [RegistrationFlowIndicator.GENERATING_PARAMETRIZATION, 'Generating salt'],
  [RegistrationFlowIndicator.COMPUTING_MASTER_KEY_DERIVATIVES, 'Computing keys'],
  [RegistrationFlowIndicator.MAKING_REQUEST, 'Making request']
])

interface Mixins {
  username: { frozen: boolean };
  registration: DeepReadonly<Registration>;
}

export default (Vue as VueConstructor<Vue & Mixins>).extend({
  components: {
    page: Page,
    strengthScore: StrengthScore
  },
  data () {
    return {
      strengthTestService: container.resolve<StrengthTestService>(STRENGTH_TEST_SERVICE_TOKEN),
      username: {
        value: '',
        frozen: false
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
      required,
      isAvailable () {
        return !usernameAvailableValidator(this.registration, this.username.frozen)
      }
    },
    password: { required },
    repeat: { sameAs: sameAs('password') },
    mail: { email, required }
  },
  computed: {
    assessment (): Score {
      return this.strengthTestService.score(this.password, [
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
      this.username.frozen = false
    },
    submit () {
      if (!this.hasIndicatorMessage) {
        this.$v.$touch()
        if (!this.$v.$invalid) {
          this.username.frozen = true
          this.dispatch(register({
            username: this.username.value,
            password: this.password,
            mail: this.mail
          }))
        }
      }
    }
  },
  beforeDestroy () {
    this.dispatch(registrationReset())
  }
})
</script>
