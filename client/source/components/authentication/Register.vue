<template>
  <v-card>
    <v-toolbar color="primary" dark>
      <v-toolbar-title>Key Ring</v-toolbar-title>
    </v-toolbar>
    <v-card-text>
      <v-form>
        <v-text-field type="text" prepend-icon="person" label="Username" autofocus
          v-model="username" :error-messages="usernameErrors"
          @input="$v.username.$reset()" @blur="$v.username.$touch()"></v-text-field>
        <v-text-field type="password" prepend-icon="lock" label="Password"
          v-model="password" :error-messages="passwordErrors"
          @input="$v.password.$reset()" @blur="$v.password.$touch()"></v-text-field>
        <v-text-field type="password" prepend-icon="repeat" label="Repeat password"
          v-model="repeat" :error-messages="repeatErrors"
          @input="$v.repeat.$reset()" @blur="$v.repeat.$touch()"></v-text-field>
        <v-text-field type="email" prepend-icon="email" label="E-mail"
          v-model="mail" :error-messages="mailErrors"
          @input="$v.mail.$reset()" @blur="$v.mail.$touch()"></v-text-field>
      </v-form>
    </v-card-text>
    <v-card-actions>
      <v-btn block color="primary" class="mx-4"
        @click="submit" :loading="requestInProgress">Register</v-btn>
    </v-card-actions>
    <v-layout justify-center py-2>
      <router-link to="/authentication/login">Login</router-link>
    </v-layout>
  </v-card>
</template>

<script>
  import {mapActions} from 'vuex'
  import {email, required, sameAs} from 'vuelidate/lib/validators'

  export default {
    data () {
      return {
        username: '',
        password: '',
        repeat: '',
        mail: '',
        requestInProgress: false,
        takenUserNames: []
      }
    },
    validations: {
      username: {
        required,
        fresh () {
          return !this.takenUserNames.includes(this.username)
        }
      },
      password: { required },
      repeat: { sameAs: sameAs('password') },
      mail: { email, required }
    },
    computed: {
      usernameErrors () {
        const errors = []
        if (this.$v.username.$dirty) {
          if (!this.$v.username.required) {
            errors.push('Username cannot be empty')
          }
          if (!this.$v.username.fresh) {
            errors.push('Username is already taken')
          }
        }
        return errors
      },
      passwordErrors () {
        const errors = []
        if (this.$v.password.$dirty) {
          if (!this.$v.password.required) {
            errors.push('Password cannot be empty')
          }
        }
        return errors
      },
      repeatErrors () {
        const errors = []
        if (this.$v.repeat.$dirty) {
          if (!this.$v.repeat.sameAs) {
            errors.push('Passwords do not match')
          }
        }
        return errors
      },
      mailErrors () {
        const errors = []
        if (this.$v.mail.$dirty) {
          if (!this.$v.mail.required) {
            errors.push('E-mail address is required')
          }
          if (!this.$v.mail.email) {
            errors.push('E-mail address is invalid')
          }
        }
        return errors
      }
    },
    methods: {
      ...mapActions({
        register: 'authentication/register'
      }),
      async submit () {
        this.$v.$touch()
        if (!this.$v.$invalid) {
          try {
            this.requestInProgress = true
            let error = await this.register({
              username: this.username,
              password: this.password,
              mail: this.mail
            })
            if (error === 'NONE') {
              this.$router.push('/authentication/activate')
            } else if (error === 'NAME_TAKEN') {
              this.takenUserNames.push(this.username)
            }
          } finally {
            this.requestInProgress = false
          }
        }
      }
    }
  }
</script>
