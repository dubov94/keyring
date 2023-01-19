<template>
  <v-card>
    <v-card-title>Import</v-card-title>
    <v-card-text>
      <p>
        The uploaded vault must be a
        <external-link href="https://en.wikipedia.org/wiki/Comma-separated_values">CSV</external-link>
        file with <b>url</b>, <b>username</b> and <b>password</b> columns &mdash; these are usually
        exported by default by other providers. Values of all other columns will be automatically
        appended as labels in the given order.
      </p>
      <v-file-input accept="text/csv" label=".csv" outlined @change="changeFile"></v-file-input>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import Vue from 'vue'

export default Vue.extend({
  methods: {
    changeFile (file: null | File) {
      if (file === null) {
        return
      }
      const reader = new FileReader()
      reader.addEventListener('load', (event) => {
        console.log(event.target!.result)
      })
      reader.readAsText(file)
    }
  }
})
</script>
