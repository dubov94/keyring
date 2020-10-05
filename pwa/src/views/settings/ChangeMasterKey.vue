<template>
  <v-card>
    <v-toolbar color="primary" dark>
      <v-toolbar-title>Change password</v-toolbar-title>
    </v-toolbar>
    <v-card-text>
      <v-form @keydown.native.enter.prevent="submit">
        <form-text-field type="password" label="Current password" prepend-icon="lock"
          :value="current" @input="setCurrent"
          :dirty="$v.current.$dirty" :errors="currentErrors"
          @touch="$v.current.$touch()" @reset="$v.current.$reset()"></form-text-field>
        <form-text-field type="password" label="New password" prepend-icon="lock_open"
          :value="renewal" @input="setRenewal"
          :dirty="$v.renewal.$dirty" :errors="renewalErrors"
          @touch="$v.renewal.$touch()" @reset="$v.renewal.$reset()"></form-text-field>
        <form-text-field type="password" label="Repeat new password" prepend-icon="repeat"
          :value="repeat" @input="setRepeat"
          :dirty="$v.repeat.$dirty" :errors="repeatErrors"
          @touch="$v.repeat.$touch()" @reset="$v.repeat.$reset()"></form-text-field>
        <div class="mx-3">
          <v-btn block :loading="hasProgressMessage"
            color="primary" @click="submit" :disabled="!canAccessApi">
            <span>Submit</span>
            <template v-slot:loader>
              <v-progress-circular indeterminate :size="23" :width="2">
              </v-progress-circular>
              <span class="ml-3">{{ progressMessage }}</span>
            </template>
          </v-btn>
        </div>
      </v-form>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import Vue, { VueConstructor } from 'vue'
import { required, sameAs } from 'vuelidate/lib/validators'
import { canAccessApi$ } from '@/store/root/modules/user'
import { changeMasterKeyProgress$, changeMasterKey$ } from '@/store/root/modules/user/modules/settings'
import { Undefinable } from '@/utilities'
import { ChangeMasterKeyProgress, ChangeMasterKeyProgressState } from '@/store/state'
import { FlowProgressBasicState, FlowProgressErrorType } from '@/store/flow'
import { ServiceChangeMasterKeyResponseError } from '@/api/definitions'
import { act, reset } from '@/store/resettable_action'

const STATE_TO_MESSAGE = new Map<FlowProgressBasicState | ChangeMasterKeyProgressState, string>([
  [ChangeMasterKeyProgressState.REENCRYPTING, 'Re-encrypting'],
  [ChangeMasterKeyProgressState.MAKING_REQUEST, 'Making request']
])

interface Mixins {
  frozen: boolean;
}

export default (Vue as VueConstructor<Vue & Mixins>).extend({
  data () {
    return {
      ...{
        current: '',
        renewal: '',
        repeat: '',
        frozen: false
      },
      ...{
        canAccessApi: undefined as Undefinable<boolean>,
        changeMasterKeyProgress: undefined as Undefinable<ChangeMasterKeyProgress>
      }
    }
  },
  subscriptions () {
    return {
      canAccessApi: canAccessApi$,
      changeMasterKeyProgress: changeMasterKeyProgress$
    }
  },
  validations: {
    current: {
      valid () {
        if (this.changeMasterKeyProgress?.state === FlowProgressBasicState.ERROR) {
          if (this.changeMasterKeyProgress?.error.type === FlowProgressErrorType.FAILURE) {
            if (this.changeMasterKeyProgress?.error.error === ServiceChangeMasterKeyResponseError.INVALIDCURRENTDIGEST) {
              return !this.frozen
            }
          }
        }
        return true
      }
    },
    renewal: { required },
    repeat: { sameAs: sameAs('renewal') }
  },
  computed: {
    currentErrors (): { [key: string]: boolean } {
      return {
        [this.$t('INVALID_CURRENT_PASSWORD') as string]: !this.$v.current.valid
      }
    },
    renewalErrors (): { [key: string]: boolean } {
      return {
        [this.$t('PASSWORD_CANNOT_BE_EMPTY') as string]: !this.$v.renewal.required
      }
    },
    repeatErrors (): { [key: string]: boolean } {
      return {
        [this.$t('PASSWORDS_DO_NOT_MATCH') as string]: !this.$v.repeat.sameAs
      }
    },
    progressMessage (): string | null {
      return STATE_TO_MESSAGE.get(this.changeMasterKeyProgress?.state || FlowProgressBasicState.IDLE) || null
    },
    hasProgressMessage (): boolean {
      return this.progressMessage !== null
    }
  },
  methods: {
    setCurrent (value: string): void {
      this.current = value
      this.frozen = false
    },
    setRenewal (value: string): void {
      this.renewal = value
      this.frozen = false
    },
    setRepeat (value: string): void {
      this.repeat = value
      this.frozen = false
    },
    submit (): void {
      if (this.canAccessApi && !this.hasProgressMessage) {
        this.$v.$touch()
        if (!this.$v.$invalid) {
          this.frozen = true
          changeMasterKey$.next(act({
            current: this.current,
            renewal: this.renewal
          }))
        }
      }
    }
  },
  watch: {
    changeMasterKeyProgress (newValue) {
      if (newValue?.state === FlowProgressBasicState.SUCCESS) {
        this.current = ''
        this.renewal = ''
        this.repeat = ''
        this.frozen = false
        this.$v.$reset()
        changeMasterKey$.next(reset())
        ;(document.activeElement as HTMLInputElement).blur()
      }
    }
  },
  beforeDestroy () {
    changeMasterKey$.next(reset())
  }
})
</script>
