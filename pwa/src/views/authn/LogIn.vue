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
                    :username-matches-depot="usernameMatchesDepot" @forget="forget"
                    @submit="submitCredentials" @trigger-biometrics="triggerBiometrics"
                    :authn-via-api="authnViaApi" :authn-via-depot="authnViaDepot"
                    :biometrics-available="webAuthnCredentialId !== null">
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
  authnOtpProvisionReset,
  AuthnInputKind
} from '@/redux/modules/authn/actions'
import {
  authnViaApi,
  AuthnViaApi,
  authnViaDepot,
  AuthnViaDepot,
  authnOtpProvision,
  AuthnOtpProvision
} from '@/redux/modules/authn/selectors'
import { clearDepot, webAuthnInterruption, webAuthnResult, webAuthnRequest } from '@/redux/modules/depot/actions'
import { depotUsername, webAuthnData } from '@/redux/modules/depot/selectors'
import { sessionUsername } from '@/redux/modules/session/selectors'
import { showToast } from '@/redux/modules/ui/toast/actions'
import { data } from '@/redux/remote_data'
import { RootAction } from '@/redux/root_action'
import Credentials from '@/views/authn/Credentials.vue'
import Otp from '@/views/authn/Otp.vue'

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
      otp: ''
    }
  },
  created () {
    const usernameFromDepot = depotUsername(this.$data.$state)
    this.username = sessionUsername(this.$data.$state) || usernameFromDepot || ''
    this.actions().pipe(
      filter(isActionOf(remoteAuthnComplete)),
      takeUntil(this.$data.$destruction)
    ).subscribe(() => {
      this.$router.push('/dashboard')
    })
    this.actions().pipe(
      filter(isActionSuccess(authnViaDepotSignal)),
      takeUntil(this.$data.$destruction)
    ).subscribe((action) => {
      this.dispatch(initiateBackgroundAuthn({
        username: action.payload.data.username,
        authnInput: action.payload.data.authnInput
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
        message: 'Changed the password remotely? Click \'Forget\' to re-enter.'
      }))
    })
    this.actions().pipe(
      filter(isActionOf(webAuthnResult)),
      takeUntil(this.$data.$destruction)
    ).subscribe(() => {
      if (!this.usernameMatchesDepot) {
        console.log('`username` does not match `depotUsername`')
        return
      }
      if (this.webAuthnCredentialId === null) {
        console.log('`webAuthnCredentialId` is not available')
        return
      }
      this.dispatch(logInViaDepot({
        username: this.username,
        authnInput: {
          kind: AuthnInputKind.WEB_AUTHN,
          credentialId: this.webAuthnCredentialId
        }
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
    },
    webAuthnCredentialId (): string | null {
      return fn.pipe(
        webAuthnData(this.$data.$state),
        data,
        option.map((data) => data === null ? null : data.credentialId),
        option.getOrElse(() => null)
      )
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
    forget () {
      this.dispatch(webAuthnInterruption())
      this.dispatch(clearDepot())
      this.dispatch(showToast({ message: 'All data has been wiped out' }))
    },
    triggerBiometrics () {
      this.dispatch(webAuthnRequest({ credentialId: this.webAuthnCredentialId }))
    },
    submitCredentials () {
      if (!this.usernameMatchesDepot) {
        this.dispatch(logInViaApi({
          username: this.username,
          password: this.password
        }))
        return
      }
      this.dispatch(logInViaDepot({
        username: this.username,
        authnInput: {
          kind: AuthnInputKind.PASSWORD,
          password: this.password
        }
      }))
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
            credentialParams: {
              username: apiData.username,
              authnInput: apiData.authnInput,
              parametrization: apiData.parametrization,
              authDigest: apiData.authDigest,
              encryptionKey: apiData.encryptionKey
            },
            authnKey: otpContext.authnKey,
            otp: this.otp,
            yieldTrustedToken: true
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
    this.dispatch(webAuthnInterruption())
    this.dispatch(authnViaApiReset())
    this.dispatch(authnViaDepotReset())
    this.dispatch(authnOtpProvisionReset())
  }
})
</script>
