<template>
  <v-snackbar :value="state.show" @input="setVisibility" auto-height :timeout="state.timeout">
    {{ state.message }}
    <v-btn color="warning" flat @click="setVisibility(false)">Close</v-btn>
  </v-snackbar>
</template>

<script lang="ts">
import Vue from 'vue'
import { toastState$, hideToast$ } from '@/store/root/modules/interface/toast'

export default Vue.extend({
  subscriptions () {
    return {
      state: toastState$
    }
  },
  methods: {
    setVisibility (value: boolean): void {
      if (value === false) {
        hideToast$.next()
      } else {
        throw new Error('<v-snackbar> triggered `input(true)`')
      }
    }
  }
})
</script>
