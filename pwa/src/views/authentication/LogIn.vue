<template>
  <page>
    <v-content>
      <v-container fluid>
        <v-layout justify-center mt-5>
          <v-flex xs12 sm6 md4 lg3 xl2>
            <v-card>
              <v-card-text>
                <v-form @keydown.native.enter.prevent="submit">
                  <form-text-field type="text" label="Username" prepend-icon="person"
                    :value="username" @input="setUsername"
                    :dirty="$v.credentialsGroup.$dirty" :errors="usernameErrors"
                    @touch="$v.credentialsGroup.$touch()" @reset="$v.credentialsGroup.$reset()"
                    :autofocus="usernameIsEmpty" :disabled="usernameMatchesDepot"></form-text-field>
                  <form-text-field type="password" label="Password" prepend-icon="lock"
                    :value="password" @input="setPassword"
                    :dirty="$v.credentialsGroup.$dirty" :errors="passwordErrors"
                    @touch="$v.credentialsGroup.$touch()" @reset="$v.credentialsGroup.$reset()"
                    :autofocus="!usernameIsEmpty"></form-text-field>
                  <v-switch hide-details color="primary" label="Remember me"
                    :input-value="depotBit" @change="setPersist"></v-switch>
                </v-form>
              </v-card-text>
              <v-card-actions>
                <v-btn block color="primary" class="mx-4"
                  @click="submit" :loading="hasProgressMessage">
                  <span>Log in</span>
                  <template v-slot:loader>
                    <v-progress-circular indeterminate :size="23" :width="2">
                    </v-progress-circular>
                    <span class="ml-3">{{ progressMessage }}</span>
                  </template>
                </v-btn>
              </v-card-actions>
              <v-layout justify-center py-2>
                <router-link to="/register">Register</router-link>
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
import { required } from 'vuelidate/lib/validators'
import Page from '@/components/Page.vue'
import { sessionUsername$ } from '@/store/root/modules/session'
import { depotUsername$, depotBit$ } from '@/store/root/modules/depot'
import { ServiceLogInResponseError, ServiceGetSaltResponseError } from '@/api/definitions'
import { FlowProgressBasicState, FlowProgressErrorType } from '@/store/flow'
import { authenticationViaApiProgress$, authenticationViaDepotProgress$, logInViaApi$, logInViaDepot$ } from '@/store/root'
import {
  AuthenticationViaDepotProgressError,
  AuthenticationViaApiProgress,
  AuthenticationViaApiProgressState,
  AuthenticationViaDepotProgress,
  AuthenticationViaDepotProgressState
} from '@/store/state'
import { act, reset } from '@/store/resettable_action'
import { Undefinable } from '@/utilities'
import { showToast$ } from '@/store/root/modules/interface/toast'

const STATE_TO_MESSAGE = new Map<FlowProgressBasicState | AuthenticationViaApiProgressState | AuthenticationViaDepotProgressState, string>([
  [AuthenticationViaApiProgressState.RETRIEVING_PARAMETRIZATION, 'Getting salt'],
  [AuthenticationViaApiProgressState.COMPUTING_MASTER_KEY_DERIVATIVES, 'Computing keys'],
  [AuthenticationViaApiProgressState.MAKING_REQUEST, 'Making request'],
  [AuthenticationViaApiProgressState.DECRYPTING_DATA, 'Decrypting data'],
  [AuthenticationViaDepotProgressState.COMPUTING_MASTER_KEY_DERIVATIVES, 'Computing keys'],
  [AuthenticationViaDepotProgressState.DECRYPTING_DATA, 'Decrypting data']
])

interface Mixins {
  frozen: boolean;
}

export default (Vue as VueConstructor<Vue & Mixins>).extend({
  components: {
    page: Page
  },
  data () {
    return {
      ...{
        username: depotUsername$.getValue() || sessionUsername$.getValue() || '',
        password: '',
        frozen: false
      },
      ...{
        depotUsername: undefined as Undefinable<string>,
        authenticationViaApiProgress: undefined as Undefinable<AuthenticationViaApiProgress>,
        authenticationViaDepotProgress: undefined as Undefinable<AuthenticationViaDepotProgress>
      }
    }
  },
  subscriptions () {
    return {
      depotBit: depotBit$,
      depotUsername: depotUsername$,
      authenticationViaApiProgress: authenticationViaApiProgress$,
      authenticationViaDepotProgress: authenticationViaDepotProgress$
    }
  },
  validations: {
    username: {
      required
    },
    password: {},
    forCredentials: {
      valid () {
        if (this.authenticationViaApiProgress?.state === FlowProgressBasicState.ERROR) {
          if (this.authenticationViaApiProgress?.error.type === FlowProgressErrorType.FAILURE) {
            if (this.authenticationViaApiProgress?.error.error === ServiceLogInResponseError.INVALIDCREDENTIALS ||
              this.authenticationViaApiProgress?.error.error === ServiceGetSaltResponseError.NOTFOUND) {
              return !this.frozen
            }
          }
        }
        if (this.authenticationViaDepotProgress?.state === FlowProgressBasicState.ERROR) {
          if (this.authenticationViaDepotProgress?.error.type === FlowProgressErrorType.FAILURE) {
            if (this.authenticationViaDepotProgress?.error.error === AuthenticationViaDepotProgressError.INVALID_CREDENTIALS) {
              return !this.frozen
            }
          }
        }
        return true
      }
    },
    credentialsGroup: ['username', 'password']
  },
  computed: {
    usernameIsEmpty (): boolean {
      return this.username === ''
    },
    usernameMatchesDepot (): boolean {
      return this.username === this.depotUsername
    },
    usernameErrors () {
      return {
        [this.$t('USERNAME_IS_REQUIRED') as string]: !this.$v.username.required,
        [this.$t('INVALID_USERNAME_OR_PASSWORD') as string]: !this.$v.forCredentials.valid
      }
    },
    passwordErrors () {
      return {
        [this.$t('INVALID_USERNAME_OR_PASSWORD') as string]: !this.$v.forCredentials.valid
      }
    },
    progressMessage (): string | null {
      return STATE_TO_MESSAGE.get(this.authenticationViaApiProgress?.state || FlowProgressBasicState.IDLE) ||
        STATE_TO_MESSAGE.get(this.authenticationViaDepotProgress?.state || FlowProgressBasicState.IDLE) || null
    },
    hasProgressMessage (): boolean {
      return this.progressMessage !== null
    }
  },
  methods: {
    setUsername (value: string): void {
      this.username = value
      this.frozen = false
    },
    setPassword (value: string): void {
      this.password = value
      this.frozen = false
    },
    setPersist (value: boolean): void {
      depotBit$.next(value)
      showToast$.next(value ? {
        message: 'Okay, we will store your data encrypted on this device. Try it offline!'
      } : {
        message: 'Alright, we wiped out all saved data on this device.'
      })
    },
    submit () {
      if (!this.hasProgressMessage) {
        this.$v.$touch()
        if (!this.$v.$invalid) {
          this.frozen = true
          if (this.depotUsername === null) {
            logInViaApi$.next(act({
              username: this.username,
              password: this.password,
              inBackground: false
            }))
          } else {
            logInViaDepot$.next(act({
              username: this.username,
              password: this.password
            }))
          }
        }
      }
    }
  },
  beforeDestroy () {
    logInViaApi$.next(reset())
    logInViaDepot$.next(reset())
    if (depotUsername$.getValue() === null && depotBit$.getValue()) {
      depotBit$.next(false)
    }
  }
})
</script>
