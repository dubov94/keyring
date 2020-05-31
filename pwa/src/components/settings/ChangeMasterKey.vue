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
            color="primary" @click="submit" :disabled="!isOnline">Submit</v-btn>
        </div>
      </v-form>
    </v-card-text>
  </v-card>
</template>

<script>
  import {mapActions, mapGetters} from 'vuex'
  import {required, sameAs} from 'vuelidate/lib/validators'
  import {getShortHash} from '../../utilities'

  export default {
    validations: {
      current: {
        async valid () {
          return !this.invalidShortHashes.includes(
            await getShortHash(this.current))
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
        invalidShortHashes: []
      }
    },
    computed: {
      ...mapGetters({
        isOnline: 'isOnline'
      }),
      currentErrors () {
        return {
          [this.$t('INVALID_CURRENT_PASSWORD')]: !this.$v.current.valid
        }
      },
      renewalErrors () {
        return {
          [this.$t('PASSWORD_CANNOT_BE_EMPTY')]: !this.$v.renewal.required
        }
      },
      repeatErrors () {
        return {
          [this.$t('PASSWORDS_DO_NOT_MATCH')]: !this.$v.repeat.sameAs
        }
      }
    },
    methods: {
      ...mapActions({
        changeMasterKey: 'changeMasterKey',
        displaySnackbar: 'interface/displaySnackbar'
      }),
      async submit () {
        if (this.isOnline && !this.requestInProgress) {
          this.$v.$touch()
          if (!this.$v.$invalid) {
            try {
              this.requestInProgress = true
              let current = this.current
              let error = await this.changeMasterKey({
                current,
                renewal: this.renewal
              })
              if (!error) {
                document.activeElement.blur()
                this.$v.$reset()
                this.current = ''
                this.renewal = ''
                this.repeat = ''
                this.invalidShortHashes = []
                this.displaySnackbar({
                  message: this.$t('SUCCESS'),
                  timeout: 1500
                })
              } else if (error === 'INVALID_CURRENT_DIGEST') {
                this.invalidShortHashes.push(await getShortHash(current))
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
