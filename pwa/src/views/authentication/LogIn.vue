<template>
  <page>
    <v-content>
      <v-container fluid>
        <v-layout justify-center mt-5>
          <v-flex xs12 sm6 md4 lg3 xl2>
            <v-card>
              <v-toolbar color="primary" dark>
                <v-toolbar-title>Key Ring</v-toolbar-title>
              </v-toolbar>
              <v-card-text>
                <v-form @keydown.native.enter.prevent="submit">
                  <form-text-field type="text" label="Username" prepend-icon="person"
                    v-model="username" :dirty="$v.credentialsGroup.$dirty" :errors="usernameErrors"
                    @touch="$v.credentialsGroup.$touch()" @reset="$v.credentialsGroup.$reset()"
                    :autofocus="!hasUsername"></form-text-field>
                  <form-text-field type="password" label="Password" prepend-icon="lock"
                    v-model="password" :dirty="$v.credentialsGroup.$dirty" :errors="passwordErrors"
                    @touch="$v.credentialsGroup.$touch()" @reset="$v.credentialsGroup.$reset()"
                    :autofocus="hasUsername"></form-text-field>
                  <v-switch hide-details color="primary" label="Remember me"
                    v-model="persist"></v-switch>
                </v-form>
              </v-card-text>
              <v-card-actions>
                <v-btn block color="primary" class="mx-4"
                  @click="submit" :loading="requestInProgress">Log in</v-btn>
              </v-card-actions>
              <v-layout justify-center py-2>
                <router-link to="/register">Register</router-link>
              </v-layout>
            </v-card>
          </v-flex>
        </v-layout>
      </v-container>
    </v-content>
  </page>
</template>

<script>
import { mapActions, mapGetters } from 'vuex'
import { required } from 'vuelidate/lib/validators'
import Page from '@/components/Page'
import { getShortHash } from '@/utilities'

export default {
  components: {
    page: Page
  },
  data () {
    const hasLocalData = this.$store.getters['depot/hasLocalData']
    let username = ''
    if (this.$store.getters['session/hasUsername']) {
      username = this.$store.state.session.username
    } else if (hasLocalData) {
      username = this.$store.state.depot.username
    }
    return {
      username,
      password: '',
      requestInProgress: false,
      invalidPairs: [],
      persist: hasLocalData
    }
  },
  validations: {
    username: {
      required
    },
    password: {},
    forCredentials: {
      async valid () {
        for (const { username, shortHash } of this.invalidPairs) {
          if (this.username === username &&
              await getShortHash(this.password) === shortHash) {
            return false
          }
        }
        return true
      }
    },
    credentialsGroup: ['username', 'password']
  },
  computed: {
    ...mapGetters({
      hasLocalData: 'depot/hasLocalData'
    }),
    hasUsername () {
      return this.username !== ''
    },
    usernameErrors () {
      return {
        [this.$t('USERNAME_IS_REQUIRED')]: !this.$v.username.required,
        [this.$t('INVALID_USERNAME_OR_PASSWORD')]: !this.$v.forCredentials.valid
      }
    },
    passwordErrors () {
      return {
        [this.$t('INVALID_USERNAME_OR_PASSWORD')]: !this.$v.forCredentials.valid
      }
    }
  },
  methods: {
    ...mapActions({
      logIn: 'logIn',
      purgeDepot: 'depot/purgeDepot',
      displaySnackbar: 'interface/displaySnackbar'
    }),
    async submit () {
      if (!this.requestInProgress) {
        this.$v.$touch()
        if (!this.$v.$invalid) {
          try {
            this.requestInProgress = true
            const [username, password] = [this.username, this.password]
            const { success, local, requiresMailVerification } = await this.logIn({
              username,
              password,
              persist: this.persist
            })
            if (success) {
              if (requiresMailVerification) {
                this.$router.replace('/mail-verification')
              } else {
                this.$router.replace('/dashboard')
              }
            } else {
              this.invalidPairs.push({
                username,
                shortHash: await getShortHash(password)
              })
              if (local) {
                this.displaySnackbar({
                  message: 'Changed the password recently? Toggle \'Remember me\' twice.',
                  timeout: 3000
                })
              }
            }
          } finally {
            this.requestInProgress = false
          }
        }
      }
    }
  },
  watch: {
    persist (value) {
      if (value) {
        this.displaySnackbar({
          message: 'Okay, we will store your encrypted data locally.',
          timeout: 3000
        })
      } else {
        if (this.hasLocalData) {
          this.purgeDepot()
          this.invalidPairs.splice(0)
          this.displaySnackbar({
            message: 'Alright, we wiped out all saved data from this device.',
            timeout: 3000
          })
        }
      }
    }
  }
}
</script>
