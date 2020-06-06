<template>
  <v-card>
    <v-toolbar color="primary" dark>
      <v-toolbar-title>Change username</v-toolbar-title>
    </v-toolbar>
    <v-card-text>
      <v-form @keydown.native.enter.prevent="submit">
        <form-text-field type="text" label="New username" prepend-icon="person_outline"
          v-model="username" :dirty="$v.username.$dirty" :errors="usernameErrors"
          @touch="$v.username.$touch()" @reset="$v.username.$reset()"></form-text-field>
        <form-text-field type="password" label="Password" prepend-icon="lock"
          v-model="password" :dirty="$v.password.$dirty" :errors="passwordErrors"
          @touch="$v.password.$touch()" @reset="$v.password.$reset()"></form-text-field>
        <div class="text-xs-right">
          <v-btn class="mr-0" :loading="requestInProgress"
            color="primary" @click="submit" :disabled="!isOnline">Submit</v-btn>
        </div>
      </v-form>
    </v-card-text>
  </v-card>
</template>

<script>
import { mapActions, mapGetters } from 'vuex'
import { required } from 'vuelidate/lib/validators'
import { getShortHash } from '@/utilities'

export default {
  validations: {
    username: {
      required,
      valid () {
        return !this.takenUserNames.includes(this.username)
      }
    },
    password: {
      async valid () {
        return !this.invalidShortHashes.includes(
          await getShortHash(this.password))
      }
    }
  },
  data () {
    return {
      requestInProgress: false,
      username: '',
      password: '',
      takenUserNames: [],
      invalidShortHashes: []
    }
  },
  computed: {
    ...mapGetters({
      isOnline: 'isOnline'
    }),
    usernameErrors () {
      return {
        [this.$t('USERNAME_CANNOT_BE_EMPTY')]: !this.$v.username.required,
        [this.$t('USERNAME_IS_ALREADY_TAKEN')]: !this.$v.username.valid
      }
    },
    passwordErrors () {
      return {
        [this.$t('INVALID_PASSWORD')]: !this.$v.password.valid
      }
    }
  },
  methods: {
    ...mapActions({
      changeUsername: 'changeUsername',
      displaySnackbar: 'interface/displaySnackbar'
    }),
    async submit () {
      if (this.isOnline && !this.requestInProgress) {
        this.$v.$touch()
        if (!this.$v.$invalid) {
          try {
            this.requestInProgress = true
            const username = this.username
            const password = this.password
            const error = await this.changeUsername({ username, password })
            if (error === 'NONE') {
              document.activeElement.blur()
              this.$v.$reset()
              this.username = ''
              this.password = ''
              this.takenUserNames = []
              this.invalidShortHashes = []
              this.displaySnackbar({
                message: this.$t('SUCCESS'),
                timeout: 1500
              })
            } else if (error === 'NAME_TAKEN') {
              this.takenUserNames.push(username)
            } else if (error === 'INVALID_DIGEST') {
              this.invalidShortHashes.push(
                await getShortHash(password))
            }
          } finally {
            this.requestInProgress = false
          }
        }
      }
    }
  }
}
</script>