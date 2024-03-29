<style scoped>
  .qrc {
    display: block;
    margin: 0 auto;
    border: 1px dashed #BDBDBD;
    border-radius: 5px;
  }
</style>

<template>
  <v-expansion-panel :disabled="!canAccessApi">
    <v-expansion-panel-header>
      Two-factor authentication
    </v-expansion-panel-header>
    <v-expansion-panel-content>
      <div v-if="isOtpEnabled">
        <p>Enter the second factor to disable.</p>
        <v-form @keydown.native.enter.prevent="deactivate">
          <form-text-field type="text" class="mb-6" solo :invalid="!$v.deactivation.valid"
            :value="deactivation.otp" @input="setDeactivationOtp" :hide-details="true"
            :dirty="$v.deactivation.$dirty" :append-icon="deactivationOtpIcon"
            @touch="$v.deactivation.$touch()" @reset="$v.deactivation.$reset()"></form-text-field>
          <div class="mx-4">
            <v-btn block color="primary" @click="deactivate" :loading="otpResetInProgress">
              Disable
            </v-btn>
          </div>
        </v-form>
      </div>
      <div v-else-if="maybeOtpParams">
        <p>
          Scan the image with
          <external-link href="https://support.google.com/accounts/answer/1066447">Google Authenticator</external-link>
          or a similar application.
        </p>
        <v-tabs v-model="seedView" centered>
          <v-tab>Image</v-tab>
          <v-tab>Text</v-tab>
        </v-tabs>
        <v-tabs-items v-model="seedView" class="py-8">
          <v-tab-item>
            <img class="qrc" :src="maybeOtpParams.qrcDataUrl"/>
          </v-tab-item>
          <v-tab-item>
            <div class="text-h5 text-center">{{ maybeOtpParams.sharedSecret }}</div>
          </v-tab-item>
        </v-tabs-items>
        <p>Print out or save the recovery codes.</p>
        <div>
          <v-chip v-for="(item, index) in maybeOtpParams.scratchCodes" :key="index" class="mb-4 mr-4">
            {{ item }}
          </v-chip>
        </div>
        <p>Enter a one-time six-digit code from the application to confirm.</p>
        <v-form @keydown.native.enter.prevent="activate">
          <form-text-field type="text" class="mb-6" solo :invalid="!$v.activation.valid"
            :value="activation.otp" @input="setActivationOtp" :hide-details="true"
            :dirty="$v.activation.$dirty" :append-icon="activationOtpIcon"
            @touch="$v.activation.$touch()" @reset="$v.activation.$reset()"></form-text-field>
          <div class="mx-4">
            <v-btn block color="primary" @click="activate" :loading="otpParamsAcceptanceInProgress">
              Activate
            </v-btn>
          </div>
        </v-form>
      </div>
      <div v-else>
        <p>
          <external-link href="https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html">Two-factor authentication</external-link> additionally protects your account
          by requesting a time-based smartphone-generated token for each authentication attempt
          unless 'Remember me' is switched on, making the device trusted.
        </p>
        <div class="mx-4">
          <v-btn block color="primary" @click="generate" :loading="otpParamsGenerationInProgress">
            Enable
          </v-btn>
        </div>
      </div>
    </v-expansion-panel-content>
  </v-expansion-panel>
</template>

<script lang="ts">
import { option, function as fn } from 'fp-ts'
import { filter, takeUntil } from 'rxjs/operators'
import { DeepReadonly } from 'ts-essentials'
import Vue, { VueConstructor } from 'vue'
import {
  ServiceAcceptOtpParamsResponseError,
  ServiceResetOtpResponseError
} from '@/api/definitions'
import { remoteDataErrorIndicator } from '@/components/form_validators'
import { isActionSuccess } from '@/redux/flow_signal'
import { showToast } from '@/redux/modules/ui/toast/actions'
import {
  generateOtpParams,
  otpParamsGenerationReset,
  OtpParams,
  acceptOtpParams,
  otpParamsAcceptanceSignal,
  otpParamsAcceptanceReset,
  resetOtp,
  otpResetSignal,
  cancelOtpReset
} from '@/redux/modules/user/account/actions'
import {
  isOtpEnabled,
  canAccessApi,
  OtpParamsGeneration,
  otpParamsGeneration,
  OtpParamsAcceptance,
  otpParamsAcceptance,
  OtpReset,
  otpReset
} from '@/redux/modules/user/account/selectors'
import { hasIndicator, data } from '@/redux/remote_data'

const activationIncorrectValidator = remoteDataErrorIndicator(ServiceAcceptOtpParamsResponseError.INVALIDCODE)
const deactivationIncorrectValidator = remoteDataErrorIndicator(ServiceResetOtpResponseError.INVALIDCODE)

