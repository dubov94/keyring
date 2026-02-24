<style scoped>
  .action-group {
    display: flex;
  }

  .action-group__submit {
    flex: 1;
  }

  .action-group__edit {
    min-width: auto;
  }
</style>

<template>
  <div>
    <div class="pa-4">
      <v-form @keydown.native.enter.prevent="submit">
        <form-text-field type="text" label="Username" prepend-icon="person"
          :value="username" @input="setUsername"
          :dirty="$v.credentialsGroup.$dirty" :errors="usernameErrors"
          @touch="$v.credentialsGroup.$touch()" @reset="$v.credentialsGroup.$reset()"
          :autofocus="usernameIsEmpty" :disabled="usernameMatchesDepot"></form-text-field>
        <form-text-field v-if="!biometricsMode || editRequested"
          :type="passwordType" label="Password" prepend-icon="lock"
          :value="password" @input="setPassword"
          :dirty="$v.credentialsGroup.$dirty" :errors="passwordErrors"
          @touch="$v.credentialsGroup.$touch()" @reset="$v.credentialsGroup.$reset()"
          :autofocus="!usernameIsEmpty"
          :append-icon="revealIcon" @append-click="toggleReveal"></form-text-field>
      </v-form>
    </div>
    <div class="py-2 px-6">
      <div class="action-group">
        <v-btn class="action-group__submit" color="primary" @click="submit" :loading="hasIndicatorMessage">
          <span>Log in</span>
          <template #loader>
            <v-progress-circular indeterminate :size="23" :width="2">
            </v-progress-circular>
            <span class="ml-4">{{ indicatorMessage }}</span>
          </template>
          <v-icon v-if="biometricsMode" right>fingerprint</v-icon>
        </v-btn>
        <v-btn v-if="biometricsMode" class="action-group__edit ml-2" color="primary" @click="requestEdit">
          <v-icon>edit</v-icon>
        </v-btn>
      </div>
      <v-btn v-if="usernameMatchesDepot" block class="mt-2" @click="forget">
        Forget
      </v-btn>
    </div>
  </div>
</template>

<script lang="ts">
import { array, eq, function as fn, map, option } from 'fp-ts'
import { DeepReadonly } from 'ts-essentials'
import Vue, { VueConstructor } from 'vue'
import { required } from 'vuelidate/lib/validators'
import { ServiceLogInResponseError, ServiceGetSaltResponseError } from '@/api/definitions'
import { isFailureOf } from '@/redux/flow_signal'
import {
  AuthnViaApiFlowIndicator,
  AuthnViaDepotFlowError,
  AuthnViaDepotFlowIndicator
} from '@/redux/modules/authn/actions'
import { AuthnViaApi, AuthnViaDepot } from '@/redux/modules/authn/selectors'
import { error } from '@/redux/remote_data'

const INDICATOR_TO_MESSAGE = new Map<AuthnViaApiFlowIndicator | AuthnViaDepotFlowIndicator, string>([
  [AuthnViaApiFlowIndicator.RETRIEVING_PARAMETRIZATION, 'Getting salt'],
  [AuthnViaApiFlowIndicator.COMPUTING_MASTER_KEY_DERIVATIVES, 'Computing keys'],
  [AuthnViaApiFlowIndicator.MAKING_REQUEST, 'Making request'],
  [AuthnViaApiFlowIndicator.DECRYPTING_DATA, 'Decrypting data'],
  [AuthnViaDepotFlowIndicator.COMPUTING_MASTER_KEY_DERIVATIVES, 'Computing keys'],
  [AuthnViaDepotFlowIndicator.DECRYPTING_DATA, 'Decrypting data']
])

interface Mixins {
  reveal: boolean;
  untouchedSinceDispatch: boolean;
  biometricsAvailable: boolean;
  authnViaApi: DeepReadonly<AuthnViaApi>;
  authnViaDepot: DeepReadonly<AuthnViaDepot>;
  indicatorMessage: string | null;
  hasIndicatorMessage: boolean;
}

export default (Vue as VueConstructor<Vue & Mixins>).extend({
  props: [
    'username',
    'password',
    'biometricsAvailable',
    'authnViaApi',
    'authnViaDepot',
    'usernameMatchesDepot'
  ],
  data () {
    return {
      reveal: false,
      untouchedSinceDispatch: false,
      editRequested: false
    }
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
              error(this.authnViaApi as AuthnViaApi),
              option.filter(isFailureOf([
                ServiceLogInResponseError.INVALIDCREDENTIALS,
                ServiceGetSaltResponseError.NOTFOUND
              ]))
            ),
            fn.pipe(
              error(this.authnViaDepot as AuthnViaDepot),
              option.filter(isFailureOf([AuthnViaDepotFlowError.INVALID_CREDENTIALS]))
            )
          ],
          array.findFirst<option.Option<unknown>>(option.isSome),
          option.map(() => !this.untouchedSinceDispatch),
          option.getOrElse<boolean>(() => true)
        )
      }
    },
    credentialsGroup: ['username', 'password']
  },
  computed: {
    biometricsMode (): boolean {
      return this.biometricsAvailable && !this.editRequested
    },
    usernameIsEmpty (): boolean {
      return this.username === ''
    },
    usernameErrors () {
      return {
        [this.$t('USERNAME_IS_REQUIRED') as string]: !this.$v.username.required,
        [this.$t('INVALID_USERNAME_OR_PASSWORD') as string]: !this.$v.forCredentials.valid
      }
    },
    passwordType () {
      return this.reveal ? 'text' : 'password'
    },
    revealIcon () {
      return this.reveal ? 'visibility_off' : 'visibility'
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
        option.flatten,
        option.chain((indicator) => map.lookup(eq.eqStrict)(indicator, INDICATOR_TO_MESSAGE)),
        option.getOrElse<string | null>(() => null)
      )
    },
    hasIndicatorMessage (): boolean {
      return this.indicatorMessage !== null
    }
  },
  methods: {
    requestEdit () {
      this.editRequested = true
    },
    setUsername (value: string) {
      this.$emit('username', value)
      this.untouchedSinceDispatch = false
    },
    setPassword (value: string) {
      this.$emit('password', value)
      this.untouchedSinceDispatch = false
    },
    toggleReveal () {
      this.reveal = !this.reveal
    },
    forget () {
      this.$emit('forget')
    },
    submit () {
      if (this.biometricsMode) {
        this.$emit('trigger-biometrics')
        return
      }
      if (!this.hasIndicatorMessage) {
        this.$v.$touch()
        if (!this.$v.$invalid) {
          this.untouchedSinceDispatch = true
          this.$emit('submit')
        }
      }
    }
  }
})
</script>
