<template>
  <page>
    <v-content>
      <v-container fluid>
        <v-layout justify-center mt-5>
          <v-flex xs12 sm6 md4 lg3 xl2>
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
              <v-card-actions>
                <v-btn block color="primary" class="mx-4" @click="submit"
                  :loading="hasProgressMessage">
                  <span>Register</span>
                  <template v-slot:loader>
                    <v-progress-circular indeterminate :size="23" :width="2">
                    </v-progress-circular>
                    <span class="ml-3">{{ progressMessage }}</span>
                  </template>
                </v-btn>
              </v-card-actions>
              <v-layout justify-center py-2>
                <router-link to="/log-in">Log in</router-link>
              </v-layout>
            </v-card>
          </v-flex>
        </v-layout>
      </v-container>
    </v-content>
  </page>
</template>

<script lang="ts">
import Vue, { VueConstructor } from 'vue'
import { email, required, sameAs } from 'vuelidate/lib/validators'
import Page from '@/components/Page.vue'
import { register$, registrationProgress$ } from '@/store/root'
import { RegistrationProgress, RegistrationProgressState } from '@/store/state'
import { FlowProgressBasicState, FlowProgressErrorType } from '@/store/flow'
import { act, reset } from '@/store/resettable_action'
import { ServiceRegisterResponseError } from '@/api/definitions'
import { Undefinable } from '@/utilities'

const STATE_TO_MESSAGE = new Map<FlowProgressBasicState | RegistrationProgressState, string>([
  [RegistrationProgressState.GENERATING_PARAMETRIZATION, 'Generating salt'],
  [RegistrationProgressState.COMPUTING_MASTER_KEY_DERIVATIVES, 'Computing keys'],
  [RegistrationProgressState.MAKING_REQUEST, 'Making request']
])

interface Mixins {
  username: { frozen: boolean };
}

export default (Vue as VueConstructor<Vue & Mixins>).extend({
  components: {
    page: Page
  },
  data () {
    return {
      ...{
        username: {
          value: '',
          frozen: false
        },
        password: '',
        repeat: '',
        mail: ''
      },
      ...{
        registrationProgress: undefined as Undefinable<RegistrationProgress>
      }
    }
  },
  subscriptions () {
    return {
      registrationProgress: registrationProgress$
    }
  },
  validations: {
    username: {
      required,
      isAvailable () {
        if (this.registrationProgress?.state === FlowProgressBasicState.ERROR) {
          if (this.registrationProgress?.error.type === FlowProgressErrorType.FAILURE) {
            if (this.registrationProgress?.error.error === ServiceRegisterResponseError.NAMETAKEN) {
              return !this.username.frozen
            }
          }
        }
        return true
      }
    },
    password: { required },
    repeat: { sameAs: sameAs('password') },
    mail: { email, required }
  },
  computed: {
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
    progressMessage (): string | null {
      if (this.registrationProgress) {
        if (STATE_TO_MESSAGE.has(this.registrationProgress.state)) {
          return STATE_TO_MESSAGE.get(this.registrationProgress.state)!
        }
      }
      return null
    },
    hasProgressMessage (): boolean {
      return this.progressMessage !== null
    }
  },
  methods: {
    setUsername (value: string): void {
      this.username.value = value
      this.username.frozen = false
    },
    submit (): void {
      if (!this.hasProgressMessage) {
        this.$v.$touch()
        if (!this.$v.$invalid) {
          this.username.frozen = true
          register$.next(act({
            username: this.username.value,
            password: this.password,
            mail: this.mail
          }))
        }
      }
    }
  },
  beforeDestroy () {
    register$.next(reset())
  }
})
</script>
