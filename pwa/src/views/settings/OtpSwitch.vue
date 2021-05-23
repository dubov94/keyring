<style scoped>
  .qrc {
    display: block;
    margin: 0 auto;
    border: 1px dashed #BDBDBD;
    border-radius: 5px;
  }

  .chip {
    margin-bottom: 4px !important;
  }
</style>

<template>
  <v-card>
    <v-toolbar color="primary" dark>
      <v-toolbar-title>Two-factor authentication</v-toolbar-title>
    </v-toolbar>
    <v-card-text>
      <div v-if="isOtpEnabled" class="text-xs-center">
        <v-btn color="primary" :disabled="true">Disable</v-btn>
      </div>
      <div v-else-if="maybeOtpParams">
        <p>
          Scan the image with <a href="https://support.google.com/accounts/answer/1066447" rel="nopener noreferrer">
          Google Authenticator</a> or a similar application.
        </p>
        <img class="qrc mb-3" :src="maybeOtpParams.qrcDataUrl"/>
        <p>Print out or save the recovery codes.</p>
        <div class="mb-3">
          <v-chip v-for="(item, index) in maybeOtpParams.scratchCodes" :key="index" class="mb-3">
            {{ item }}
          </v-chip>
        </div>
        <p>Enter a one-time six-digit code from the application to confirm.</p>
        <v-form @keydown.native.enter.prevent="activate">
          <form-text-field type="text" class="mb-4" solo
            :value="activation.otp" @input="setActivationOtp"
            :dirty="$v.activation.$dirty" :errors="activationOtpErrors"
            @touch="$v.activation.$touch()" @reset="$v.activation.$reset()"></form-text-field>
          <div class="mx-3">
            <v-btn block color="primary" @click="activate" :disabled="!canAccessApi" :loading="otpParamsAcceptanceInProgress">
              Activate
            </v-btn>
          </div>
        </v-form>
      </div>
      <div v-else class="text-xs-center">
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
  otpParamsAcceptance
} from '@/redux/modules/user/account/selectors'
import {
  generateOtpParams,
  otpParamsGenerationReset,
  OtpParams,
  acceptOtpParams,
  otpParamsAcceptanceSignal,
  otpParamsAcceptanceReset
} from '@/redux/modules/user/account/actions'
import { DeepReadonly } from 'ts-essentials'
import { hasIndicator, data, error } from '@/redux/remote_data'
import { option, function as fn } from 'fp-ts'
import { filter, takeUntil } from 'rxjs/operators'
import { isActionSuccess, StandardErrorKind } from '@/redux/flow_signal'
import { ServiceAcceptOtpParamsResponseError } from '@/api/definitions'

interface Mixins {
  activation: { frozen: boolean };
  otpParamsAcceptance: DeepReadonly<OtpParamsAcceptance>;
}

export default (Vue as VueConstructor<Vue & Mixins>).extend({
  data () {
    return {
      activation: {
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
    activationOtpErrors (): { [key: string]: boolean } {
      return {
        [this.$t('INVALID_CODE') as string]: !this.$v.activation.valid
      }
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
    }
  },
  beforeDestroy () {
    this.dispatch(otpParamsGenerationReset())
    this.dispatch(otpParamsAcceptanceReset())
  }
})
</script>
