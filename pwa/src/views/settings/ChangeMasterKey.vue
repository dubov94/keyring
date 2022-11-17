<template>
  <v-expansion-panel>
    <v-expansion-panel-header>
      <div>
        <div class="text-body-1">
          Change password
        </div>
        <div class="mt-1 text-body-2 text--secondary font-italic">
          Additionally terminates all other active sessions
        </div>
      </div>
    </v-expansion-panel-header>
    <v-expansion-panel-content>
      <v-form @keydown.native.enter.prevent="submit">
        <form-text-field type="password" label="Current password" prepend-icon="lock"
          :value="current" @input="setCurrent"
          :dirty="$v.current.$dirty" :errors="currentErrors"
          @touch="$v.current.$touch()" @reset="$v.current.$reset()"></form-text-field>
        <form-text-field type="password" label="New password" prepend-icon="lock_open"
          :value="renewal" @input="setRenewal"
          :dirty="$v.renewal.$dirty" :errors="renewalErrors"
          @touch="$v.renewal.$touch()" @reset="$v.renewal.$reset()"></form-text-field>
        <form-text-field type="password" label="Repeat new password" prepend-icon="repeat"
          :value="repeat" @input="setRepeat"
          :dirty="$v.repeat.$dirty" :errors="repeatErrors"
          @touch="$v.repeat.$touch()" @reset="$v.repeat.$reset()"></form-text-field>
        <div class="mx-4 mt-4">
          <v-btn block color="primary" :loading="hasIndicatorMessage"
            @click="submit" :disabled="!canAccessApi">
            <span>Submit</span>
            <template #loader>
              <v-progress-circular indeterminate :size="23" :width="2">
              </v-progress-circular>
              <span class="ml-4">{{ indicatorMessage }}</span>
            </template>
          </v-btn>
        </div>
      </v-form>
    </v-expansion-panel-content>
  </v-expansion-panel>
</template>

<script lang="ts">
import Vue, { VueConstructor } from 'vue'
import { required, sameAs } from 'vuelidate/lib/validators'
import { ServiceChangeMasterKeyResponseError } from '@/api/definitions'
import { function as fn, option, map, eq } from 'fp-ts'
import { canAccessApi, masterKeyChange, MasterKeyChange } from '@/redux/modules/user/account/selectors'
import { MasterKeyChangeFlowIndicator, changeMasterKey, masterKeyChangeReset, masterKeyChangeSignal } from '@/redux/modules/user/account/actions'
import { filter, takeUntil } from 'rxjs/operators'
import { isActionSuccess } from '@/redux/flow_signal'
import { DeepReadonly } from 'ts-essentials'
import { showToast } from '@/redux/modules/ui/toast/actions'
import { remoteDataErrorIndicator } from '@/components/form_validators'

const currentIncorrectIndicator = remoteDataErrorIndicator(ServiceChangeMasterKeyResponseError.INVALIDCURRENTDIGEST)

const INDICATOR_TO_MESSAGE = new Map<MasterKeyChangeFlowIndicator, string>([
  [MasterKeyChangeFlowIndicator.REENCRYPTING, 'Re-encrypting'],
  [MasterKeyChangeFlowIndicator.MAKING_REQUEST, 'Making request']
])

interface Mixins {
  untouchedSinceDispatch: boolean;
  masterKeyChange: DeepReadonly<MasterKeyChange>;
}

export default (Vue as VueConstructor<Vue & Mixins>).extend({
  data () {
    return {
      current: '',
      renewal: '',
      repeat: '',
      untouchedSinceDispatch: false
    }
  },
  validations: {
    current: {
      correct () {
        return !currentIncorrectIndicator(this.masterKeyChange, this.untouchedSinceDispatch)
      }
    },
    renewal: { required },
    repeat: { sameAs: sameAs('renewal') }
  },
  created () {
    this.$data.$actions.pipe(
      filter(isActionSuccess(masterKeyChangeSignal)),
      takeUntil(this.$data.$destruction)
    ).subscribe(() => {
      this.current = ''
      this.renewal = ''
      this.repeat = ''
      this.untouchedSinceDispatch = false
      this.$v.$reset()
      this.dispatch(masterKeyChangeReset())
      this.dispatch(showToast({ message: this.$t('DONE') as string }))
      if (document.activeElement !== null) {
        ;(document.activeElement as HTMLInputElement).blur()
      }
    })
  },
  computed: {
    canAccessApi (): boolean {
      return canAccessApi(this.$data.$state)
    },
    masterKeyChange (): DeepReadonly<MasterKeyChange> {
      return masterKeyChange(this.$data.$state)
    },
    currentErrors (): { [key: string]: boolean } {
      return {
        [this.$t('INVALID_CURRENT_PASSWORD') as string]: !this.$v.current.correct
      }
    },
    renewalErrors (): { [key: string]: boolean } {
      return {
        [this.$t('PASSWORD_CANNOT_BE_EMPTY') as string]: !this.$v.renewal.required
      }
    },
    repeatErrors (): { [key: string]: boolean } {
      return {
        [this.$t('PASSWORDS_DO_NOT_MATCH') as string]: !this.$v.repeat.sameAs
      }
    },
    indicatorMessage (): string | null {
      return fn.pipe(
        this.masterKeyChange.indicator,
        option.chain((indicator) => map.lookup(eq.eqStrict)(indicator, INDICATOR_TO_MESSAGE)),
        option.getOrElse<string | null>(() => null)
      )
    },
    hasIndicatorMessage (): boolean {
      return this.indicatorMessage !== null
    }
  },
  methods: {
    setCurrent (value: string) {
      this.current = value
      this.untouchedSinceDispatch = false
    },
    setRenewal (value: string) {
      this.renewal = value
      this.untouchedSinceDispatch = false
    },
    setRepeat (value: string) {
      this.repeat = value
      this.untouchedSinceDispatch = false
    },
    submit () {
      if (this.canAccessApi && !this.hasIndicatorMessage) {
        this.$v.$touch()
        if (!this.$v.$invalid) {
          this.untouchedSinceDispatch = true
          this.dispatch(changeMasterKey({
            current: this.current,
            renewal: this.renewal
          }))
        }
      }
    }
  },
  beforeDestroy () {
    this.dispatch(masterKeyChangeReset())
  }
})
</script>
