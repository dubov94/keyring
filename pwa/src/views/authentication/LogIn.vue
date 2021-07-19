<template>
  <page>
    <v-main>
      <v-container fluid>
        <v-row no-gutters class="mt-12" justify="center">
          <v-col :cols="12" :sm="6" :md="4" :lg="3" :xl="2">
            <v-card class="pb-2">
              <v-window :value="step">
                <v-window-item>
                  <credentials :username="username" @username="setUsername"
                    :password="password" @password="setPassword"
                    :persist="persist" @persist="setPersist"
                    @submit="submitCredentials" :authn-via-api="authnViaApi"
                    :authn-via-depot="authnViaDepot" :username-matches-depot="usernameMatchesDepot">
                  </credentials>
                  <div class="text-center">
                    <router-link to="/register">Register</router-link>
                  </div>
                </v-window-item>
                <v-window-item>
                  <otp :otp="otp" @otp="setOtp" @submit="submitOtp"
                    :authn-otp-provision="authnOtpProvision"></otp>
                </v-window-item>
              </v-window>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </page>
</template>

<script lang="ts">
import { function as fn, option } from 'fp-ts'
import { DeepReadonly } from 'ts-essentials'
import { isActionOf } from 'typesafe-actions'
import Vue from 'vue'
import { Observable } from 'rxjs'
import { takeUntil, filter } from 'rxjs/operators'
import Page from '@/components/Page.vue'
import { isFailureOf, isActionSuccess, isSignalFailure } from '@/redux/flow_signal'
import {
  logInViaApi,
  authnViaApiReset,
  logInViaDepot,
  authnViaDepotReset,
  authnViaDepotSignal,
  initiateBackgroundAuthn,
  AuthnViaDepotFlowError,
  remoteAuthnComplete,
  AuthnViaApiFlowResult,
  OtpContext,
  provideOtp,
  authnOtpProvisionReset
} from '@/redux/modules/authn/actions'
import {
  authnViaApi,
  AuthnViaApi,
  authnViaDepot,
  AuthnViaDepot,
  authnOtpProvision,
  AuthnOtpProvision
} from '@/redux/modules/authn/selectors'
import { activateDepot, clearDepot } from '@/redux/modules/depot/actions'
import { depotUsername } from '@/redux/modules/depot/selectors'
import { sessionUsername } from '@/redux/modules/session/selectors'
import { showToast } from '@/redux/modules/ui/toast/actions'
import { data } from '@/redux/remote_data'
import { RootAction } from '@/redux/root_action'
import Credentials from '@/views/authentication/Credentials.vue'
import Otp from '@/views/authentication/Otp.vue'

export default Vue.extend({
  components: {
    credentials: Credentials,
    otp: Otp,
    page: Page
  },
  data () {
    return {
      username: '',
      password: '',
      persist: false,
      otp: ''
    }
  },
  created () {
    const usernameFromDepot = depotUsername(this.$data.$state)
    this.username = sessionUsername(this.$data.$state) || usernameFromDepot || ''
    this.persist = usernameFromDepot !== null
    this.actions().pipe(
      filter(isActionOf(remoteAuthnComplete)),
      takeUntil(this.$data.$destruction)
    ).subscribe((action) => {
      if (this.persist) {
        this.dispatch(activateDepot({
          username: action.payload.username,
          password: action.payload.password
        }))
      }
      this.$router.push('/dashboard')
    })
    this.actions().pipe(
      filter(isActionSuccess(authnViaDepotSignal)),
      takeUntil(this.$data.$destruction)
    ).subscribe((action) => {
      this.dispatch(initiateBackgroundAuthn({
        username: action.payload.data.username,
        password: action.payload.data.password
      }))
      this.$router.push('/dashboard')
    })
    this.actions().pipe(
      filter(isActionOf(authnViaDepotSignal)),
      filter((action) => {
        const signal = action.payload
        if (isSignalFailure(signal)) {
          const { error } = signal
          const predicate = isFailureOf([AuthnViaDepotFlowError.INVALID_CREDENTIALS])
          if (predicate(error)) {
            return true
          }
        }
        return false
      }),
      takeUntil(this.$data.$destruction)
    ).subscribe(() => {
      this.dispatch(showToast({
        message: 'Changed the password remotely? Toggle \'Remember me\' twice.'
      }))
    })
  },
  computed: {
    step () {
      let step = 0
      if (this.otpContext !== null) {
        step += 1
      }
      return step
    },
    depotUsername (): string | null {
      return depotUsername(this.$data.$state)
    },
    usernameMatchesDepot (): boolean {
      return this.username === this.depotUsername
    },
    authnViaApi (): DeepReadonly<AuthnViaApi> {
      return authnViaApi(this.$data.$state)
    },
    authnViaDepot (): DeepReadonly<AuthnViaDepot> {
      return authnViaDepot(this.$data.$state)
    },
    otpContext (): DeepReadonly<OtpContext> | null {
      return fn.pipe(
        data(this.authnViaApi),
        option.chain((result: DeepReadonly<AuthnViaApiFlowResult>) => option.getLeft(result.content)),
        option.getOrElse<DeepReadonly<OtpContext> | null>(() => null)
      )
    },
    authnOtpProvision (): DeepReadonly<AuthnOtpProvision> {
      return authnOtpProvision(this.$data.$state)
    }
  },
  methods: {
    actions (): Observable<RootAction> {
      return this.$data.$actions
    },
    setUsername (value: string) {
      this.username = value
    },
    setPassword (value: string) {
      this.password = value
    },
    setPersist (value: boolean) {
      if (value) {
        this.persist = true
        this.dispatch(showToast({ message: 'Okay, we will store your data encrypted on this device. Try it offline!' }))
      } else {
        this.dispatch(clearDepot())
        this.dispatch(showToast({ message: 'Alright, we wiped out all saved data on this device.' }))
        this.persist = false
      }
    },
    submitCredentials () {
      if (this.usernameMatchesDepot) {
        this.dispatch(logInViaDepot({
          username: this.username,
          password: this.password
        }))
      } else {
        this.dispatch(logInViaApi({
          username: this.username,
          password: this.password
        }))
      }
    },
    setOtp (value: string) {
      this.otp = value
    },
    submitOtp () {
      const action = fn.pipe(
        data(this.authnViaApi),
        option.chain((apiData: DeepReadonly<AuthnViaApiFlowResult>) => fn.pipe(
          option.getLeft(apiData.content),
          option.map((otpContext: DeepReadonly<OtpContext>) => provideOtp({
            encryptionKey: apiData.encryptionKey,
            authnKey: otpContext.authnKey,
            otp: this.otp,
            yieldTrustedToken: false
          }))
        )),
        option.getOrElse<ReturnType<typeof provideOtp> | ReturnType<typeof showToast>>(() => showToast({
          message: '`authnViaApi` does not contain `OtpContext`'
        }))
      )
      this.dispatch(action)
    }
  },
  beforeDestroy () {
    this.dispatch(authnViaApiReset())
    this.dispatch(authnViaDepotReset())
    this.dispatch(authnOtpProvisionReset())
  }
})
</script>
