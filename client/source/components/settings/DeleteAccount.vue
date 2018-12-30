<template>
  <v-card>
    <v-toolbar color="error" dark>
      <v-toolbar-title>Delete account</v-toolbar-title>
    </v-toolbar>
    <v-card-text>
      <v-form @keydown.native.enter.prevent="submit">
        <form-text-field type="password" label="Password" prepend-icon="lock"
          v-model="password" :dirty="$v.password.$dirty" :errors="passwordErrors"
          @touch="$v.password.$touch()" @reset="$v.password.$reset()"></form-text-field>
        <div class="text-xs-right">
          <v-btn class="mr-0" :loading="requestInProgress"
            color="error" @click="submit">Submit</v-btn>
        </div>
      </v-form>
    </v-card-text>
  </v-card>
</template>

<script>
  import {mapActions} from 'vuex'
  import {purgeDataAndLoadIndex} from '../../utilities'

  export default {
    validations: {
      password: {
        valid () {
          return !this.invalidPasswords.includes(this.password)
        }
      }
    },
    data () {
      return {
        requestInProgress: false,
        password: '',
        invalidPasswords: []
      }
    },
    computed: {
      passwordErrors () {
        return {
          [this.$t('INVALID_PASSWORD')]: !this.$v.password.valid
        }
      }
    },
    methods: {
      ...mapActions({
        deleteAccount: 'deleteAccount'
      }),
      async submit () {
        if (!this.requestInProgress) {
          this.$v.$touch()
          if (!this.$v.$invalid) {
            try {
              this.requestInProgress = true
              let password = this.password
              let error = await this.deleteAccount({ password })
              if (error === 'NONE') {
                purgeDataAndLoadIndex()
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
