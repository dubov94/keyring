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

<script>
import { email, required, sameAs } from 'vuelidate/lib/validators'
import Page from '@/components/Page'
import { register$, RegisterActionType } from '@/store/root/actions/authentication'
import { registrationData$ } from '@/store/root/getters'
import { RegistrationState, RegistrationErrorType } from '@/store/state'
import { ServiceRegisterResponseError } from '@/api/definitions'

const STATE_TO_MESSAGE = new Map([
  [RegistrationState.GENERATING_PARAMETRIZATION, 'Generating salt'],
  [RegistrationState.COMPUTING_MASTER_KEY_DERIVATIVES, 'Computing keys'],
  [RegistrationState.MAKING_REQUEST, 'Making request']
])

export default {
  components: {
    page: Page
  },
  data () {
    return {
      username: {
        value: '',
        frozen: false
      },
      password: '',
      repeat: '',
      mail: ''
    }
  },
  subscriptions () {
    return {
      registrationData: registrationData$
    }
  },
  validations: {
    username: {
      required,
      isAvailable () {
        if (this.registrationData.state === RegistrationState.ERROR) {
          if (this.registrationData.error.type === RegistrationErrorType.FAILURE) {
            if (this.registrationData.error.error === ServiceRegisterResponseError.NAMETAKEN) {
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
    usernameErrors () {
      return {
        [this.$t('USERNAME_CANNOT_BE_EMPTY')]: !this.$v.username.required,
        [this.$t('USERNAME_IS_ALREADY_TAKEN')]: !this.$v.username.isAvailable
      }
    },
    passwordErrors () {
      return {
        [this.$t('PASSWORD_CANNOT_BE_EMPTY')]: !this.$v.password.required
      }
    },
    repeatErrors () {
      return {
        [this.$t('PASSWORDS_DO_NOT_MATCH')]: !this.$v.repeat.sameAs
      }
    },
    mailErrors () {
      return {
        [this.$t('EMAIL_ADDRESS_IS_REQUIRED')]: !this.$v.mail.required,
        [this.$t('EMAIL_ADDRESS_IS_INVALID')]: !this.$v.mail.email
      }
    },
    progressMessage () {
      if (STATE_TO_MESSAGE.has(this.registrationData.state)) {
        return STATE_TO_MESSAGE.get(this.registrationData.state)
      }
      return null
    },
    hasProgressMessage () {
      return this.progressMessage !== null
    }
  },
  methods: {
    setUsername (value) {
      this.username.value = value
      this.username.frozen = false
    },
    submit () {
      this.$v.$touch()
      if (!this.$v.$invalid) {
        this.username.frozen = true
        register$.next({
          type: RegisterActionType.REGISTER,
          username: this.username.value,
          password: this.password,
          mail: this.mail
        })
      }
    }
  },
  beforeDestroy () {
    register$.next({ type: RegisterActionType.RESET })
  }
}
</script>
