<template>
  <v-card>
    <v-toolbar color="primary" dark>
      <v-toolbar-title>Resume</v-toolbar-title>
    </v-toolbar>
    <v-card-text>
      <v-form @keydown.native.enter.prevent="submit">
        <form-text-field type="password" label="Password" prepend-icon="lock"
          v-model="password" :dirty="$v.password.$dirty" :errors="passwordErrors"
          @touch="$v.password.$touch()" @reset="$v.password.$reset()"
          autofocus></form-text-field>
      </v-form>
    </v-card-text>
    <v-card-actions>
      <v-btn block color="primary" class="mx-4"
        :loading="requestInProgress" @click="submit">
        Continue
      </v-btn>
    </v-card-actions>
    <v-layout justify-center py-2>
      <a @click="cancel">Cancel</a>
    </v-layout>
  </v-card>
</template>

<script>
  import {mapActions, mapGetters} from 'vuex'
  import {purgeSessionStorageAndLoadLogIn} from '../../utilities'

  export default {
    data () {
      return {
        requestInProgress: false,
        password: '',
        invalidPasswords: []
      }
    },
    validations: {
      password: {
        valid () {
          return !this.invalidPasswords.includes(this.password)
        }
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
        logIn: 'logIn'
      }),
      ...mapGetters({
        hasLocalData: 'depot/hasLocalData'
      }),
      async submit () {
        if (!this.requestInProgress) {
          this.$v.$touch()
          if (!this.$v.$invalid) {
            try {
              this.requestInProgress = true
              let username = this.$store.state.session.username
              let password = this.password
              let { success } = await this.logIn({
                username,
                password,
                persist: this.hasLocalData
              })
              if (success) {
                this.$router.replace(this.$store.state.session.lastRoute)
              } else {
                this.invalidPasswords.push(password)
              }
            } finally {
              this.requestInProgress = false
            }
          }
        }
      },
      cancel () {
        purgeSessionStorageAndLoadLogIn()
      }
    }
  }
</script>
