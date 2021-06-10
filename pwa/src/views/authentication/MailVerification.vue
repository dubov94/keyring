<style scoped>
  .card-text {
    padding: 0;
  }

  .stepper {
    box-shadow: none;
    padding-bottom: 0;
  }
</style>

<template>
  <page>
    <v-main>
      <v-container fluid>
        <v-row justify-center mt-12>
          <v-col xs12 sm6 md4 lg3 xl2>
            <v-card>
              <v-card-text class="card-text">
                <v-stepper :value="2" vertical class="stepper">
                  <v-stepper-step :complete="true" step="1">Register</v-stepper-step>
                  <v-stepper-step step="2">Activate</v-stepper-step>
                  <v-stepper-content step="2">
                    <v-form @keydown.native.enter.prevent="submit">
                      <form-text-field type="text" label="Verification code" prepend-icon="verified_user"
                        :value="code.value" @input="setCode"
                        :dirty="$v.code.$dirty" :errors="codeErrors" ref="code"
                        @touch="$v.code.$touch()" @reset="$v.code.$reset()"></form-text-field>
                    </v-form>
                  </v-stepper-content>
                  <v-stepper-step step="3">Enjoy!</v-stepper-step>
                </v-stepper>
              </v-card-text>
              <v-card-actions>
                <v-btn block color="primary" class="mx-4 mb-2"
                  @click="submit" :loading="inProgress">Activate</v-btn>
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
import { MailTokenRelease, mailTokenRelease } from '@/redux/modules/user/account/selectors'
import { StandardErrorKind, isActionSuccess } from '@/redux/flow_signal'
import { releaseMailToken, mailTokenReleaseReset, mailTokenReleaseSignal } from '@/redux/modules/user/account/actions'
import { takeUntil, filter } from 'rxjs/operators'
import { function as fn, option } from 'fp-ts'
import { error } from '@/redux/remote_data'

interface Mixins {
  code: { frozen: boolean };
  mailTokenRelease: DeepReadonly<MailTokenRelease>;
}

export default (Vue as VueConstructor<Vue & Mixins>).extend({
  components: {
    page: Page
  },
  data () {
    return {
      code: {
        value: '',
        frozen: false
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
  computed: {
    mailTokenRelease (): DeepReadonly<MailTokenRelease> {
      return mailTokenRelease(this.$data.$state)
    },
    codeErrors (): { [key: string]: boolean } {
      return {
        [this.$t('INVALID_CODE') as string]: !this.$v.code.valid
      }
    },
    inProgress (): boolean {
      return option.isSome(this.mailTokenRelease.indicator)
    }
  },
  methods: {
    setCode (value: string) {
      this.code.value = value
      this.code.frozen = false
    },
    submit () {
      if (!this.inProgress) {
        this.$v.$touch()
        if (!this.$v.$invalid) {
          this.code.frozen = true
          this.dispatch(releaseMailToken({
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