interface Mixins {
  activation: { untouchedSinceDispatch: boolean; otp: string };
  deactivation: { untouchedSinceDispatch: boolean; otp: string };
  otpParamsGeneration: DeepReadonly<OtpParamsGeneration>;
  maybeOtpParams: DeepReadonly<OtpParams> | null;
  otpParamsAcceptance: DeepReadonly<OtpParamsAcceptance>;
  otpParamsAcceptanceInProgress: boolean;
  otpReset: DeepReadonly<OtpReset>;
  otpResetInProgress: boolean;
}

export default (Vue as VueConstructor<Vue & Mixins>).extend({
  data () {
    return {
      seedView: 0,
      activation: {
        otp: '',
        untouchedSinceDispatch: false
      },
      deactivation: {
        otp: '',
        untouchedSinceDispatch: false
      }
    }
  },
  validations: {
    activation: {
      correct () {
        return !activationIncorrectValidator(this.otpParamsAcceptance, this.activation.untouchedSinceDispatch)
      }
    },
    deactivation: {
      correct () {
        return !deactivationIncorrectValidator(this.otpReset, this.deactivation.untouchedSinceDispatch)
      }
    }
  },
  computed: {
    canAccessApi (): boolean {
      return canAccessApi(this.$data.$state)
    },
    isOtpEnabled (): boolean {
      return isOtpEnabled(this.$data.$state)
    },
    otpParamsGeneration (): DeepReadonly<OtpParamsGeneration> {
      return otpParamsGeneration(this.$data.$state)
    },
    otpParamsGenerationInProgress (): boolean {
      return hasIndicator(this.otpParamsGeneration)
    },
    maybeOtpParams (): DeepReadonly<OtpParams> | null {
      return fn.pipe(this.otpParamsGeneration, data, option.toNullable)
    },
    otpParamsAcceptance (): DeepReadonly<OtpParamsAcceptance> {
      return otpParamsAcceptance(this.$data.$state)
    },
    otpParamsAcceptanceInProgress (): boolean {
      return hasIndicator(this.otpParamsAcceptance)
    },
    activationOtpIcon (): string {
      return this.$v.activation.correct ? '' : 'error'
    },
    otpReset (): DeepReadonly<OtpReset> {
      return otpReset(this.$data.$state)
    },
    otpResetInProgress (): boolean {
      return hasIndicator(this.otpReset)
    },
    deactivationOtpIcon (): string {
      return this.$v.deactivation.correct ? '' : 'error'
    }
  },
  created () {
    this.$data.$actions.pipe(
      filter(isActionSuccess(otpParamsAcceptanceSignal)),
      takeUntil(this.$data.$destruction)
    ).subscribe(() => {
      this.activation.otp = ''
      this.activation.untouchedSinceDispatch = false
      this.$v.activation.$reset()
      this.dispatch(otpParamsGenerationReset())
      this.dispatch(otpParamsAcceptanceReset())
      this.dispatch(showToast({ message: this.$t('DONE') as string }))
    })
    this.$data.$actions.pipe(
      filter(isActionSuccess(otpResetSignal)),
      takeUntil(this.$data.$destruction)
    ).subscribe(() => {
      this.deactivation.otp = ''
      this.deactivation.untouchedSinceDispatch = false
      this.$v.deactivation.$reset()
      this.dispatch(cancelOtpReset())
      this.dispatch(showToast({ message: this.$t('DONE') as string }))
    })
  },
  methods: {
    generate () {
      this.dispatch(generateOtpParams())
    },
    setActivationOtp (value: string) {
      this.activation.otp = value
      this.activation.untouchedSinceDispatch = false
    },
    activate () {
      if (!this.otpParamsAcceptanceInProgress) {
        this.$v.activation.$touch()
        if (!this.$v.activation.$invalid) {
          this.activation.untouchedSinceDispatch = true
          if (!this.maybeOtpParams) {
            throw new Error('`otpParamsGeneration` has no data')
          }
          this.dispatch(acceptOtpParams({
            otpParamsId: this.maybeOtpParams.otpParamsId,
            otp: this.activation.otp
          }))
        }
      }
    },
    setDeactivationOtp (value: string) {
      this.deactivation.otp = value
      this.deactivation.untouchedSinceDispatch = false
    },
    deactivate () {
      if (!this.otpResetInProgress) {
        this.$v.deactivation.$touch()
        if (!this.$v.deactivation.$invalid) {
          this.deactivation.untouchedSinceDispatch = true
          this.dispatch(resetOtp({
            otp: this.deactivation.otp
          }))
        }
      }
    }
  },
  beforeDestroy () {
    this.dispatch(otpParamsGenerationReset())
    this.dispatch(otpParamsAcceptanceReset())
    this.dispatch(cancelOtpReset())
  }
})
</script>
