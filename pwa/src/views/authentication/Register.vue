<template>
  <v-card>
    <v-toolbar color="primary" dark>
      <v-toolbar-title>Key Ring</v-toolbar-title>
    </v-toolbar>
    <v-card-text>
      <v-form @keydown.native.enter.prevent="submit">
        <form-text-field type="text" label="Username" prepend-icon="person" autofocus
          v-model="username" :dirty="$v.username.$dirty" :errors="usernameErrors"
          @touch="$v.username.$touch()" @reset="$v.username.$reset()">
        </form-text-field>
        <form-text-field type="password" label="Password" prepend-icon="lock"
          v-model="password" :dirty="$v.password.$dirty" :errors="passwordErrors"
          @touch="$v.password.$touch()" @reset="$v.password.$reset()">
        </form-text-field>
        <form-text-field type="password" label="Repeat password" prepend-icon="repeat"
          v-model="repeat" :dirty="$v.repeat.$dirty" :errors="repeatErrors"
          @touch="$v.repeat.$touch()" @reset="$v.repeat.$reset()">
        </form-text-field>
        <form-text-field type="email" label="E-mail" prepend-icon="email"
          v-model="mail" :dirty="$v.mail.$dirty" :errors="mailErrors"
          @touch="$v.mail.$touch()" @reset="$v.mail.$reset()">
        </form-text-field>
      </v-form>
    </v-card-text>
    <v-card-actions>
      <v-btn block color="primary" class="mx-4"
        @click="submit" :loading="requestInProgress">Register</v-btn>
    </v-card-actions>
    <v-layout justify-center py-2>
      <router-link to="/log-in">Log in</router-link>
    </v-layout>
  </v-card>
</template>

<script>
import { mapActions } from 'vuex'
import { email, required, sameAs } from 'vuelidate/lib/validators'

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
      valid () {
        return !this.takenUserNames.includes(this.username)
      }
    },
    password: { required },
    repeat: { sameAs: sameAs('password') },
    mail: { email, required }
  },
  computed: {
    usernameErrors () {
      return {
        [this.$t('USERNAME_CANNOT_BE_EMPTY')]: !this.$v.username.required,
        [this.$t('USERNAME_IS_ALREADY_TAKEN')]: !this.$v.username.valid
      }
    },
    passwordErrors () {
      return {
        [this.$t('PASSWORD_CANNOT_BE_EMPTY')]: !this.$v.password.required
      }
    },
    repeatErrors () {
      return {
        [this.$t('PASSWORDS_DO_NOT_MATCH')]: !this.$v.repeat.sameAs
      }
    },
    mailErrors () {
      return {
        [this.$t('EMAIL_ADDRESS_IS_REQUIRED')]: !this.$v.mail.required,
        [this.$t('EMAIL_ADDRESS_IS_INVALID')]: !this.$v.mail.email
      }
    }
  },
  methods: {
    ...mapActions({
      register: 'register'
    }),
    async submit () {
      if (!this.requestInProgress) {
        this.$v.$touch()
        if (!this.$v.$invalid) {
          try {
            this.requestInProgress = true
            const username = this.username
            const error = await this.register({
              username,
              password: this.password,
              mail: this.mail
            })
            if (error === 'NONE') {
              this.$router.replace('/set-up')
            } else if (error === 'NAME_TAKEN') {
              this.takenUserNames.push(username)
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
