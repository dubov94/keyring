<template>
  <v-expansion-panel>
    <v-expansion-panel-header>
      Change username
    </v-expansion-panel-header>
    <v-expansion-panel-content>
      <v-form @keydown.native.enter.prevent="submit">
        <form-text-field type="text" label="New username" prepend-icon="person_outline"
          :value="username" @input="setUsername"
          :dirty="$v.username.$dirty" :errors="usernameErrors"
          @touch="$v.username.$touch()" @reset="$v.username.$reset()"></form-text-field>
        <form-text-field type="password" label="Password" prepend-icon="lock"
          :value="password" @input="setPassword"
          :dirty="$v.password.$dirty" :errors="passwordErrors"
          @touch="$v.password.$touch()" @reset="$v.password.$reset()"></form-text-field>
        <div class="mx-4 mt-4">
          <v-btn block color="primary" :loading="inProgress"
            @click="submit" :disabled="!canAccessApi">Submit</v-btn>
        </div>
      </v-form>
    </v-expansion-panel-content>
  </v-expansion-panel>
</template>

<script lang="ts">
import Vue, { VueConstructor } from 'vue'
import { required } from 'vuelidate/lib/validators'
import { ServiceChangeUsernameResponseError } from '@/api/definitions'
import { function as fn, option } from 'fp-ts'
import { StandardErrorKind, isActionSuccess } from '@/redux/flow_signal'
import { UsernameChange, usernameChange, canAccessApi } from '@/redux/modules/user/account/selectors'
import { usernameChangeReset, usernameChangeSignal, changeUsername } from '@/redux/modules/user/account/actions'
import { filter, takeUntil } from 'rxjs/operators'
import { hasIndicator, error } from '@/redux/remote_data'
import { DeepReadonly } from 'ts-essentials'
import { showToast } from '@/redux/modules/ui/toast/actions'

interface Mixins {
  frozen: boolean;
  usernameChange: DeepReadonly<UsernameChange>;
}

export default (Vue as VueConstructor<Vue & Mixins>).extend({
  validations: {
    username: {
      required,
      isAvailable () {
        return fn.pipe(
          error(this.usernameChange),
          option.filter((value) => value.kind === StandardErrorKind.FAILURE &&
            value.value === ServiceChangeUsernameResponseError.NAMETAKEN),
          option.map(() => !this.frozen),
          option.getOrElse<boolean>(() => true)
        )
      }
    },
    password: {
      valid () {
        return fn.pipe(
          error(this.usernameChange),
          option.filter((value) => value.kind === StandardErrorKind.FAILURE &&
            value.value === ServiceChangeUsernameResponseError.INVALIDDIGEST),
          option.map(() => !this.frozen),
          option.getOrElse<boolean>(() => true)
        )
      }
    }
  },
  data () {
    return {
      username: '',
      password: '',
      frozen: false
    }
  },
  created () {
    this.$data.$actions.pipe(
      filter(isActionSuccess(usernameChangeSignal)),
      takeUntil(this.$data.$destruction)
    ).subscribe(() => {
      this.username = ''
      this.password = ''
      this.frozen = false
      this.$v.$reset()
      this.dispatch(usernameChangeReset())
      this.dispatch(showToast({ message: this.$t('DONE') as string }))

      if (document.activeElement !== null) {
        ;(document.activeElement as HTMLInputElement).blur()
      }
    })
  },
  computed: {
    canAccessApi (): boolean {
      return canAccessApi(this.$data.$state)
    },
    usernameChange (): DeepReadonly<UsernameChange> {
      return usernameChange(this.$data.$state)
    },
    inProgress (): boolean {
      return hasIndicator(this.usernameChange)
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
    setUsername (value: string) {
      this.username = value
      this.frozen = false
    },
    setPassword (value: string) {
      this.password = value
      this.frozen = false
    },
    submit () {
      if (this.canAccessApi && !this.inProgress) {
        this.$v.$touch()
        if (!this.$v.$invalid) {
          this.frozen = true
          this.dispatch(changeUsername({
            username: this.username,
            password: this.password
          }))
        }
      }
    }
  },
  beforeDestroy () {
    this.dispatch(usernameChangeReset())
  }
})
</script>
