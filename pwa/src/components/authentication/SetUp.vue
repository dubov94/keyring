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
          <v-form @keydown.native.enter.prevent="submit">
            <form-text-field type="text" label="Code" prepend-icon="verified_user"
              v-model="code" :dirty="$v.code.$dirty" :errors="codeErrors" ref="code"
              @touch="$v.code.$touch()" @reset="$v.code.$reset()"></form-text-field>
          </v-form>
        </v-stepper-content>
        <v-stepper-step step="3">Enjoy!</v-stepper-step>
        <v-stepper-items>
        </v-stepper-items>
      </v-stepper>
    </v-card-text>
    <v-card-actions>
      <v-btn block color="primary" class="mx-3 mb-2"
        @click="submit" :loading="requestInProgress">Activate</v-btn>
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
        valid () {
          return !this.invalidCodes.includes(this.code)
        }
      }
    },
    computed: {
      codeErrors () {
        return {
          [this.$t('INVALID_CODE')]: !this.$v.code.valid
        }
      }
    },
    methods: {
      ...mapActions({
        releaseMailToken: 'releaseMailToken'
      }),
      async submit () {
        if (!this.requestInProgress) {
          this.$v.$touch()
          if (!this.$v.$invalid) {
            try {
              this.requestInProgress = true
              let error = await this.releaseMailToken({ code: this.code })
              if (!error) {
                this.$router.replace('/dashboard')
              } else if (error === 'INVALID_CODE') {
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
