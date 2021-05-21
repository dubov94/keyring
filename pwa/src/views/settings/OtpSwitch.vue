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
          <form-text-field type="text" class="mb-4" solo v-model="otp"></form-text-field>
          <div class="mx-3">
            <v-btn block color="primary" @click="activate">Activate</v-btn>
          </div>
        </v-form>
      </div>
      <div v-else class="text-xs-center">
        <v-btn color="primary" @click="enable" :disabled="!canAccessApi" :loading="otpGenerationInProgress">
          Enable
        </v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import Vue from 'vue'
import { isOtpEnabled, canAccessApi, OtpParamsGeneration, otpParamsGeneration } from '@/redux/modules/user/account/selectors'
import { generateOtpParams, otpParamsGenerationReset, OtpParams } from '@/redux/modules/user/account/actions'
import { DeepReadonly } from 'ts-essentials'
import { hasIndicator, data } from '@/redux/remote_data'
import { option, function as fn } from 'fp-ts'

export default Vue.extend({
  data () {
    return {
      otp: '',
      frozen: false
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
    otpGenerationInProgress (): boolean {
      return hasIndicator(this.otpParamsGeneration)
    },
    maybeOtpParams (): DeepReadonly<OtpParams> | null {
      return fn.pipe(this.otpParamsGeneration, data, option.toNullable)
    }
  },
  methods: {
    enable () {
      this.dispatch(generateOtpParams())
    },
    activate () {
      console.log('OtpSwitch.activate')
    }
  },
  beforeDestroy () {
    this.dispatch(otpParamsGenerationReset())
  }
})
</script>
