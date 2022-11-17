<style scoped>
  .card-text {
    padding: 0;
  }

  .card-text > .stepper {
    box-shadow: none;
    padding-bottom: 0;
  }
</style>

<template>
  <page>
    <v-main>
      <v-container fluid>
        <v-row no-gutters class="mt-12" justify="center">
          <v-col :cols="12" :sm="6" :md="4" :lg="3" :xl="2">
            <v-card>
              <v-card-text class="card-text">
                <v-stepper :value="2" vertical class="stepper">
                  <v-stepper-step :complete="true" :step="1">Register</v-stepper-step>
                  <v-stepper-step :step="2">Activate</v-stepper-step>
                  <v-stepper-content :step="2">
                    <v-form @keydown.native.enter.prevent="submit">
                      <form-text-field type="text" label="Verification code" prepend-icon="verified_user"
                        :value="code.value" @input="setCode"
                        :dirty="$v.code.$dirty" :errors="codeErrors" ref="code"
                        @touch="$v.code.$touch()" @reset="$v.code.$reset()"></form-text-field>
                    </v-form>
                  </v-stepper-content>
                  <v-stepper-step :step="3">Enjoy!</v-stepper-step>
                </v-stepper>
              </v-card-text>
              <v-card-actions class="px-6 pb-4">
                <v-btn block color="primary" @click="submit" :loading="inProgress">
                  Activate
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </page>
</template>

<script lang="ts">
import Vue, { VueConstructor } from 'vue'
import Page from '@/components/Page.vue'
import { ServiceReleaseMailTokenResponseError } from '@/api/definitions'
import { DeepReadonly } from 'ts-essentials'
import { MailTokenRelease, mailTokenRelease, mailVerificationTokenId } from '@/redux/modules/user/account/selectors'
import { isActionSuccess } from '@/redux/flow_signal'
import { releaseMailToken, mailTokenReleaseReset, mailTokenReleaseSignal } from '@/redux/modules/user/account/actions'
import { takeUntil, filter } from 'rxjs/operators'
import { option } from 'fp-ts'
import { remoteDataErrorIndicator } from '@/components/form_validators'

interface Mixins {
  code: { untouchedSinceDispatch: boolean };
  mailTokenRelease: DeepReadonly<MailTokenRelease>;
  mailVerificationTokenId: string;
}

const codeExpiredIndicator = remoteDataErrorIndicator(ServiceReleaseMailTokenResponseError.INVALIDTOKENID)
const codeIncorrectIndicator = remoteDataErrorIndicator(ServiceReleaseMailTokenResponseError.INVALIDCODE)
const codeThrottledIndicator = remoteDataErrorIndicator(ServiceReleaseMailTokenResponseError.TOOMANYREQUESTS)

export default (Vue as VueConstructor<Vue & Mixins>).extend({
  components: {
    page: Page
  },
  data () {
    return {
      code: {
        value: '',
        untouchedSinceDispatch: false
      }
    }
  },
  created () {
    this.$data.$actions.pipe(
      filter(isActionSuccess(mailTokenReleaseSignal)),
      takeUntil(this.$data.$destruction)
    ).subscribe(() => {
      this.$router.push('/dashboard')
    })
  },
  validations: {
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
        return !codeThrottledIndicator(this.mailTokenRelease, this.code.untouchedSinceDispatch)
      }
    }
  },
  computed: {
    mailVerificationTokenId (): string {
      return mailVerificationTokenId(this.$data.$state)
    },
    mailTokenRelease (): DeepReadonly<MailTokenRelease> {
      return mailTokenRelease(this.$data.$state)
    },
    codeErrors (): { [key: string]: boolean } {
      return {
        [this.$t('MAIL_CODE_INCORRECT') as string]: !this.$v.code.nonRetryable!.correct,
        [this.$t('MAIL_TOKEN_EXPIRED') as string]: !this.$v.code.nonRetryable!.notExpired,
        [this.$t('MAIL_TOKEN_THROTTLED') as string]: !this.$v.code.notThrottled
      }
    },
    inProgress (): boolean {
      return option.isSome(this.mailTokenRelease.indicator)
    }
  },
  methods: {
    setCode (value: string) {
      this.code.value = value
      this.code.untouchedSinceDispatch = false
    },
    submit () {
      if (!this.inProgress) {
        this.$v.$touch()
        if (!this.$v.code.nonRetryable!.$invalid) {
          this.code.untouchedSinceDispatch = true
          this.dispatch(releaseMailToken({
            tokenId: this.mailVerificationTokenId,
            code: this.code.value
          }))
        }
      }
    }
  },
  async mounted () {
    await (this as Vue).$nextTick()
    ;(this.$refs.code as HTMLInputElement).focus()
  },
  beforeDestroy () {
    this.dispatch(mailTokenReleaseReset())
  }
})
</script>
