<style scoped>
  .stepper, .stepper__header {
    box-shadow: none;
  }
</style>

<template>
  <div>
    <template v-if="showAccountMail">
      <div class="py-4 text-center">{{ accountMail }}</div>
      <v-divider></v-divider>
    </template>
    <template v-if="showAcquisitionMail">
      <div class="py-4 text-center text--secondary">{{ acquisitionMail }}</div>
      <v-divider></v-divider>
    </template>
    <v-window :value="stage" class="pa-4">
      <v-window-item :value="1">
        <v-form @keydown.native.enter.prevent="acquireToken">
          <form-text-field type="text" label="New e-mail" prepend-icon="mail_outline"
            v-model="requestGroup.mail" :dirty="$v.requestGroup.mail.$dirty" :errors="mailErrors"
            @touch="$v.requestGroup.mail.$touch()" @reset="$v.requestGroup.mail.$reset()"></form-text-field>
          <form-text-field type="password" label="Password" prepend-icon="lock"
            :value="requestGroup.password.value" @input="setPassword"
            :dirty="$v.requestGroup.password.$dirty" :errors="passwordErrors"
            @touch="$v.requestGroup.password.$touch()" @reset="$v.requestGroup.password.$reset()"></form-text-field>
          <div class="mx-4 mt-4">
            <v-btn block :loading="acquisitionInProgress"
              color="primary" @click="acquireToken" :disabled="!canAccessApi">
              Next
            </v-btn>
          </div>
        </v-form>
      </v-window-item>
      <v-window-item :value="2">
        <v-form @keydown.native.enter.prevent="releaseToken">
          <form-text-field type="text" label="Verification code" prepend-icon="verified_user"
            :value="code.value" @input="setCode"
            :dirty="$v.code.$dirty" :errors="codeErrors"
            @touch="$v.code.$touch()" @reset="$v.code.$reset()"></form-text-field>
          <div class="mx-4 mt-4">
            <v-btn block :loading="releaseInProgress"
              color="primary" @click="releaseToken" :disabled="!canAccessApi">
              Submit
            </v-btn>
          </div>
        </v-form>
      </v-window-item>
    </v-window>
  </div>
</template>

<script lang="ts">
import Vue, { VueConstructor } from 'vue'
import { email, required } from 'vuelidate/lib/validators'
import { ServiceAcquireMailTokenResponseError, ServiceReleaseMailTokenResponseError } from '@/api/definitions'
import {
  canAccessApi,
  mailTokenAcquisition,
  MailTokenAcquisition,
  mailTokenRelease,
  MailTokenRelease,
  accountMail
} from '@/redux/modules/user/account/selectors'
import { isActionSuccess, StandardErrorKind } from '@/redux/flow_signal'
import { function as fn, option } from 'fp-ts'
import { filter, takeUntil } from 'rxjs/operators'
import { hasIndicator, error, hasData, data } from '@/redux/remote_data'
import {
  acquireMailToken,
  mailTokenAcquisitionReset,
  releaseMailToken,
  mailTokenReleaseReset,
  mailTokenReleaseSignal
} from '@/redux/modules/user/account/actions'
import { DeepReadonly } from 'ts-essentials'
import { showToast } from '@/redux/modules/ui/toast/actions'

interface Mixins {
  requestGroup: { password: { frozen: boolean } };
  code: { frozen: boolean };
  mailTokenAcquisition: DeepReadonly<MailTokenAcquisition>;
  mailTokenRelease: DeepReadonly<MailTokenRelease>;
}

export default (Vue as VueConstructor<Vue & Mixins>).extend({
  data () {
    return {
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
    }
  },
  validations: {
    requestGroup: {
      mail: { email, required },
      password: {
        valid () {
          return fn.pipe(
            error(this.mailTokenAcquisition),
            option.filter((value) => value.kind === StandardErrorKind.FAILURE &&
              value.value === ServiceAcquireMailTokenResponseError.INVALIDDIGEST),
            option.map(() => !this.requestGroup.password.frozen),
            option.getOrElse<boolean>(() => true)
          )
        }
      }
    },
    code: {
      valid () {
        return fn.pipe(
          error(this.mailTokenRelease),
          option.filter((value) => value.kind === StandardErrorKind.FAILURE &&
            value.value === ServiceReleaseMailTokenResponseError.INVALIDCODE),
          option.map(() => !this.code.frozen),
          option.getOrElse<boolean>(() => true)
        )
      }
    }
  },
  created () {
    this.$data.$actions.pipe(
      filter(isActionSuccess(mailTokenReleaseSignal)),
      takeUntil(this.$data.$destruction)
    ).subscribe(() => {
      // Acquisition.
      this.requestGroup.mail = ''
      this.requestGroup.password.value = ''
      this.requestGroup.password.frozen = false
      this.$v.requestGroup.$reset()
      this.dispatch(mailTokenAcquisitionReset())
      // Release.
      this.code.value = ''
      this.code.frozen = false
      this.$v.code.$reset()
      this.dispatch(mailTokenReleaseReset())
      this.dispatch(showToast({ message: this.$t('DONE') as string }))
    })
  },
  computed: {
    canAccessApi (): boolean {
      return canAccessApi(this.$data.$state)
    },
    accountMail (): string | null {
      return accountMail(this.$data.$state)
    },
    showAccountMail (): boolean {
      return this.stage === 1 && this.accountMail !== null
    },
    mailTokenAcquisition (): DeepReadonly<MailTokenAcquisition> {
      return mailTokenAcquisition(this.$data.$state)
    },
    acquisitionMail (): string | null {
      return fn.pipe(
        data(this.mailTokenAcquisition),
        option.getOrElse<string | null>(() => null)
      )
    },
    showAcquisitionMail (): boolean {
      return this.stage === 2 && this.acquisitionMail !== null
    },
    mailTokenRelease (): DeepReadonly<MailTokenRelease> {
      return mailTokenRelease(this.$data.$state)
    },
    acquisitionInProgress (): boolean {
      return hasIndicator(this.mailTokenAcquisition)
    },
    releaseInProgress (): boolean {
      return hasIndicator(this.mailTokenRelease)
    },
    stage (): number {
      let stage = 1
      if (hasData(this.mailTokenAcquisition)) {
        stage += 1
      }
      if (hasData(this.mailTokenRelease)) {
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
    setPassword (value: string) {
      this.requestGroup.password.value = value
      this.requestGroup.password.frozen = false
    },
    setCode (value: string) {
      this.code.value = value
      this.code.frozen = false
    },
    acquireToken () {
      if (this.canAccessApi && !this.acquisitionInProgress) {
        this.$v.requestGroup.$touch()
        if (!this.$v.requestGroup.$invalid) {
          this.requestGroup.password.frozen = true
          this.dispatch(acquireMailToken({
            mail: this.requestGroup.mail,
            password: this.requestGroup.password.value
          }))
        }
      }
    },
    releaseToken () {
      if (this.canAccessApi && !this.releaseInProgress) {
        this.$v.code.$touch()
        if (!this.$v.code.$invalid) {
          this.code.frozen = true
          this.dispatch(releaseMailToken({
            code: this.code.value
          }))
        }
      }
    }
  },
  beforeDestroy () {
    this.dispatch(mailTokenAcquisitionReset())
    this.dispatch(mailTokenReleaseReset())
  }
})
</script>
