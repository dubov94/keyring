<template>
  <v-expansion-panel :disabled="!canAccessApi">
    <v-expansion-panel-header>
      Delete account
    </v-expansion-panel-header>
    <v-expansion-panel-content>
      <v-form @keydown.native.enter.prevent="submit">
        <form-text-field type="password" label="Password" prepend-icon="lock"
          :value="password" @input="setPassword" :dirty="$v.password.$dirty" :errors="passwordErrors"
          @touch="$v.password.$touch()" @reset="$v.password.$reset()"></form-text-field>
        <div class="mx-4 mt-4">
          <v-btn block color="error" :loading="inProgress" @click="submit">
            Submit
          </v-btn>
        </div>
      </v-form>
    </v-expansion-panel-content>
  </v-expansion-panel>
</template>

<script lang="ts">
import Vue, { VueConstructor } from 'vue'
import { ServiceDeleteAccountResponseError } from '@/api/definitions'
import { canAccessApi, accountDeletion, AccountDeletion } from '@/redux/modules/user/account/selectors'
import { deleteAccount, accountDeletionReset } from '@/redux/modules/user/account/actions'
import { hasIndicator } from '@/redux/remote_data'
import { DeepReadonly } from 'ts-essentials'
import { remoteDataErrorIndicator } from '@/components/form_validators'

const passwordIncorrectIndicator = remoteDataErrorIndicator(ServiceDeleteAccountResponseError.INVALIDDIGEST)

interface Mixins {
  untouchedSinceDispatch: boolean;
  accountDeletion: DeepReadonly<AccountDeletion>;
}

export default (Vue as VueConstructor<Vue & Mixins>).extend({
  validations: {
    password: {
      correct () {
        return !passwordIncorrectIndicator(this.accountDeletion, this.untouchedSinceDispatch)
      }
    }
  },
  data () {
    return {
      password: '',
      untouchedSinceDispatch: false
    }
  },
  computed: {
    canAccessApi (): boolean {
      return canAccessApi(this.$data.$state)
    },
    accountDeletion (): DeepReadonly<AccountDeletion> {
      return accountDeletion(this.$data.$state)
    },
    inProgress (): boolean {
      return hasIndicator(this.accountDeletion)
    },
    passwordErrors (): { [key: string]: boolean } {
      return {
        [this.$t('INVALID_PASSWORD') as string]: !this.$v.password.correct
      }
    }
  },
  methods: {
    setPassword (value: string) {
      this.password = value
      this.untouchedSinceDispatch = false
    },
    submit () {
      if (!this.inProgress) {
        this.$v.$touch()
        if (!this.$v.$invalid) {
          this.untouchedSinceDispatch = true
          this.dispatch(deleteAccount({
            password: this.password
          }))
        }
      }
    }
  },
  beforeDestroy () {
    this.dispatch(accountDeletionReset())
  }
})
</script>
