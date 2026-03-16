<style scoped>
  .password-input >>> .v-input__control {
    min-height: 0;
  }

  .v-window {
    overflow: visible;
  }
</style>

<template>
  <v-card>
    <v-card-title>Export</v-card-title>
    <v-card-text>
      <v-alert type="warning" text>
        The exported <external-link href="https://en.wikipedia.org/wiki/Comma-separated_values">CSV</external-link>
        will contain all your passwords in plain text, unencrypted. Do not store the backup on
        untrusted devices. Remember that even deleted files
        <external-link href="https://en.wikipedia.org/wiki/Data_recovery">may be recovered</external-link>.
      </v-alert>
      <v-window :value="step">
        <v-window-item>
          <div class="text-center">
            <div class="d-inline-block">
              <v-checkbox class="mt-0" color="error" v-model="ack" hide-details
                label="I acknowledge the risks"></v-checkbox>
            </div>
          </div>
        </v-window-item>
        <v-window-item>
          <v-form @keydown.native.enter.prevent="download">
            <v-row no-gutters>
              <v-col>
                <form-text-field class="password-input" type="password" solo :hide-details="true"
                  label="Password" v-model="password" :disabled="!ack" :height="formHeight"></form-text-field>
              </v-col>
              <v-col class="flex-grow-0 ml-4">
                <v-btn color="error" :disabled="!ack" :height="formHeight"
                  @click="download" :loading="inProgress">
                  Download
                </v-btn>
              </v-col>
            </v-row>
          </v-form>
        </v-window-item>
      </v-window>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import FileSaver from 'file-saver'
import { filter, takeUntil } from 'rxjs/operators'
import { isActionOf } from 'typesafe-actions'
import Vue from 'vue'
import { isSignalFailure, isSignalSuccess, isSignalFinale } from '@/redux/flow_signal'
import { showToast } from '@/redux/modules/ui/toast/actions'
import { export_, exportSignal, ExportError } from '@/redux/modules/user/keys/actions'
import { serializeVault } from './csv'

export default Vue.extend({
  data () {
    return {
      ack: false,
      password: '',
      inProgress: false
    }
  },
  created () {
    this.$data.$actions.pipe(
      filter(isActionOf(exportSignal)),
      takeUntil(this.$data.$destruction)
    ).subscribe((action: ReturnType<typeof exportSignal>) => {
      if (isSignalFinale(action.payload)) {
        this.inProgress = false
      }
      if (isSignalFailure(action.payload)) {
        this.dispatch(showToast({
          message: this.messageByError(action.payload.error.value)
        }))
        return
      }
      if (isSignalSuccess(action.payload)) {
        const blob = new Blob(
          [serializeVault(action.payload.data)],
          { type: 'text/csv' }
        )
        FileSaver.saveAs(blob, `vault_${new Date().toISOString()}.csv`)
        this.password = ''
        this.ack = false
      }
    })
  },
  computed: {
    step () {
      let step = 0
      if (this.ack) {
        step += 1
      }
      return step
    },
    formHeight () {
      return 42
    }
  },
  methods: {
    download () {
      this.inProgress = true
      this.dispatch(export_({ password: this.password }))
    },
    messageByError (error: ExportError): string {
      switch (error) {
        case ExportError.INVALID_PASSWORD:
          return this.$t('INVALID_PASSWORD') as string
        default:
          return 'Unable to export'
      }
    }
  }
})
</script>
