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
                    :input-value="persist" @change="setPersist"></v-switch>
                </v-form>
              </v-card-text>
              <v-card-actions>
                <v-btn block color="primary" class="mx-4"
                  @click="submit" :loading="hasIndicatorMessage">
                  <span>Log in</span>
                  <template v-slot:loader>
                    <v-progress-circular indeterminate :size="23" :width="2">
                    </v-progress-circular>
                    <span class="ml-3">{{ indicatorMessage }}</span>
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
import { ServiceLogInResponseError, ServiceGetSaltResponseError } from '@/api/definitions'
import { sessionUsername } from '@/redux/modules/session/selectors'
import {
  AuthnViaApiFlowIndicator,
  logInViaApi,
  authnViaApiReset,
  authnViaApiSignal,
  AuthnViaDepotFlowIndicator,
  logInViaDepot,
  authnViaDepotReset,
  authnViaDepotSignal,
  initiateBackgroundAuthn,
  AuthnViaDepotFlowError
} from '@/redux/modules/authn/actions'
import { authnViaApi, AuthnViaApi, authnViaDepot, AuthnViaDepot } from '@/redux/modules/authn/selectors'
import { isFailureOf, isActionSuccess, isSignalFailure } from '@/redux/flow_signal'
import { DeepReadonly } from 'ts-essentials'
import { showToast } from '@/redux/modules/ui/toast/actions'
import { takeUntil, filter, map as rxMap } from 'rxjs/operators'
import { Observable } from 'rxjs'
import { function as fn, option, map, eq, array } from 'fp-ts'
import { error } from '@/redux/remote_data'
import { activateDepot, clearDepot } from '@/redux/modules/depot/actions'
import { depotUsername } from '@/redux/modules/depot/selectors'
import { isActionOf } from 'typesafe-actions'
import { RootAction } from '@/redux/root_action'

const INDICATOR_TO_MESSAGE = new Map<AuthnViaApiFlowIndicator | AuthnViaDepotFlowIndicator, string>([
  [AuthnViaApiFlowIndicator.RETRIEVING_PARAMETRIZATION, 'Getting salt'],
  [AuthnViaApiFlowIndicator.COMPUTING_MASTER_KEY_DERIVATIVES, 'Computing keys'],
  [AuthnViaApiFlowIndicator.MAKING_REQUEST, 'Making request'],
  [AuthnViaApiFlowIndicator.DECRYPTING_DATA, 'Decrypting data'],
  [AuthnViaDepotFlowIndicator.COMPUTING_MASTER_KEY_DERIVATIVES, 'Computing keys'],
  [AuthnViaDepotFlowIndicator.DECRYPTING_DATA, 'Decrypting data']
])

interface Mixins {
  frozen: boolean;
  authnViaApi: DeepReadonly<AuthnViaApi>;
  authnViaDepot: DeepReadonly<AuthnViaDepot>;
}

export default (Vue as VueConstructor<Vue & Mixins>).extend({
  components: {
    page: Page
  },
  data () {
    return {
      username: '',
      password: '',
      frozen: false,
      persist: false
    }
  },
  created () {
    const usernameFromDepot = depotUsername(this.$data.$state)
    this.username = sessionUsername(this.$data.$state) || usernameFromDepot || ''
    this.persist = usernameFromDepot !== null
    this.actions().pipe(
      filter(isActionSuccess(authnViaApiSignal)),
      takeUntil(this.$data.$destruction)
    ).subscribe((action) => {
      if (this.persist) {
        this.dispatch(activateDepot({
          username: action.payload.data.username,
          password: action.payload.data.password
        }))
      }
      this.$router.push('/dashboard')
    })
    this.actions().pipe(
      filter(isActionSuccess(authnViaDepotSignal)),
      takeUntil(this.$data.$destruction)
    ).subscribe((action) => {
      this.dispatch(initiateBackgroundAuthn({
        username: action.payload.data.username,
        password: action.payload.data.password
      }))
      this.$router.push('/dashboard')
    })
    this.actions().pipe(
      filter(isActionOf(authnViaDepotSignal)),
      rxMap((action) => action.payload),
      filter(isSignalFailure),
      rxMap((signal) => signal.error),
      filter(isFailureOf([AuthnViaDepotFlowError.INVALID_CREDENTIALS])),
      takeUntil(this.$data.$destruction)
    ).subscribe(() => {
      this.dispatch(showToast({
        message: 'Changed the password remotely? Toggle \'Remember me\' twice.'
      }))
    })
  },
  validations: {
    username: {
      required
    },
    password: {},
    forCredentials: {
      valid () {
        return fn.pipe(
          [
            fn.pipe(
              error(this.authnViaApi),
              option.filter(isFailureOf([
                ServiceLogInResponseError.INVALIDCREDENTIALS,
                ServiceGetSaltResponseError.NOTFOUND
              ]))
            ),
            fn.pipe(
              error(this.authnViaDepot),
              option.filter(isFailureOf([AuthnViaDepotFlowError.INVALID_CREDENTIALS]))
            )
          ],
          array.findFirst<option.Option<unknown>>(option.isSome),
          option.map(() => !this.frozen),
          option.getOrElse<boolean>(() => true)
        )
      }
    },
    credentialsGroup: ['username', 'password']
  },
  computed: {
    authnViaApi (): DeepReadonly<AuthnViaApi> {
      return authnViaApi(this.$data.$state)
    },
    authnViaDepot (): DeepReadonly<AuthnViaDepot> {
      return authnViaDepot(this.$data.$state)
    },
    depotUsername (): string | null {
      return depotUsername(this.$data.$state)
    },
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
    indicatorMessage (): string | null {
      return fn.pipe(
        [this.authnViaApi.indicator, this.authnViaDepot.indicator],
        array.findFirst<option.Option<AuthnViaApiFlowIndicator | AuthnViaDepotFlowIndicator>>(option.isSome),
        option.chain((indicator) => map.lookup(eq.eqStrict)(indicator, INDICATOR_TO_MESSAGE)),
        option.getOrElse<string | null>(() => null)
      )
    },
    hasIndicatorMessage (): boolean {
      return this.indicatorMessage !== null
    }
  },
  methods: {
    actions (): Observable<RootAction> {
      return this.$data.$actions
    },
    setUsername (value: string) {
      this.username = value
      this.frozen = false
    },
    setPassword (value: string) {
      this.password = value
      this.frozen = false
    },
    setPersist (value: boolean) {
      if (value) {
        this.persist = true
        this.dispatch(showToast({ message: 'Okay, we will store your data encrypted on this device. Try it offline!' }))
      } else {
        this.dispatch(clearDepot())
        this.dispatch(showToast({ message: 'Alright, we wiped out all saved data on this device.' }))
        this.persist = false
      }
    },
    submit () {
      if (!this.hasIndicatorMessage) {
        this.$v.$touch()
        if (!this.$v.$invalid) {
          this.frozen = true
          if (this.usernameMatchesDepot) {
            this.dispatch(logInViaDepot({
              username: this.username,
              password: this.password
            }))
          } else {
            this.dispatch(logInViaApi({
              username: this.username,
              password: this.password
            }))
          }
        }
      }
    }
  },
  beforeDestroy () {
    this.dispatch(authnViaApiReset())
    this.dispatch(authnViaDepotReset())
  }
})
</script>
