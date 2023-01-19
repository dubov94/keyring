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
      <div class="text-center">
        <div class="d-inline-block">
          <v-checkbox class="mt-0" color="error" v-model="ack" hide-details
            label="I acknowledge the risks"></v-checkbox>
        </div>
      </div>
      <div class="text-center mt-2">
        <v-btn color="error" :disabled="!ack">Download</v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import Vue from 'vue'

export default Vue.extend({
  data () {
    return {
      ack: false
    }
  }
})
</script>
