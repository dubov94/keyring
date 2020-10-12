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
    <v-content>
      <v-container fluid>
        <v-layout justify-center mt-5>
          <v-flex xs12 sm6 md4 lg3 xl2>
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
                  <v-stepper-items>
                  </v-stepper-items>
                </v-stepper>
              </v-card-text>
              <v-card-actions>
                <v-btn block color="primary" class="mx-3 mb-2"
                  @click="submit" :loading="inProgress">Activate</v-btn>
              </v-card-actions>
            </v-card>
          </v-flex>
        </v-layout>
      </v-container>
    </v-content>
  </page>
</template>

<script lang="ts">
import Vue, { VueConstructor } from 'vue'
import Page from '@/components/Page.vue'
import { releaseMailToken$, releaseMailTokenProgress$ } from '@/store/root/modules/user/modules/settings'
import { FlowProgressBasicState, FlowProgressErrorType } from '@/store/flow'
import { ServiceReleaseMailTokenResponseError } from '@/api/definitions'
import { act, reset } from '@/store/resettable_action'
import { ReleaseMailTokenProgress, ReleaseMailTokenProgressState } from '@/store/state'
import { Undefinable } from '@/utilities'

interface Mixins {
  code: { frozen: boolean };
}

export default (Vue as VueConstructor<Vue & Mixins>).extend({
  components: {
    page: Page
  },
  data () {
    return {
      ...{
        code: {
          value: '',
          frozen: false
        }
      },
      ...{
        releaseMailTokenProgress: undefined as Undefinable<ReleaseMailTokenProgress>
      }
    }
  },
  subscriptions () {
    return {
      releaseMailTokenProgress: releaseMailTokenProgress$
    }
  },
  validations: {
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
    codeErrors (): { [key: string]: boolean } {
      return {
        [this.$t('INVALID_CODE') as string]: !this.$v.code.valid
      }
    },
    inProgress (): boolean {
      return Object.keys(ReleaseMailTokenProgressState).includes(this.releaseMailTokenProgress?.state || FlowProgressBasicState.IDLE)
    }
  },
  methods: {
    setCode (value: string): void {
      this.code.value = value
      this.code.frozen = false
    },
    submit () {
      if (!this.inProgress) {
        this.$v.$touch()
        if (!this.$v.$invalid) {
          this.code.frozen = true
          releaseMailToken$.next(act({
            code: this.code.value,
            redirect: true
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
    releaseMailToken$.next(reset())
  }
})
</script>
