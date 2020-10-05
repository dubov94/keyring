<template>
  <v-card>
    <v-toolbar color="error" dark>
      <v-toolbar-title>Delete account</v-toolbar-title>
    </v-toolbar>
    <v-card-text>
      <v-form @keydown.native.enter.prevent="submit">
        <form-text-field type="password" label="Password" prepend-icon="lock"
          :value="password" @input="setPassword" :dirty="$v.password.$dirty" :errors="passwordErrors"
          @touch="$v.password.$touch()" @reset="$v.password.$reset()"></form-text-field>
        <div class="mx-3">
          <v-btn block :loading="inProgress"
            color="error" @click="submit" :disabled="!canAccessApi">Submit</v-btn>
        </div>
      </v-form>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import Vue, { VueConstructor } from 'vue'
import { act, reset } from '@/store/resettable_action'
import { ServiceDeleteAccountResponseError } from '@/api/definitions'
import { deleteAccount$, deleteAccountProgress$ } from '@/store/root/modules/user/modules/settings'
import { FlowProgressBasicState, FlowProgressErrorType } from '@/store/flow'
import { canAccessApi$ } from '@/store/root/modules/user'
import { Undefinable } from '@/utilities'
import { DeleteAccountProgress, DeleteAccountProgressState } from '@/store/state'

interface Mixins {
  frozen: boolean;
}

export default (Vue as VueConstructor<Vue & Mixins>).extend({
  validations: {
    password: {
      valid () {
        if (this.deleteAccountProgress?.state === FlowProgressBasicState.ERROR) {
          if (this.deleteAccountProgress?.error.type === FlowProgressErrorType.FAILURE) {
            if (this.deleteAccountProgress?.error.error === ServiceDeleteAccountResponseError.INVALIDDIGEST) {
              return !this.frozen
            }
          }
        }
        return true
      }
    }
  },
  data () {
    return {
      ...{
        password: '',
        frozen: false
      },
      ...{
        canAccessApi: undefined as Undefinable<boolean>,
        deleteAccountProgress: undefined as Undefinable<DeleteAccountProgress>
      }
    }
  },
  subscriptions () {
    return {
      canAccessApi: canAccessApi$,
      deleteAccountProgress: deleteAccountProgress$
    }
  },
  computed: {
    inProgress (): boolean {
      return Object.keys(DeleteAccountProgressState).includes(this.deleteAccountProgress?.state || FlowProgressBasicState.IDLE)
    },
    passwordErrors () {
      return {
        [this.$t('INVALID_PASSWORD') as string]: !this.$v.password.valid
      }
    }
  },
  methods: {
    setPassword (value: string): void {
      this.password = value
      this.frozen = false
    },
    submit (): void {
      if (this.canAccessApi && !this.inProgress) {
        this.$v.$touch()
        if (!this.$v.$invalid) {
          this.frozen = true
          deleteAccount$.next(act({
            password: this.password
          }))
        }
      }
    }
  },
  beforeDestroy () {
    deleteAccount$.next(reset())
  }
})
</script>
