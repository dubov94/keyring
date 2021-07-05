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
        <div class="mx-4 mt-4">
          <v-btn block color="error" :loading="inProgress"
            @click="submit" :disabled="!canAccessApi">Submit</v-btn>
        </div>
      </v-form>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import Vue, { VueConstructor } from 'vue'
import { ServiceDeleteAccountResponseError } from '@/api/definitions'
import { function as fn, option } from 'fp-ts'
import { StandardErrorKind } from '@/redux/flow_signal'
import { canAccessApi, accountDeletion, AccountDeletion } from '@/redux/modules/user/account/selectors'
import { deleteAccount, accountDeletionReset } from '@/redux/modules/user/account/actions'
import { hasIndicator, error } from '@/redux/remote_data'
import { DeepReadonly } from 'ts-essentials'

interface Mixins {
  frozen: boolean;
  accountDeletion: DeepReadonly<AccountDeletion>;
}

export default (Vue as VueConstructor<Vue & Mixins>).extend({
  validations: {
    password: {
      valid () {
        return fn.pipe(
          error(this.accountDeletion),
          option.filter((value) => value.kind === StandardErrorKind.FAILURE &&
            value.value === ServiceDeleteAccountResponseError.INVALIDDIGEST),
          option.map(() => !this.frozen),
          option.getOrElse<boolean>(() => true)
        )
      }
    }
  },
  data () {
    return {
      password: '',
      frozen: false
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
        [this.$t('INVALID_PASSWORD') as string]: !this.$v.password.valid
      }
    }
  },
  methods: {
    setPassword (value: string) {
      this.password = value
      this.frozen = false
    },
    submit () {
      if (this.canAccessApi && !this.inProgress) {
        this.$v.$touch()
        if (!this.$v.$invalid) {
          this.frozen = true
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
