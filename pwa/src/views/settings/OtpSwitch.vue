<style scoped>
  .qrc {
    display: block;
    margin: 0 auto;
    border: 1px dashed #BDBDBD;
    border-radius: 5px;
  }
</style>

<template>
  <v-card>
    <v-toolbar color="primary" dark>
      <v-toolbar-title>Two-factor authentication</v-toolbar-title>
    </v-toolbar>
    <v-card-text>
      <div v-if="isOtpEnabled">
        <p class="text-center">Enter a one-time / recovery code to disable.</p>
        <v-form @keydown.native.enter.prevent="deactivate">
          <form-text-field type="text" class="mb-6" solo :invalid="!$v.deactivation.valid"
            :value="deactivation.otp" @input="setDeactivationOtp" :hide-details="true"
            :dirty="$v.deactivation.$dirty" :append-icon="deactivationOtpIcon"
            @touch="$v.deactivation.$touch()" @reset="$v.deactivation.$reset()"></form-text-field>
          <div class="mx-4">
            <v-btn block color="primary" @click="deactivate" :disabled="!canAccessApi" :loading="otpResetInProgress">
              Disable
            </v-btn>
          </div>
        </v-form>
      </div>
      <div v-else-if="maybeOtpParams">
        <p>
          Scan the image with <a href="https://support.google.com/accounts/answer/1066447" rel="nopener noreferrer">
          Google Authenticator</a> or a similar application.
        </p>
        <img class="qrc mb-4" :src="maybeOtpParams.qrcDataUrl"/>
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
            <v-btn block color="primary" @click="activate" :disabled="!canAccessApi" :loading="otpParamsAcceptanceInProgress">
              Activate
            </v-btn>
          </div>
        </v-form>
      </div>
      <div v-else class="text-center">
        <v-btn color="primary" @click="generate" :disabled="!canAccessApi" :loading="otpParamsGenerationInProgress">
          Enable
        </v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import Vue, { VueConstructor } from 'vue'
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
import { DeepReadonly } from 'ts-essentials'
import { hasIndicator, data, error } from '@/redux/remote_data'
import { option, function as fn } from 'fp-ts'
import { filter, takeUntil } from 'rxjs/operators'
import { isActionSuccess, StandardErrorKind } from '@/redux/flow_signal'
import {
  ServiceAcceptOtpParamsResponseError,
  ServiceResetOtpResponseError
} from '@/api/definitions'

interface Mixins {
  activation: { frozen: boolean };
  deactivation: { frozen: boolean };
  otpParamsAcceptance: DeepReadonly<OtpParamsAcceptance>;
  otpReset: DeepReadonly<OtpReset>;
}

export default (Vue as VueConstructor<Vue & Mixins>).extend({
  data () {
    return {
      activation: {
        otp: '',
        frozen: false
      },
      deactivation: {
        otp: '',
        frozen: false
      }
    }
  },
  validations: {
    activation: {
      valid () {
        return fn.pipe(
          error(this.otpParamsAcceptance),
          option.filter((value) => value.kind === StandardErrorKind.FAILURE &&
            value.value === ServiceAcceptOtpParamsResponseError.INVALIDCODE),
          option.map(() => !this.activation.frozen),
          option.getOrElse<boolean>(() => true)
        )
      }
    },
    deactivation: {
      valid () {
        return fn.pipe(
          error(this.otpReset),
          option.filter((value) => value.kind === StandardErrorKind.FAILURE &&
            value.value === ServiceResetOtpResponseError.INVALIDCODE),
          option.map(() => !this.deactivation.frozen),
          option.getOrElse<boolean>(() => true)
        )
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
      return this.$v.activation.valid ? '' : 'error'
    },
    otpReset (): DeepReadonly<OtpReset> {
      return otpReset(this.$data.$state)
    },
    otpResetInProgress (): boolean {
      return hasIndicator(this.otpReset)
    },
    deactivationOtpIcon (): string {
      return this.$v.deactivation.valid ? '' : 'error'
    }
  },
  created () {
    this.$data.$actions.pipe(
      filter(isActionSuccess(otpParamsAcceptanceSignal)),
      takeUntil(this.$data.$destruction)
    ).subscribe(() => {
      this.activation.otp = ''
      this.activation.frozen = false
      this.$v.activation.$reset()
      this.dispatch(otpParamsGenerationReset())
      this.dispatch(otpParamsAcceptanceReset())
    })
    this.$data.$actions.pipe(
      filter(isActionSuccess(otpResetSignal)),
      takeUntil(this.$data.$destruction)
    ).subscribe(() => {
      this.deactivation.otp = ''
      this.deactivation.frozen = false
      this.$v.deactivation.$reset()
      this.dispatch(cancelOtpReset())
    })
  },
  methods: {
    generate () {
      this.dispatch(generateOtpParams())
    },
    setActivationOtp (value: string) {
      this.activation.otp = value
      this.activation.frozen = false
    },
    activate () {
      if (this.canAccessApi && !this.otpParamsAcceptanceInProgress) {
        this.$v.activation.$touch()
        if (!this.$v.activation.$invalid) {
          this.activation.frozen = true
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
      this.deactivation.frozen = false
    },
    deactivate () {
      if (this.canAccessApi && !this.otpResetInProgress) {
        this.$v.deactivation.$touch()
        if (!this.$v.deactivation.$invalid) {
          this.deactivation.frozen = true
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
