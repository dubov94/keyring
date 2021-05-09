<style scoped>
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
        <img :src="maybeOtpParams.qrcDataUrl"/>
        <ul>
          <li v-for="(item, index) in maybeOtpParams.scratchCodes" :key="index">
            {{ item }}
          </li>
        </ul>
      </div>
      <div v-else class="text-xs-center">
        <v-btn color="primary" @click="enable" :disabled="!canAccessApi" :loading="inProgress">
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
    inProgress (): boolean {
      return hasIndicator(this.otpParamsGeneration)
    },
    maybeOtpParams (): DeepReadonly<OtpParams> | null {
      return fn.pipe(this.otpParamsGeneration, data, option.toNullable)
    }
  },
  methods: {
    enable () {
      this.dispatch(generateOtpParams())
    }
  },
  beforeDestroy () {
    this.dispatch(otpParamsGenerationReset())
  }
})
</script>
