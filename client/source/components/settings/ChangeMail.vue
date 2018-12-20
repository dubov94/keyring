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
    <v-toolbar color="primary" dark style="z-index: 1;">
      <v-toolbar-title>Change e-mail</v-toolbar-title>
    </v-toolbar>
    <v-card-text class="card-text">
      <v-stepper v-model="stage">
        <v-stepper-header>
          <v-stepper-step :complete="stage > 1" step="1">Request</v-stepper-step>
          <v-divider></v-divider>
          <v-stepper-step :complete="stage > 2" step="2">Code</v-stepper-step>
        </v-stepper-header>
        <v-stepper-items>
          <v-stepper-content step="1" style="padding-top: 0;">
            <v-form @keydown.native.enter.prevent="acquireToken">
              <form-text-field type="text" label="New e-mail" prepend-icon="email"
                v-model="mail" :dirty="$v.mail.$dirty" :errors="mailErrors"
                @touch="$v.mail.$touch()" @reset="$v.mail.$reset()"></form-text-field>
              <form-text-field type="password" label="Password" prepend-icon="lock"
                v-model="password" :dirty="$v.password.$dirty" :errors="passwordErrors"
                @touch="$v.password.$touch()" @reset="$v.password.$reset()"></form-text-field>
              <div class="text-xs-right">
                <v-btn class="mr-0" :loading="requestInProgress"
                  color="primary" @click="acquireToken">Next</v-btn>
              </div>
            </v-form>
          </v-stepper-content>
          <v-stepper-content step="2">
            <v-form @keydown.native.enter.prevent="releaseToken">
              <form-text-field type="text" label="Code" prepend-icon="verified_user"
                v-model="code" :dirty="$v.code.$dirty" :errors="codeErrors"
                @touch="$v.code.$touch()" @reset="$v.code.$reset()"></form-text-field>
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
      requestGroup: ['mail', 'password']
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
        return {
          [this.$t('EMAIL_ADDRESS_IS_REQUIRED')]: !this.$v.mail.required,
          [this.$t('EMAIL_ADDRESS_IS_INVALID')]: !this.$v.mail.email
        }
      },
      passwordErrors () {
        return {
          [this.$t('INVALID_PASSWORD')]: !this.$v.password.valid
        }
      },
      codeErrors () {
        return {
          [this.$t('INVALID_CODE')]: !this.$v.code.valid
        }
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
          this.$v.requestGroup.$touch()
          if (!this.$v.requestGroup.$invalid) {
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
                document.activeElement.blur()
                this.$v.$reset()
                this.mail = ''
                this.password = ''
                this.code = ''
                this.invalidCodes = []
                this.invalidPasswords = []
                this.displaySnackbar({
                  message: this.$t('SUCCESS'),
                  timeout: 1500
                })
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
    