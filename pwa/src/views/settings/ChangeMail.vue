<style scoped>
  .card-text {
    padding: 0;
  }

  .stepper, .stepper__header {
    box-shadow: none;
  }
</style>

<template>
  <v-card>
    <v-toolbar color="primary" dark style="z-index: 1;">
      <v-toolbar-title>Change e-mail</v-toolbar-title>
    </v-toolbar>
    <v-card-text class="card-text">
      <v-stepper :value="stage">
        <v-stepper-header>
          <v-stepper-step :complete="stage > 1" step="1">Request</v-stepper-step>
          <v-divider></v-divider>
          <v-stepper-step :complete="stage > 2" step="2">Code</v-stepper-step>
        </v-stepper-header>
        <v-stepper-items>
          <v-stepper-content step="1" style="padding-top: 0;">
            <v-form @keydown.native.enter.prevent="acquireToken">
              <form-text-field type="text" label="New e-mail" prepend-icon="mail_outline"
                v-model="requestGroup.mail" :dirty="$v.requestGroup.mail.$dirty" :errors="mailErrors"
                @touch="$v.requestGroup.mail.$touch()" @reset="$v.requestGroup.mail.$reset()"></form-text-field>
              <form-text-field type="password" label="Password" prepend-icon="lock"
                :value="requestGroup.password.value" @input="setPassword"
                :dirty="$v.requestGroup.password.$dirty" :errors="passwordErrors"
                @touch="$v.requestGroup.password.$touch()" @reset="$v.requestGroup.password.$reset()"></form-text-field>
              <div class="mx-3">
                <v-btn block :loading="acquireInProgress"
                  color="primary" @click="acquireToken" :disabled="!canAccessApi">
                  Next
                </v-btn>
              </div>
            </v-form>
          </v-stepper-content>
          <v-stepper-content step="2">
            <v-form @keydown.native.enter.prevent="releaseToken">
              <form-text-field type="text" label="Code" prepend-icon="verified_user"
                :value="code.value" @input="setCode"
                :dirty="$v.code.$dirty" :errors="codeErrors"
                @touch="$v.code.$touch()" @reset="$v.code.$reset()"></form-text-field>
              <div class="mx-3">
                <v-btn block :loading="releaseInProgress"
                  color="primary" @click="releaseToken" :disabled="!canAccessApi">
                  Submit
                </v-btn>
              </div>
            </v-form>
          </v-stepper-content>
        </v-stepper-items>
      </v-stepper>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import Vue, { VueConstructor } from 'vue'
import { email, required } from 'vuelidate/lib/validators'
import { acquireMailTokenProgress$, releaseMailTokenProgress$, acquireMailToken$, releaseMailToken$ } from '@/store/root/modules/user/modules/settings'
import { Undefinable } from '@/utilities'
import { AcquireMailTokenProgress, AcquireMailTokenProgressState, ReleaseMailTokenProgress, ReleaseMailTokenProgressState } from '@/store/state'
import { FlowProgressBasicState, FlowProgressErrorType } from '@/store/flow'
import { ServiceAcquireMailTokenResponseError, ServiceReleaseMailTokenResponseError } from '@/api/definitions'
import { act, reset } from '@/store/resettable_action'
import { canAccessApi$ } from '@/store/root/modules/user'

const resetMailProgress = () => {
  acquireMailToken$.next(reset())
  releaseMailToken$.next(reset())
}

interface Mixins {
  requestGroup: { password: { frozen: boolean} };
  code: { frozen: boolean };
}

