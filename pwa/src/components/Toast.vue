<template>
  <v-snackbar :value="isVisible" @input="setVisibility" auto-height :timeout="timeout">
    {{ message }}
    <v-btn color="warning" flat @click="hideToast">Close</v-btn>
  </v-snackbar>
</template>

<script lang="ts">
import Vue from 'vue'
import { mapMutations, mapState } from 'vuex'
import { InterfaceState } from '@/store/state'

export default Vue.extend({
  computed: {
    ...mapState<InterfaceState>('interface', {
      message: (state) => state.toast.message,
      timeout: (state) => state.toast.timeout,
      isVisible: (state) => state.toast.show
    })
  },
  methods: {
    setVisibility (value: boolean) {
      if (value === false) {
        this.hideToast()
      } else {
        throw new Error('Snackbar requested a show')
      }
    },
    ...mapMutations({
      hideToast: 'interface/hideToast'
    })
  }
})
</script>
