<style scoped>
  .stepper, .stepper__header {
    box-shadow: none;
  }

  .mail-box {
    padding: 16px;
    margin: 0 24px;
    border: 1px solid rgba(0, 0, 0, 0.12);
    border-radius: 16px;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>

<template>
  <v-expansion-panel :disabled="!canAccessApi">
    <v-expansion-panel-header>
      Change e-mail
    </v-expansion-panel-header>
    <v-expansion-panel-content :eager="eagerPanel">
      <template v-if="showAccountMail">
        <div class="mail-box">{{ accountMail }}</div>
      </template>
      <template v-else-if="showAcquisitionMail">
        <div class="mail-box grey--text">{{ acquisitionData.mail }}</div>
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
                color="primary" @click="acquireToken">
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
                color="primary" @click="releaseToken">
                Submit
              </v-btn>
            </div>
          </v-form>
        </v-window-item>
      </v-window>
    </v-expansion-panel-content>
  </v-expansion-panel>
</template>

<script lang="ts">
import { function as fn, option } from 'fp-ts'
import { filter, takeUntil } from 'rxjs/operators'
import { DeepReadonly } from 'ts-essentials'
import Vue, { VueConstructor } from 'vue'
import { email, required } from 'vuelidate/lib/validators'
import { ServiceAcquireMailTokenResponseError, ServiceReleaseMailTokenResponseError } from '@/api/definitions'
import { isActionSuccess } from '@/redux/flow_signal'
import { showToast } from '@/redux/modules/ui/toast/actions'
import {
  acquireMailToken,
  mailTokenAcquisitionReset,
  releaseMailToken,
  mailTokenReleaseReset,
  mailTokenReleaseSignal,
  MailTokenAcquisitionData
} from '@/redux/modules/user/account/actions'
import {
  canAccessApi,
  mailTokenAcquisition,
  MailTokenAcquisition,
  mailTokenRelease,
  MailTokenRelease,
  accountMail
} from '@/redux/modules/user/account/selectors'
import { hasIndicator, hasData, data } from '@/redux/remote_data'
import { remoteDataErrorIndicator } from '@/components/form_validators'

const passwordIncorrectIndicator = remoteDataErrorIndicator(ServiceAcquireMailTokenResponseError.INVALIDDIGEST)
const codeExpiredIndicator = remoteDataErrorIndicator(ServiceReleaseMailTokenResponseError.INVALIDTOKENID)
const codeIncorrectIndicator = remoteDataErrorIndicator(ServiceReleaseMailTokenResponseError.INVALIDCODE)
const codeThrottledValidator = remoteDataErrorIndicator(ServiceReleaseMailTokenResponseError.TOOMANYREQUESTS)

interface Mixins {
  requestGroup: { password: { untouchedSinceDispatch: boolean } };
  code: { untouchedSinceDispatch: boolean };
  mailTokenAcquisition: DeepReadonly<MailTokenAcquisition>;
  mailTokenRelease: DeepReadonly<MailTokenRelease>;
}

export default (Vue as VueConstructor<Vue & Mixins>).extend({
  props: { eagerPanel: { type: Boolean, default: false } },
  data () {
    return {
      requestGroup: {
        mail: '',
        password: {
          value: '',
          untouchedSinceDispatch: false
        }
      },
      code: {
        value: '',
        untouchedSinceDispatch: false
      }
    }
  },
  validations: {
    requestGroup: {
      mail: { email, required },
      password: {
        correct () {
          return !passwordIncorrectIndicator(this.mailTokenAcquisition, this.requestGroup.password.untouchedSinceDispatch)
        }
      }
    },
    code: {
      nonRetryable: {
        notExpired () {
          return !codeExpiredIndicator(this.mailTokenRelease, this.code.untouchedSinceDispatch)
        },
        correct () {
          return !codeIncorrectIndicator(this.mailTokenRelease, this.code.untouchedSinceDispatch)
        }
      },
      notThrottled () {
        return !codeThrottledValidator(this.mailTokenRelease, this.code.untouchedSinceDispatch)
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
      this.requestGroup.password.untouchedSinceDispatch = false
      this.$v.requestGroup.$reset()
      this.dispatch(mailTokenAcquisitionReset())
      // Release.
      this.code.value = ''
      this.code.untouchedSinceDispatch = false
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
    acquisitionData (): MailTokenAcquisitionData | null {
      return fn.pipe(
        data(this.mailTokenAcquisition),
        option.getOrElse<MailTokenAcquisitionData | null>(() => null)
      )
    },
    showAcquisitionMail (): boolean {
      return this.stage === 2 && this.acquisitionData !== null
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
        [this.$t('INVALID_PASSWORD') as string]: !this.$v.requestGroup.password!.correct
      }
    },
    codeErrors (): { [key: string]: boolean } {
      return {
        [this.$t('MAIL_CODE_INCORRECT') as string]: !this.$v.code.nonRetryable!.correct,
        [this.$t('MAIL_TOKEN_EXPIRED') as string]: !this.$v.code.nonRetryable!.notExpired,
        [this.$t('MAIL_TOKEN_THROTTLED') as string]: !this.$v.code.notThrottled
      }
    }
  },
  methods: {
    setPassword (value: string) {
      this.requestGroup.password.value = value
      this.requestGroup.password.untouchedSinceDispatch = false
    },
    setCode (value: string) {
      this.code.value = value
      this.code.untouchedSinceDispatch = false
    },
    acquireToken () {
      if (!this.acquisitionInProgress) {
        this.$v.requestGroup.$touch()
        if (!this.$v.requestGroup.$invalid) {
          this.requestGroup.password.untouchedSinceDispatch = true
          this.dispatch(acquireMailToken({
            mail: this.requestGroup.mail,
            password: this.requestGroup.password.value
          }))
        }
      }
    },
    releaseToken () {
      if (!this.releaseInProgress) {
        this.$v.code.$touch()
        if (!this.$v.code.nonRetryable!.$invalid) {
          this.code.untouchedSinceDispatch = true
          this.dispatch(releaseMailToken({
            tokenId: this.acquisitionData !== null
              ? this.acquisitionData.tokenId
              : '',
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
