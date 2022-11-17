<template>
  <div>
    <div class="pa-4">
      <v-form @keydown.native.enter.prevent="submit">
        <form-text-field type="text" label="Second factor" prepend-icon="security"
          autofocus :value="otp" @input="setOtp"
          :dirty="$v.otp.$dirty" :errors="otpErrors"
          @touch="$v.otp.$touch()" @reset="$v.otp.$reset()">
        </form-text-field>
      </v-form>
    </div>
    <div class="py-2 px-6">
      <v-btn block color="primary" @click="submit" :loading="hasIndicatorMessage">
        <span>Proceed</span>
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
import { eq, function as fn, map, option } from 'fp-ts'
import { DeepReadonly } from 'ts-essentials'
import Vue, { VueConstructor } from 'vue'
import { ServiceProvideOtpResponseError } from '@/api/definitions'
import { AuthnOtpProvisionFlowIndicator } from '@/redux/modules/authn/actions'
import { AuthnOtpProvision } from '@/redux/modules/authn/selectors'
import { remoteDataErrorIndicator } from '@/components/form_validators'

const otpIncorrectIndicator = remoteDataErrorIndicator(ServiceProvideOtpResponseError.INVALIDCODE)
const otpMustRecoverIndicator = remoteDataErrorIndicator(ServiceProvideOtpResponseError.ATTEMPTSEXHAUSTED)

const INDICATOR_TO_MESSAGE = new Map<AuthnOtpProvisionFlowIndicator, string>([
  [AuthnOtpProvisionFlowIndicator.MAKING_REQUEST, 'Making request'],
  [AuthnOtpProvisionFlowIndicator.DECRYPTING_DATA, 'Decrypting data']
])

interface Mixins {
  untouchedSinceDispatch: boolean;
  authnOtpProvision: DeepReadonly<AuthnOtpProvision>;
}

export default (Vue as VueConstructor<Vue & Mixins>).extend({
  props: ['otp', 'authnOtpProvision'],
  data () {
    return {
      untouchedSinceDispatch: false
    }
  },
  validations: {
    otp: {
      correct () {
        return !otpIncorrectIndicator(this.authnOtpProvision, this.untouchedSinceDispatch)
      },
      lenient () {
        return !otpMustRecoverIndicator(this.authnOtpProvision, this.untouchedSinceDispatch)
      }
    }
  },
  computed: {
    otpErrors () {
      return {
        [this.$t('INVALID_CODE') as string]: !this.$v.otp.correct,
        [this.$t('OTP_ATTEMPTS_EXHAUSTED') as string]: !this.$v.otp.lenient
      }
    },
    indicatorMessage (): string | null {
      return fn.pipe(
        this.authnOtpProvision.indicator,
        option.chain((indicator) => map.lookup(eq.eqStrict)(indicator, INDICATOR_TO_MESSAGE)),
        option.getOrElse<string | null>(() => null)
      )
    },
    hasIndicatorMessage (): boolean {
      return this.indicatorMessage !== null
    }
  },
  methods: {
    setOtp (value: string) {
      this.$emit('otp', value)
      this.untouchedSinceDispatch = false
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
