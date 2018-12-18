<template>
  <v-card>
    <v-toolbar color="primary" dark>
      <v-toolbar-title>Change username</v-toolbar-title>
    </v-toolbar>
    <v-card-text>
      <v-form ref="form" @keydown.native.enter.prevent="submit">
        <v-text-field v-model="username" label="New username"
          type="text" :error-messages="usernameErrors"
          prepend-icon="person_outline" @input="$v.username.$reset()"
          @blur="$v.username.$touch()"></v-text-field>
        <v-text-field v-model="password" label="Password"
          type="password" :error-messages="passwordErrors"
          prepend-icon="lock" @input="$v.password.$reset()"
          @blur="$v.password.$touch()"></v-text-field>
        <div class="text-xs-right">
          <v-btn class="mr-0" :loading="requestInProgress"
            color="primary" @click="submit">Submit</v-btn>
        </div>
      </v-form>
    </v-card-text>
  </v-card>
</template>

<script>
  import {mapActions} from 'vuex'
  import {required} from 'vuelidate/lib/validators'

  export default {
    validations: {
      username: {
        required,
        fresh () {
          return !this.takenUserNames.includes(this.username)
        }
      },
      password: {
        valid () {
          return !this.invalidPasswords.includes(this.password)
        }
      }
    },
    data () {
      return {
        requestInProgress: false,
        username: '',
        password: '',
        takenUserNames: [],
        invalidPasswords: []
      }
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
          if (!this.$v.password.valid) {
            errors.push('Invalid current password')
          }
        }
        return errors
      }
    },
    methods: {
      ...mapActions({
        changeUsername: 'changeUsername',
        displaySnackbar: 'interface/displaySnackbar'
      }),
      async submit () {
        if (!this.requestInProgress) {
          this.$v.$touch()
          if (!this.$v.$invalid) {
            try {
              this.requestInProgress = true
              let username = this.username
              let password = this.password
              let error = await this.changeUsername({ username, password })
              if (error === 'NONE') {
                this.username = ''
                this.password = ''
                this.takenUserNames = []
                this.invalidPasswords = []
                document.activeElement.blur()
                this.$v.$reset()
                this.displaySnackbar({ message: 'Success!', timeout: 1500 })
              } else if (error === 'NAME_TAKEN') {
                this.takenUserNames.push(username)
              } else if (error === 'INVALID_DIGEST') {
                this.invalidPasswords.push(password)
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
  