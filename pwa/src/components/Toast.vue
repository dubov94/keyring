<template>
  <v-snackbar :value="show" @input="setVisibility" :timeout="timeout">
    {{ message }}
    <template #action="{ attrs }">
      <v-btn color="warning" text v-bind="attrs" class="ml-4"
        @click="setVisibility(false)">
        Close
      </v-btn>
    </template>
  </v-snackbar>
</template>

<script lang="ts">
import Vue from 'vue'
import { hideToast } from '@/redux/modules/ui/toast/actions'

export default Vue.extend({
  computed: {
    show () {
      return this.$data.$state.ui.toast.show
    },
    timeout () {
      return this.$data.$state.ui.toast.timeout
    },
    message () {
      return this.$data.$state.ui.toast.message
    }
  },
  methods: {
    setVisibility (value: boolean) {
      if (value === false) {
        this.dispatch(hideToast())
      } else {
        throw new Error('<v-snackbar> triggered `input(true)`')
      }
    }
  }
})
</script>
