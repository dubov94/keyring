<template>
  <v-expansion-panel :disabled="!canAccessApi">
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
          <v-btn block color="primary" :loading="inProgress" @click="submit">
            Submit
          </v-btn>
        </div>
      </v-form>
    </v-expansion-panel-content>
  </v-expansion-panel>
</template>

<script lang="ts">
import Vue, { VueConstructor } from 'vue'
import { required } from 'vuelidate/lib/validators'
import { ServiceChangeUsernameResponseError } from '@/api/definitions'
import { isActionSuccess } from '@/redux/flow_signal'
import { UsernameChange, usernameChange, canAccessApi } from '@/redux/modules/user/account/selectors'
import { usernameChangeReset, usernameChangeSignal, changeUsername } from '@/redux/modules/user/account/actions'
import { filter, takeUntil } from 'rxjs/operators'
import { hasIndicator } from '@/redux/remote_data'
import { DeepReadonly } from 'ts-essentials'
import { showToast } from '@/redux/modules/ui/toast/actions'
import { remoteDataErrorIndicator, checkUsername } from '@/components/form_validators'

const usernameTakenIndicator = remoteDataErrorIndicator(ServiceChangeUsernameResponseError.NAMETAKEN)
const passwordIncorrectIndicator = remoteDataErrorIndicator(ServiceChangeUsernameResponseError.INVALIDDIGEST)

interface Mixins {
  username: string;
  password: string;
  untouchedSinceDispatch: boolean;
  usernameChange: DeepReadonly<UsernameChange>;
  inProgress: boolean;
}

export default (Vue as VueConstructor<Vue & Mixins>).extend({
  validations: {
    username: {
      required,
      matchesPattern: checkUsername,
      isAvailable () {
        return !usernameTakenIndicator(this.usernameChange, this.untouchedSinceDispatch)
      }
    },
    password: {
      correct () {
        return !passwordIncorrectIndicator(this.usernameChange, this.untouchedSinceDispatch)
      }
    }
  },
  data () {
    return {
      username: '',
      password: '',
      untouchedSinceDispatch: false
    }
  },
  created () {
    this.$data.$actions.pipe(
      filter(isActionSuccess(usernameChangeSignal)),
      takeUntil(this.$data.$destruction)
    ).subscribe(() => {
      this.username = ''
      this.password = ''
      this.untouchedSinceDispatch = false
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
        [this.$t('USERNAME_PATTERN_MISMATCH') as string]: !this.$v.username.matchesPattern,
        [this.$t('USERNAME_IS_ALREADY_TAKEN') as string]: !this.$v.username.isAvailable
      }
    },
    passwordErrors (): { [key: string]: boolean } {
      return {
        [this.$t('INVALID_PASSWORD') as string]: !this.$v.password.correct
      }
    }
  },
  methods: {
    setUsername (value: string) {
      this.username = value
      this.untouchedSinceDispatch = false
    },
    setPassword (value: string) {
      this.password = value
      this.untouchedSinceDispatch = false
    },
    submit () {
      if (!this.inProgress) {
        this.$v.$touch()
        if (!this.$v.$invalid) {
          this.untouchedSinceDispatch = true
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
