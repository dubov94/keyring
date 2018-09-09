<template>
  <v-card>
    <v-toolbar color="primary" dark>
      <v-toolbar-title>Key Ring</v-toolbar-title>
    </v-toolbar>
    <v-card-text>
      <v-form @keydown.native.enter.prevent="submit">
        <v-text-field type="text" prepend-icon="person" label="Username"
          autofocus v-model="username" :error-messages="usernameErrors"
          @input="$v.$reset()" @blur="$v.$touch()"></v-text-field>
        <v-text-field type="password" prepend-icon="lock" label="Password"
          v-model="password" :error-messages="passwordErrors"
          @input="$v.$reset()" @blur="$v.$touch()"></v-text-field>
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

  const INVALID_CREDENTIALS_MESSAGE = 'Invalid username or password!'

  export default {
    data () {
      return {
        username: '',
        password: '',
        requestInProgress: false,
        invalidPairs: []
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
            errors.push('Username is required!')
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
        logIn: 'logIn'
      }),
      async submit () {
        if (!this.requestInProgress) {
          this.$v.$touch()
          if (!this.$v.$invalid) {
            try {
              this.requestInProgress = true
              let { success, challenge } = await this.logIn({
                username: this.username,
                password: this.password
              })
              if (success) {
                if (challenge === 'ACTIVATE') {
                  this.$router.push('/authentication/activate')
                } else {
                  this.$router.push('/dashboard')
                }
              } else {
                this.invalidPairs.push({
                  username: this.username,
                  password: this.password
                })
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
