<template>
  <v-card>
    <v-toolbar color="primary" dark>
      <v-toolbar-title>Change password</v-toolbar-title>
    </v-toolbar>
    <v-card-text>
      <v-form @keydown.native.enter.prevent="submit">
        <form-text-field type="password" label="Current password" prepend-icon="lock"
          v-model="current" :dirty="$v.current.$dirty" :errors="currentErrors"
          @touch="$v.current.$touch()" @reset="$v.current.$reset()"></form-text-field>
        <form-text-field type="password" label="New password" prepend-icon="lock_open"
          v-model="renewal" :dirty="$v.renewal.$dirty" :errors="renewalErrors"
          @touch="$v.renewal.$touch()" @reset="$v.renewal.$reset()"></form-text-field>
        <form-text-field type="password" label="Repeat new password" prepend-icon="repeat"
          v-model="repeat" :dirty="$v.repeat.$dirty" :errors="repeatErrors"
          @touch="$v.repeat.$touch()" @reset="$v.repeat.$reset()"></form-text-field>
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
        return {
          'Invalid current password': !this.$v.current.valid
        }
      },
      renewalErrors () {
        return {
          'Password cannot be empty': !this.$v.renewal.required
        }
      },
      repeatErrors () {
        return {
          'Passwords do not match': !this.$v.repeat.sameAs
        }
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
                document.activeElement.blur()
                this.$v.$reset()
                this.current = ''
                this.renewal = ''
                this.repeat = ''
                this.invalidCurrentPasswords = []
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
