<style scoped>
  .card-text {
    padding: 0;
  }

  .stepper {
    box-shadow: none;
    padding-bottom: 0;
  }
</style>

<template>
  <v-card>
    <v-toolbar color="primary" dark>
      <v-toolbar-title>Key Ring</v-toolbar-title>
    </v-toolbar>
    <v-card-text class="card-text">
      <v-stepper :value="2" vertical class="stepper">
        <v-stepper-step :complete="true" step="1">Register</v-stepper-step>
        <v-stepper-step step="2">Activate</v-stepper-step>
        <v-stepper-content step="2">
          <v-form @keydown.native.enter="submit">
            <v-text-field type="text" prepend-icon="verified_user" label="Code"
              v-model="code" :error-messages="codeErrors" ref="code"
              @input="$v.code.$reset()" @blur="$v.code.$touch()"></v-text-field>
          </v-form>
        </v-stepper-content>
        <v-stepper-step step="3">Enjoy!</v-stepper-step>
        <v-stepper-items>
        </v-stepper-items>
      </v-stepper>
    </v-card-text>
    <v-card-actions>
      <v-btn block color="primary"
        @click="submit" :loading="requestInProgress" class="mx-3 mb-2">Activate</v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
  import {mapActions} from 'vuex'

  export default {
    data () {
      return {
        code: '',
        requestInProgress: false,
        invalidCodes: []
      }
    },
    async mounted () {
      await this.$nextTick()
      this.$refs.code.focus()
    },
    validations: {
      code: {
        fresh () {
          return !this.invalidCodes.includes(this.code)
        }
      }
    },
    computed: {
      codeErrors () {
        const errors = []
        if (this.$v.code.$dirty) {
          if (!this.$v.code.fresh) {
            errors.push('Invalid code')
          }
        }
        return errors
      }
    },
    methods: {
      ...mapActions({
        activate: 'authentication/activate'
      }),
      async submit () {
        if (!this.requestInProgress) {
          this.$v.$touch()
          if (!this.$v.$invalid) {
            try {
              this.requestInProgress = true
              let error = await this.activate({ code: this.code })
              if (error === 'NONE') {
                this.$router.push('/')
              } else if (error === 'CODE_MISMATCH') {
                this.invalidCodes.push(this.code)
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
