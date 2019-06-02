<style scoped>
</style>

<template>
  <v-card>
    <v-toolbar color="primary" dark>
      <v-toolbar-title>Key Ring</v-toolbar-title>
    </v-toolbar>
    <v-card-text>
      <v-form @keydown.native.enter.prevent="submit">
        <form-text-field type="text" label="Username" prepend-icon="person"
          v-model="username" :dirty="$v.credentialsGroup.$dirty" :errors="usernameErrors"
          @touch="$v.credentialsGroup.$touch()" @reset="$v.credentialsGroup.$reset()"
          :autofocus="!hasUsername"></form-text-field>
        <form-text-field type="password" label="Password" prepend-icon="lock"
          v-model="password" :dirty="$v.credentialsGroup.$dirty" :errors="passwordErrors"
          @touch="$v.credentialsGroup.$touch()" @reset="$v.credentialsGroup.$reset()"
          :autofocus="hasUsername"></form-text-field>
        <v-switch hide-details color="primary" label="Remember me"
          v-model="persistanceSwitch"></v-switch>
      </v-form>
    </v-card-text>
    <v-card-actions>
      <v-btn block color="primary" class="mx-4"
        @click="submit" :loading="requestInProgress">Log in</v-btn>
    </v-card-actions>
    <v-layout justify-center py-2>
      <router-link to="/register">Register</router-link>
    </v-layout>
  </v-card>
</template>

<script>
  import {mapActions} from 'vuex'
  import {required} from 'vuelidate/lib/validators'

  export default {
    data () {
      let storageUsername = this.$store.state.depot.username

      return {
        username: storageUsername === null ? '' : storageUsername,
        password: '',
        requestInProgress: false,
        invalidPairs: [],
        persistanceSwitch: storageUsername !== null
      }
    },
    validations: {
      username: {
        required
      },
      password: {},
      forCredentials: {
        valid () {
          for (let { username, password } of this.invalidPairs) {
            if (this.username === username && this.password === password) {
              return false
            }
          }
          return true
        }
      },
      credentialsGroup: ['username', 'password']
    },
    computed: {
      hasUsername () {
        return this.username !== ''
      },
      usernameErrors () {
        return {
          [this.$t('USERNAME_IS_REQUIRED')]: !this.$v.username.required,
          [this.$t('INVALID_USERNAME_OR_PASSWORD')]: !this.$v.forCredentials.valid
        }
      },
      passwordErrors () {
        return {
          [this.$t('INVALID_USERNAME_OR_PASSWORD')]: !this.$v.forCredentials.valid
        }
      }
    },
    methods: {
      ...mapActions({
        logIn: 'logIn',
        rememberUsername: 'depot/rememberUsername',
        forgetUsername: 'depot/forgetUsername',
        displaySnackbar: 'interface/displaySnackbar'
      }),
      async submit () {
        if (!this.requestInProgress) {
          this.$v.$touch()
          if (!this.$v.$invalid) {
            try {
              this.requestInProgress = true
              let [username, password] = [this.username, this.password]
              let { success, requirements } =
                await this.logIn({ username, password })
              if (success) {
                if (this.persistanceSwitch) {
                  this.rememberUsername(username)
                }
                if (requirements.length > 0) {
                  this.$router.replace('/set-up')
                } else {
                  this.$router.replace('/dashboard')
                }
              } else {
                this.invalidPairs.push({ username, password })
              }
            } finally {
              this.requestInProgress = false
            }
          }
        }
      }
    },
    watch: {
      persistanceSwitch (value) {
        if (value) {
          this.displaySnackbar({
            message: 'Okay, we will store your data locally after you log in.',
            timeout: 3000
          })
        } else {
          let isUsernameInStore = this.$store.state.depot.username !== null
          this.forgetUsername()
          if (isUsernameInStore !== null) {
            this.displaySnackbar({
              message: 'Alright, we deleted all your data from this device.',
              timeout: 3000
            })
          }
        }
      }
    }
  }
</script>
