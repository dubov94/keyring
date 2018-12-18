<template>
  <v-card>
    <v-toolbar color="primary" dark>
      <v-toolbar-title>Change password</v-toolbar-title>
    </v-toolbar>
    <v-card-text>
      <v-form ref="form" @keydown.native.enter.prevent="submit">
        <v-text-field v-model="current" label="Current password"
          type="password" :error-messages="currentErrors"
          prepend-icon="lock" @input="$v.current.$reset()"
          @blur="$v.current.$touch()"></v-text-field>
        <v-text-field v-model="renewal" label="New password"
          type="password" :error-messages="renewalErrors"
          prepend-icon="lock_open" @input="$v.renewal.$reset()"
          @blur="$v.renewal.$touch()"></v-text-field>
        <v-text-field v-model="repeat" label="Repeat new password"
          type="password" :error-messages="repeatErrors"
          prepend-icon="repeat" @input="$v.repeat.$reset()"
          @blur="$v.repeat.$touch()"></v-text-field>
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
  import {required, sameAs} from 'vuelidate/lib/validators'

  export default {
    validations: {
      current: {
        valid () {
          return !this.invalidCurrentPasswords.includes(this.current)
        }
      },
      renewal: { required },
      repeat: { sameAs: sameAs('renewal') }
    },
    data () {
      return {
        requestInProgress: false,
        current: '',
        renewal: '',
        repeat: '',
        invalidCurrentPasswords: []
      }
    },
    computed: {
      currentErrors () {
        const errors = []
        if (this.$v.current.$dirty) {
          if (!this.$v.current.valid) {
            errors.push('Invalid current password')
          }
        }
        return errors
      },
      renewalErrors () {
        const errors = []
        if (this.$v.renewal.$dirty) {
          if (!this.$v.renewal.required) {
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
      }
    },
    methods: {
      ...mapActions({
        changeMasterKey: 'changeMasterKey',
        displaySnackbar: 'interface/displaySnackbar'
      }),
      async submit () {
        if (!this.requestInProgress) {
          this.$v.$touch()
          if (!this.$v.$invalid) {
            try {
              this.requestInProgress = true
              let current = this.current
              let error = await this.changeMasterKey({
                current,
                renewal: this.renewal
              })
              if (error === 'NONE') {
                this.current = ''
                this.renewal = ''
                this.repeat = ''
                this.invalidCurrentPasswords = []
                document.activeElement.blur()
                this.$v.$reset()
                this.displaySnackbar({ message: 'Success!', timeout: 1500 })
              } else if (error === 'INVALID_CURRENT_DIGEST') {
                this.invalidCurrentPasswords.push(current)
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
