<style scoped>
  .switch {
    flex: none;
    width: auto;
    margin: 0 0 8px 16px;
  }
</style>

<template>
  <v-card>
    <v-toolbar color="primary" dark>
      <v-toolbar-title>Key Ring</v-toolbar-title>
    </v-toolbar>
    <v-card-text>
      <v-form @keydown.native.enter.prevent="submit">
        <v-layout align-center>
          <v-text-field type="text" prepend-icon="person" label="Username"
            v-model="username" :error-messages="usernameErrors" ref="username"
            @input="$v.$reset()"></v-text-field>
          <v-tooltip bottom>
            <v-switch slot="activator" hide-details color="primary"
              class="switch" v-model="persistanceSwitch"></v-switch>
            <span>Remember</span>
          </v-tooltip>
        </v-layout>
        <v-text-field type="password" prepend-icon="lock" label="Password"
          v-model="password" :error-messages="passwordErrors" ref="password"
          @input="$v.$reset()"></v-text-field>
      </v-form>
    </v-card-text>
    <v-card-actions>
      <v-btn block color="primary" class="mx-4"
        @click="submit" :loading="requestInProgress">Log in</v-btn>
    </v-card-actions>
    <v-layout justify-center py-2>
      <router-link to="/authentication/register">Register</router-link>
    </v-layout>
  </v-card>
</template>

<script>
  import {mapActions} from 'vuex'
  import {required} from 'vuelidate/lib/validators'

  const INVALID_CREDENTIALS_MESSAGE = 'Invalid username or password'

  export default {
    mounted () {
      if (this.username === '') {
        this.$refs.username.focus()
      } else {
        this.$refs.password.focus()
      }
    },
    data () {
      let storageUsername = this.$store.state.preferences.username

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
      pair: {
        fresh () {
          for (let { username, password } of this.invalidPairs) {
            if (this.username === username && this.password === password) {
              return false
            }
          }
          return true
        }
      }
    },
    computed: {
      usernameErrors () {
        const errors = []
        if (this.$v.username.$dirty) {
          if (!this.$v.username.required) {
            errors.push('Username is required')
          }
          if (!this.$v.pair.fresh) {
            errors.push(INVALID_CREDENTIALS_MESSAGE)
          }
        }
        return errors
      },
      passwordErrors () {
        const errors = []
        if (this.$v.password.$dirty) {
          if (!this.$v.pair.fresh) {
            errors.push(INVALID_CREDENTIALS_MESSAGE)
          }
        }
        return errors
      }
    },
    methods: {
      ...mapActions({
        logIn: 'logIn',
        rememberUsername: 'preferences/rememberUsername',
        forgetUsername: 'preferences/forgetUsername',
        displaySnackbar: 'interface/displaySnackbar'
      }),
      async submit () {
        if (!this.requestInProgress) {
          this.$v.$touch()
          if (!this.$v.$invalid) {
            try {
              this.requestInProgress = true
              let [username, password] = [this.username, this.password]
              let { success, challenge } =
                await this.logIn({ username, password })
              if (success) {
                if (this.persistanceSwitch) {
                  this.rememberUsername(username)
                }
                if (challenge === 'ACTIVATE') {
                  this.$router.push('/authentication/activate')
                } else {
                  this.$router.push('/dashboard')
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
        if (value === false) {
          this.forgetUsername()
          this.displaySnackbar({
            message: 'Username is erased',
            timeout: 1500
          })
        }
      }
    }
  }
</script>
