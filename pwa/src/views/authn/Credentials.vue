<template>
  <div>
    <div class="pa-4">
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
        <v-switch class="mt-2" hide-details color="primary"
          :input-value="persist" @change="setPersist">
          <template v-slot:label>
            <div class="ml-1">
              <div>Remember me</div>
              <div class="mt-1 text-body-2 text--secondary font-italic">
                Enables offline access and, if applicable,
                <tfa-docs-link>2FA</tfa-docs-link> seamless completion.
              </div>
            </div>
          </template>
        </v-switch>
      </v-form>
    </div>
    <div class="py-2 px-6">
      <v-btn block color="primary" @click="submit" :loading="hasIndicatorMessage">
        <span>Log in</span>
        <template #loader>
          <v-progress-circular indeterminate :size="23" :width="2">
          </v-progress-circular>
          <span class="ml-4">{{ indicatorMessage }}</span>
        </template>
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
import TfaDocsLink from '@/components/TfaDocsLink.vue'
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
  untouchedSinceDispatch: boolean;
  authnViaApi: DeepReadonly<AuthnViaApi>;
  authnViaDepot: DeepReadonly<AuthnViaDepot>;
  indicatorMessage: string | null;
  hasIndicatorMessage: boolean;
}

export default (Vue as VueConstructor<Vue & Mixins>).extend({
  components: {
    tfaDocsLink: TfaDocsLink
  },
  props: [
    'username',
    'password',
    'persist',
    'authnViaApi',
    'authnViaDepot',
    'usernameMatchesDepot'
  ],
  data () {
    return {
      untouchedSinceDispatch: false
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
    usernameIsEmpty (): boolean {
      return this.username === ''
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
    setUsername (value: string) {
      this.$emit('username', value)
      this.untouchedSinceDispatch = false
    },
    setPassword (value: string) {
      this.$emit('password', value)
      this.untouchedSinceDispatch = false
    },
    setPersist (value: boolean) {
      this.$emit('persist', value)
    },
    submit () {
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
