<style scoped>
  .card-text {
    padding: 0;
  }

  .stepper, .stepper__header {
    box-shadow: none;
  }
</style>

<template>
  <v-card>
    <v-toolbar color="primary" dark>
      <v-toolbar-title>Change e-mail</v-toolbar-title>
    </v-toolbar>
    <v-card-text class="card-text">
      <v-stepper v-model="stage">
        <v-stepper-header>
          <v-stepper-step :complete="stage > 1" step="1">Form</v-stepper-step>
          <v-divider></v-divider>
          <v-stepper-step :complete="stage > 2" step="2">Code</v-stepper-step>
        </v-stepper-header>
        <v-stepper-items>
          <v-stepper-content step="1" style="padding-top: 0;">
            <v-form @keydown.native.enter.prevent="acquireToken">
              <v-text-field v-model="mail" label="New e-mail"
                type="text" :error-messages="mailErrors"
                prepend-icon="email" @input="$v.mail.$reset()"
                @blur="$v.mail.$touch()"></v-text-field>
              <v-text-field v-model="password" label="Password"
                type="password" :error-messages="passwordErrors"
                prepend-icon="lock" @input="$v.password.$reset()"
                @blur="$v.password.$touch()"></v-text-field>
              <div class="text-xs-right">
                <v-btn class="mr-0" :loading="requestInProgress"
                  color="primary" @click="acquireToken">Next</v-btn>
              </div>
            </v-form>
          </v-stepper-content>
          <v-stepper-content step="2">
            <v-form @keydown.native.enter.prevent="releaseToken">
              <v-text-field v-model="code" label="Code"
                type="text" :error-messages="codeErrors"
                prepend-icon="verified_user" @input="$v.code.$reset()"
                @blur="$v.code.$touch()"></v-text-field>
              <div class="text-xs-right">
                <v-btn class="mr-0" :loading="requestInProgress"
                  color="primary" @click="releaseToken">Submit</v-btn>
              </div>
            </v-form>
          </v-stepper-content>
        </v-stepper-items>
      </v-stepper>
    </v-card-text>
  </v-card>
</template>

<script>
  import {mapActions} from 'vuex'
  import {email, required} from 'vuelidate/lib/validators'

  export default {
    validations: {
      mail: { email, required },
      password: {
        valid () {
          return !this.invalidPasswords.includes(this.password)
        }
      },
      code: {
        valid () {
          return !this.invalidCodes.includes(this.code)
        }
      },
      form: ['mail', 'password']
    },
    data () {
      return {
        stage: 1,
        requestInProgress: false,
        mail: '',
        password: '',
        code: '',
        invalidPasswords: [],
        invalidCodes: []
      }
    },
    computed: {
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
      },
      passwordErrors () {
        const errors = []
        if (this.$v.password.$dirty) {
          if (!this.$v.password.valid) {
            errors.push('Invalid password')
          }
        }
        return errors
      },
      codeErrors () {
        const errors = []
        if (this.$v.code.$dirty) {
          if (!this.$v.code.valid) {
            errors.push('Invalid code')
          }
        }
        return errors
      }
    },
    methods: {
      ...mapActions({
        acquireMailToken: 'acquireMailToken',
        releaseMailToken: 'releaseMailToken',
        displaySnackbar: 'interface/displaySnackbar'
      }),
      async acquireToken () {
        if (!this.requestInProgress) {
          this.$v.form.$touch()
          if (!this.$v.form.$invalid) {
            try {
              this.requestInProgress = true
              let password = this.password
              let error = await this.acquireMailToken({
                mail: this.mail,
                password
              })
              if (error === 'NONE') {
                this.stage += 1
              } else if (error === 'INVALID_DIGEST') {
                this.invalidPasswords.push(password)
              }
            } finally {
              this.requestInProgress = false
            }
          }
        }
      },
      async releaseToken () {
        if (!this.requestInProgress) {
          this.$v.code.$touch()
          if (!this.$v.code.$invalid) {
            try {
              this.requestInProgress = true
              let code = this.code
              let error = await this.releaseMailToken({ code })
              if (error === 'NONE') {
                this.stage = 1
                this.mail = ''
                this.password = ''
                this.code = ''
                this.invalidCodes = []
                this.invalidPasswords = []
                document.activeElement.blur()
                this.$v.$reset()
                this.displaySnackbar({ message: 'Success!', timeout: 1500 })
              } else if (error === 'INVALID_CODE') {
                this.invalidCodes.push(code)
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
    