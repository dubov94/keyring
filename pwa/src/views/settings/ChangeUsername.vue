<template>
  <v-card>
    <v-toolbar color="primary" dark>
      <v-toolbar-title>Change username</v-toolbar-title>
    </v-toolbar>
    <v-card-text>
      <v-form @keydown.native.enter.prevent="submit">
        <form-text-field type="text" label="New username" prepend-icon="person_outline"
          :value="username" @input="setUsername"
          :dirty="$v.username.$dirty" :errors="usernameErrors"
          @touch="$v.username.$touch()" @reset="$v.username.$reset()"></form-text-field>
        <form-text-field type="password" label="Password" prepend-icon="lock"
          :value="password" @input="setPassword"
          :dirty="$v.password.$dirty" :errors="passwordErrors"
          @touch="$v.password.$touch()" @reset="$v.password.$reset()"></form-text-field>
        <div class="mx-3">
          <v-btn block :loading="inProgress"
            color="primary" @click="submit" :disabled="!canAccessApi">Submit</v-btn>
        </div>
      </v-form>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import Vue, { VueConstructor } from 'vue'
import { required } from 'vuelidate/lib/validators'
import { Undefinable } from '@/utilities'
import { ChangeUsernameProgress, ChangeUsernameProgressState } from '@/store/state'
import { canAccessApi$ } from '@/store/root/modules/user'
import { changeUsername$, changeUsernameProgress$ } from '@/store/root/modules/user/modules/settings'
import { FlowProgressBasicState, FlowProgressErrorType } from '@/store/flow'
import { ServiceChangeUsernameResponseError } from '@/api/definitions'
import { act, reset } from '@/store/resettable_action'

interface Mixins {
  frozen: boolean;
}

export default (Vue as VueConstructor<Vue & Mixins>).extend({
  validations: {
    username: {
      required,
      isAvailable () {
        if (this.changeUsernameProgress?.state === FlowProgressBasicState.ERROR) {
          if (this.changeUsernameProgress?.error.type === FlowProgressErrorType.FAILURE) {
            if (this.changeUsernameProgress?.error.error === ServiceChangeUsernameResponseError.NAMETAKEN) {
              return !this.frozen
            }
          }
        }
        return true
      }
    },
    password: {
      valid () {
        if (this.changeUsernameProgress?.state === FlowProgressBasicState.ERROR) {
          if (this.changeUsernameProgress?.error.type === FlowProgressErrorType.FAILURE) {
            if (this.changeUsernameProgress?.error.error === ServiceChangeUsernameResponseError.INVALIDDIGEST) {
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
        username: '',
        password: '',
        frozen: false
      },
      ...{
        canAccessApi: undefined as Undefinable<boolean>,
        changeUsernameProgress: undefined as Undefinable<ChangeUsernameProgress>
      }
    }
  },
  subscriptions () {
    return {
      canAccessApi: canAccessApi$,
      changeUsernameProgress: changeUsernameProgress$
    }
  },
  computed: {
    inProgress (): boolean {
      return Object.keys(ChangeUsernameProgressState).includes(this.changeUsernameProgress?.state || FlowProgressBasicState.IDLE)
    },
    usernameErrors (): { [key: string]: boolean } {
      return {
        [this.$t('USERNAME_CANNOT_BE_EMPTY') as string]: !this.$v.username.required,
        [this.$t('USERNAME_IS_ALREADY_TAKEN') as string]: !this.$v.username.isAvailable
      }
    },
    passwordErrors (): { [key: string]: boolean } {
      return {
        [this.$t('INVALID_PASSWORD') as string]: !this.$v.password.valid
      }
    }
  },
  methods: {
    setUsername (value: string): void {
      this.username = value
      this.frozen = false
    },
    setPassword (value: string): void {
      this.password = value
      this.frozen = false
    },
    submit (): void {
      if (this.canAccessApi && !this.inProgress) {
        this.$v.$touch()
        if (!this.$v.$invalid) {
          this.frozen = true
          changeUsername$.next(act({
            username: this.username,
            password: this.password
          }))
        }
      }
    }
  },
  watch: {
    changeUsernameProgress (newValue) {
      if (newValue?.state === FlowProgressBasicState.SUCCESS) {
        this.username = ''
        this.password = ''
        this.frozen = false
        this.$v.$reset()
        changeUsername$.next(reset())
        ;(document.activeElement as HTMLInputElement).blur()
      }
    }
  },
  beforeDestroy () {
    changeUsername$.next(reset())
  }
})
</script>