export default (Vue as VueConstructor<Vue & Mixins>).extend({
  data () {
    return {
      ...{
        requestGroup: {
          mail: '',
          password: {
            value: '',
            frozen: false
          }
        },
        code: {
          value: '',
          frozen: false
        }
      },
      ...{
        canAccessApi: undefined as Undefinable<boolean>,
        acquireMailTokenProgress: undefined as Undefinable<AcquireMailTokenProgress>,
        releaseMailTokenProgress: undefined as Undefinable<ReleaseMailTokenProgress>
      }
    }
  },
  subscriptions () {
    return {
      canAccessApi: canAccessApi$,
      acquireMailTokenProgress: acquireMailTokenProgress$,
      releaseMailTokenProgress: releaseMailTokenProgress$
    }
  },
  validations: {
    requestGroup: {
      mail: { email, required },
      password: {
        valid () {
          if (this.acquireMailTokenProgress?.state === FlowProgressBasicState.ERROR) {
            if (this.acquireMailTokenProgress?.error.type === FlowProgressErrorType.FAILURE) {
              if (this.acquireMailTokenProgress?.error.error === ServiceAcquireMailTokenResponseError.INVALIDDIGEST) {
                return !this.requestGroup.password.frozen
              }
            }
          }
          return true
        }
      }
    },
    code: {
      valid () {
        if (this.releaseMailTokenProgress?.state === FlowProgressBasicState.ERROR) {
          if (this.releaseMailTokenProgress?.error.type === FlowProgressErrorType.FAILURE) {
            if (this.releaseMailTokenProgress?.error.error === ServiceReleaseMailTokenResponseError.INVALIDCODE) {
              return !this.code.frozen
            }
          }
        }
        return true
      }
    }
  },
  computed: {
    acquireInProgress (): boolean {
      return Object.keys(AcquireMailTokenProgressState).includes(this.acquireMailTokenProgress?.state || FlowProgressBasicState.IDLE)
    },
    releaseInProgress (): boolean {
      return Object.keys(ReleaseMailTokenProgressState).includes(this.releaseMailTokenProgress?.state || FlowProgressBasicState.IDLE)
    },
    stage (): number {
      let stage = 1
      if (this.acquireMailTokenProgress?.state === FlowProgressBasicState.SUCCESS) {
        stage += 1
      }
      if (this.releaseMailTokenProgress?.state === FlowProgressBasicState.SUCCESS) {
        stage += 1
      }
      return stage
    },
    mailErrors (): { [key: string]: boolean } {
      return {
        [this.$t('EMAIL_ADDRESS_IS_REQUIRED') as string]: !this.$v.requestGroup.mail!.required,
        [this.$t('EMAIL_ADDRESS_IS_INVALID') as string]: !this.$v.requestGroup.mail!.email
      }
    },
    passwordErrors (): { [key: string]: boolean } {
      return {
        [this.$t('INVALID_PASSWORD') as string]: !this.$v.requestGroup.password!.valid
      }
    },
    codeErrors (): { [key: string]: boolean } {
      return {
        [this.$t('INVALID_CODE') as string]: !this.$v.code.valid
      }
    }
  },
  methods: {
    setPassword (value: string): void {
      this.requestGroup.password.value = value
      this.requestGroup.password.frozen = false
    },
    setCode (value: string): void {
      this.code.value = value
      this.code.frozen = false
    },
    acquireToken (): void {
      if (this.canAccessApi && !this.acquireInProgress) {
        this.$v.requestGroup.$touch()
        if (!this.$v.requestGroup.$invalid) {
          this.requestGroup.password.frozen = true
          acquireMailToken$.next(act({
            mail: this.requestGroup.mail,
            password: this.requestGroup.password.value
          }))
        }
      }
    },
    releaseToken (): void {
      if (this.canAccessApi && !this.releaseInProgress) {
        this.$v.code.$touch()
        if (!this.$v.code.$invalid) {
          this.code.frozen = true
          releaseMailToken$.next(act({
            code: this.code.value
          }))
        }
      }
    }
  },
  watch: {
    acquireMailTokenProgress (newValue) {
      if (newValue?.state === FlowProgressBasicState.SUCCESS) {
        this.requestGroup.mail = ''
        this.requestGroup.password.value = ''
        this.requestGroup.password.frozen = false
        this.$v.requestGroup.$reset()
      }
    },
    releaseMailTokenProgress (newValue) {
      if (newValue?.state === FlowProgressBasicState.SUCCESS) {
        this.code.value = ''
        this.code.frozen = false
        this.$v.code.$reset()
        resetMailProgress()
      }
    }
  },
  beforeDestroy () {
    resetMailProgress()
  }
})
</script>
