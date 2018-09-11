<style scoped>
  .card__title {
    padding-bottom: 0;
  }
</style>

<template>
  <page>
    <v-toolbar app clipped-left prominent color="primary" dark>
      <v-btn icon @click="$router.go(-1)">
        <v-icon>arrow_back</v-icon>
      </v-btn>
      <v-toolbar-title>
        Key Ring
      </v-toolbar-title>
    </v-toolbar>
    <v-content>
      <v-container fluid>
        <v-layout justify-center>
          <v-flex xs12 sm8 md6 lg4 xl3>
            <v-card class="mt-4">
              <v-card-title>
                <h2 class="headline">Change password</h2>  
              </v-card-title>
              <v-card-text>
                <v-form ref="form" @keydown.native.enter.prevent="submit">
                  <v-text-field v-model="current" label="Current"
                    type="password" :error-messages="currentErrors"
                    @input="$v.current.$reset()"
                    @blur="$v.current.$touch()"></v-text-field>
                  <v-text-field v-model="renewal" label="Renewal"
                    type="password" :error-messages="renewalErrors"
                    @input="$v.renewal.$reset()"
                    @blur="$v.renewal.$touch()"></v-text-field>
                  <v-text-field v-model="repeat" label="Repeat"
                    type="password" :error-messages="repeatErrors"
                    @input="$v.repeat.$reset()"
                    @blur="$v.repeat.$touch()"></v-text-field>
                  <div class="text-xs-right">
                    <v-btn class="mr-0" :loading="requestInProgress"
                      color="error" @click="submit">Submit</v-btn>
                  </div>
                </v-form>
              </v-card-text>
            </v-card>
          </v-flex>
        </v-layout>
      </v-container>
    </v-content>
  </page>
</template>

<script>
  import Page from './Page'
  import {mapActions} from 'vuex'
  import {required, sameAs} from 'vuelidate/lib/validators'

  export default {
    components: {
      page: Page
    },
    validations: {
      current: {
        valid () {
          return !this.invalid.includes(this.current)
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
        invalid: []
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
                this.invalid.length = 0
                document.activeElement.blur()
                this.$v.$reset()
                this.displaySnackbar({ message: 'Success!', timeout: 1500 })
              } else if (error === 'INVALID_CURRENT_DIGEST') {
                this.invalid.push(current)
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
